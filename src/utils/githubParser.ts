export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch: string;
  subfolder: string;
  isSingleOrg: boolean;
  isValid: boolean;
  rawInput: string;
}

export function parseGitHubInput(input: string): ParsedGitHubUrl {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      owner: '',
      repo: '',
      branch: '',
      subfolder: '',
      isSingleOrg: false,
      isValid: false,
      rawInput: trimmed,
    };
  }

  // 1. SSH format: git@github.com:owner/repo(.git)
  const sshMatch = trimmed.match(/^git@github\.com:([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2].replace(/\.git$/, ''),
      branch: 'main',
      subfolder: '',
      isSingleOrg: false,
      isValid: true,
      rawInput: trimmed,
    };
  }

  // Clean any leading http://, https://, www.
  let cleaned = trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '');

  // If starts with github.com/, remove it
  const isGithubDomain = cleaned.startsWith('github.com/');
  if (isGithubDomain) {
    cleaned = cleaned.substring('github.com/'.length);
  }

  // Remove trailing slashes and queries/hashes
  cleaned = cleaned.split('?')[0].split('#')[0].replace(/\/+$/, '');

  // Check if it's a single user or organization name (no slashes)
  if (!cleaned.includes('/')) {
    if (/^[a-zA-Z0-9_\-\.]+$/.test(cleaned)) {
      return {
        owner: cleaned,
        repo: `${cleaned}.github.io`,
        branch: 'main',
        subfolder: '',
        isSingleOrg: true,
        isValid: true,
        rawInput: trimmed,
      };
    }
  }

  // Split path segments
  const segments = cleaned.split('/').filter(Boolean);

  if (segments.length >= 2) {
    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/, '');

    let branch = 'main';
    let subfolder = '';

    // Check for /tree/{branch}/{subpath...} or /blob/{branch}/{subpath...}
    if (segments.length >= 4 && (segments[2] === 'tree' || segments[2] === 'blob')) {
      branch = segments[3];
      if (segments.length > 4) {
        subfolder = segments.slice(4).join('/');
      }
    }

    return {
      owner,
      repo,
      branch,
      subfolder,
      isSingleOrg: false,
      isValid: Boolean(owner && repo),
      rawInput: trimmed,
    };
  }

  return {
    owner: '',
    repo: '',
    branch: '',
    subfolder: '',
    isSingleOrg: false,
    isValid: false,
    rawInput: trimmed,
  };
}

export type ProtocolType = 'https' | 'ssh' | 'cli';
export type PackageManagerType = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface CommandOptions {
  protocol: ProtocolType;
  shallow: boolean;
  packageManager: PackageManagerType;
  includeBranch: boolean;
}

export function generateCloneUrl(parsed: ParsedGitHubUrl, protocol: ProtocolType): string {
  const { owner, repo } = parsed;
  if (protocol === 'ssh') {
    return `git@github.com:${owner}/${repo}.git`;
  }
  if (protocol === 'cli') {
    return `${owner}/${repo}`;
  }
  return `https://github.com/${owner}/${repo}.git`;
}

export function generateCommandChains(parsed: ParsedGitHubUrl, options: CommandOptions) {
  const { owner, repo, branch, subfolder, isSingleOrg } = parsed;
  const { protocol, shallow, packageManager, includeBranch } = options;

  const cloneTarget = generateCloneUrl(parsed, protocol);
  const targetDir = repo;

  // Build git clone flags
  const flags: string[] = [];
  if (shallow) {
    flags.push('--depth 1');
  }
  if (includeBranch && branch) {
    flags.push(`-b ${branch}`);
  }
  const flagStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';

  // Base clone command
  let cloneCmd = '';
  if (protocol === 'cli') {
    const cliFlags: string[] = [];
    if (shallow) cliFlags.push('-- --depth 1');
    const cliFlagStr = cliFlags.length > 0 ? ` ${cliFlags.join(' ')}` : '';
    cloneCmd = `gh repo clone ${cloneTarget}${cliFlagStr}`;
  } else {
    cloneCmd = `git clone${flagStr} ${cloneTarget}`;
  }

  // 1. Clone & Enter
  const cloneAndEnter = `${cloneCmd} && cd ${targetDir}`;

  // 2. Clone & Open in VS Code
  const cloneAndVsCode = `${cloneCmd} && cd ${targetDir} && code .`;

  // 3. Clone, Install & Dev Server
  const devScripts: Record<PackageManagerType, string> = {
    npm: 'npm i && npm run dev',
    pnpm: 'pnpm i && pnpm dev',
    yarn: 'yarn && yarn dev',
    bun: 'bun i && bun dev',
  };
  const devCmd = devScripts[packageManager] || devScripts.npm;
  const cloneInstallDev = `${cloneCmd} && cd ${targetDir} && ${devCmd}`;

  // 4. GitHub Pages Quick-Clone
  const ghPagesRepo = isSingleOrg ? repo : `${owner}.github.io`;
  const ghPagesUrl = protocol === 'ssh'
    ? `git@github.com:${owner}/${ghPagesRepo}.git`
    : protocol === 'cli'
    ? `${owner}/${ghPagesRepo}`
    : `https://github.com/${owner}/${ghPagesRepo}.git`;

  let ghPagesCloneCmd = '';
  if (protocol === 'cli') {
    ghPagesCloneCmd = `gh repo clone ${ghPagesUrl}`;
  } else {
    ghPagesCloneCmd = `git clone${flagStr} ${ghPagesUrl}`;
  }
  const ghPagesCommand = `${ghPagesCloneCmd} && cd ${ghPagesRepo}`;

  // 5. Sparse-Checkout (Native Git for Subfolder)
  let sparseCheckoutCommand = '';
  if (subfolder) {
    const sparseFlags = shallow ? ' --depth 1 --filter=blob:none' : ' --filter=blob:none';
    const sparseBranch = (includeBranch && branch) ? ` -b ${branch}` : '';
    const sparseCloneUrl = protocol === 'ssh'
      ? `git@github.com:${owner}/${repo}.git`
      : `https://github.com/${owner}/${repo}.git`;
    
    sparseCheckoutCommand = `git clone${sparseFlags}${sparseBranch} --sparse ${sparseCloneUrl} && cd ${targetDir} && git sparse-checkout set ${subfolder}`;
  }

  return {
    cloneAndEnter,
    cloneAndVsCode,
    cloneInstallDev,
    ghPagesCommand,
    sparseCheckoutCommand,
    targetDir,
  };
}
