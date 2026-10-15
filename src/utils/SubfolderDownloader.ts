import JSZip from 'jszip';

export interface DownloadProgress {
  stage: 'scanning' | 'downloading' | 'zipping' | 'completed' | 'error';
  message: string;
  current?: number;
  total?: number;
  percent?: number;
  error?: string;
}

export interface SubfolderDownloadParams {
  owner: string;
  repo: string;
  branch: string;
  subfolder: string;
  token?: string;
  onProgress?: (progress: DownloadProgress) => void;
}

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export async function downloadGitHubSubfolder({
  owner,
  repo,
  branch,
  subfolder,
  token,
  onProgress,
}: SubfolderDownloadParams): Promise<Blob> {
  const cleanSubfolder = subfolder.replace(/^\/+|\/+$/g, '');
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token && token.trim()) {
    headers['Authorization'] = `token ${token.trim()}`;
  }

  // 1. Scanning Tree
  onProgress?.({
    stage: 'scanning',
    message: 'Scanning repository tree...',
    percent: 10,
  });

  let fileList: { path: string; size?: number; sha: string }[] = [];

  // Try GitHub Git Trees API first (recursive)
  try {
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
    const res = await fetch(treeUrl, { headers });

    if (res.status === 403) {
      const errorData = await res.json().catch(() => ({}));
      const isRateLimit = errorData.message?.includes('API rate limit');
      throw new Error(isRateLimit ? 'RATE_LIMIT' : errorData.message || 'Access Forbidden');
    }

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tree)) {
        const prefix = cleanSubfolder ? `${cleanSubfolder}/` : '';
        fileList = data.tree
          .filter((item: GitHubTreeItem) => item.type === 'blob' && (cleanSubfolder === '' || item.path.startsWith(prefix)))
          .map((item: GitHubTreeItem) => ({
            path: item.path,
            size: item.size,
            sha: item.sha,
          }));
      }
    } else {
      throw new Error(`Tree fetch failed with HTTP ${res.status}`);
    }
  } catch (err: any) {
    if (err.message === 'RATE_LIMIT') {
      onProgress?.({
        stage: 'error',
        message: 'GitHub API rate limit exceeded. Please provide an optional GitHub Token.',
        error: 'RATE_LIMIT',
      });
      throw err;
    }

    // Fallback: Use contents API recursively
    try {
      fileList = await fetchFilesViaContentsApi(owner, repo, cleanSubfolder, branch, headers);
    } catch (fallbackErr: any) {
      const msg = fallbackErr.message === 'RATE_LIMIT'
        ? 'GitHub API rate limit exceeded. Please provide an optional GitHub Token.'
        : fallbackErr.message || 'Failed to scan repository folder';
      onProgress?.({
        stage: 'error',
        message: msg,
        error: fallbackErr.message,
      });
      throw fallbackErr;
    }
  }

  if (fileList.length === 0) {
    const errorMsg = `No files found in folder '${cleanSubfolder}' on branch '${branch}'.`;
    onProgress?.({
      stage: 'error',
      message: errorMsg,
      error: 'NO_FILES',
    });
    throw new Error(errorMsg);
  }

  // 2. Fetch File Contents Concurrently
  const zip = new JSZip();
  const total = fileList.length;
  let downloadedCount = 0;

  onProgress?.({
    stage: 'downloading',
    message: `Downloading files (0/${total})...`,
    current: 0,
    total,
    percent: 20,
  });

  // Concurrency limit pool (5 concurrent requests)
  const CONCURRENCY_LIMIT = 5;
  const queue = [...fileList];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const relativePath = cleanSubfolder
        ? item.path.substring(cleanSubfolder.length).replace(/^\/+/, '')
        : item.path;

      try {
        // First try raw.githubusercontent.com (does not hit GitHub API rate limit)
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${encodeURI(item.path)}`;
        const rawRes = await fetch(rawUrl);

        let data: ArrayBuffer;
        if (rawRes.ok) {
          data = await rawRes.arrayBuffer();
        } else {
          // Fallback to GitHub API blob endpoint
          const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${item.sha}`;
          const blobRes = await fetch(blobUrl, { headers });
          if (!blobRes.ok) {
            throw new Error(`Failed to fetch file: ${item.path}`);
          }
          const blobJson = await blobRes.json();
          // base64 decoded
          const binaryStr = atob(blobJson.content.replace(/\s+/g, ''));
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          data = bytes.buffer;
        }

        zip.file(relativePath, data);
        downloadedCount++;

        const percent = Math.round(20 + (downloadedCount / total) * 60);
        onProgress?.({
          stage: 'downloading',
          message: `Downloading files (${downloadedCount}/${total})...`,
          current: downloadedCount,
          total,
          percent,
        });
      } catch (fileErr) {
        console.error(`Error downloading file: ${item.path}`, fileErr);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, total) }, () => worker());
  await Promise.all(workers);

  // 3. Compress ZIP
  onProgress?.({
    stage: 'zipping',
    message: 'Compressing files into ZIP archive...',
    percent: 85,
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      const currentPercent = Math.min(99, Math.round(85 + (metadata.percent * 0.14)));
      onProgress?.({
        stage: 'zipping',
        message: `Compressing into ZIP (${Math.round(metadata.percent)}%)...`,
        percent: currentPercent,
      });
    }
  );

  onProgress?.({
    stage: 'completed',
    message: 'Download complete!',
    percent: 100,
  });

  return zipBlob;
}

// Fallback Contents API crawler
async function fetchFilesViaContentsApi(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  headers: HeadersInit
): Promise<{ path: string; size?: number; sha: string }[]> {
  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`;
  const res = await fetch(contentsUrl, { headers });

  if (res.status === 403) {
    throw new Error('RATE_LIMIT');
  }

  if (!res.ok) {
    throw new Error(`Contents API failed with HTTP ${res.status}`);
  }

  const data = await res.json();
  const items = Array.isArray(data) ? data : [data];
  const results: { path: string; size?: number; sha: string }[] = [];

  for (const item of items) {
    if (item.type === 'file') {
      results.push({
        path: item.path,
        size: item.size,
        sha: item.sha,
      });
    } else if (item.type === 'dir') {
      const subItems = await fetchFilesViaContentsApi(owner, repo, item.path, ref, headers);
      results.push(...subItems);
    }
  }

  return results;
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
