import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  parseGitHubInput,
  generateCommandChains,
  type ProtocolType,
  type PackageManagerType,
  type CommandOptions,
  type ParsedGitHubUrl,
} from '../utils/githubParser';
import {
  downloadGitHubSubfolder,
  triggerBlobDownload,
  type DownloadProgress,
} from '../utils/SubfolderDownloader';
import type enTranslations from '../i18n/locales/en.json';

interface CloneGeneratorProps {
  dict: typeof enTranslations;
  lang: string;
}

interface HistoryItem {
  input: string;
  owner: string;
  repo: string;
  subfolder?: string;
  timestamp: number;
}

const STORAGE_KEY_HISTORY = 'clonelink_recent_repos';
const STORAGE_KEY_TOKEN = 'clonelink_gh_token';

export default function CloneGenerator({ dict, lang }: CloneGeneratorProps) {
  // Input state
  const [inputValue, setInputValue] = useState('facebook/react');
  const [protocol, setProtocol] = useState<ProtocolType>('https');
  const [shallow, setShallow] = useState(false);
  const [packageManager, setPackageManager] = useState<PackageManagerType>('npm');
  const [includeBranch, setIncludeBranch] = useState(false);

  // Copy state per card
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Subfolder download state
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [isTokenOpen, setIsTokenOpen] = useState(false);
  const [tokenSavedToast, setTokenSavedToast] = useState(false);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load history & token on client mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
      const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (storedToken) {
        setGithubToken(storedToken);
      }
    } catch (e) {
      console.warn('Failed to read localStorage:', e);
    }
  }, []);

  // Parse input in real-time
  const parsed: ParsedGitHubUrl = useMemo(() => {
    return parseGitHubInput(inputValue);
  }, [inputValue]);

  // Update history when valid repo parsed
  useEffect(() => {
    if (!parsed.isValid || !parsed.owner || !parsed.repo) return;

    const timer = setTimeout(() => {
      setHistory((prev) => {
        const filtered = prev.filter(
          (item) => !(item.owner.toLowerCase() === parsed.owner.toLowerCase() && item.repo.toLowerCase() === parsed.repo.toLowerCase())
        );
        const newItem: HistoryItem = {
          input: inputValue,
          owner: parsed.owner,
          repo: parsed.repo,
          subfolder: parsed.subfolder,
          timestamp: Date.now(),
        };
        const updated = [newItem, ...filtered].slice(0, 8);
        try {
          localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [parsed.owner, parsed.repo, parsed.subfolder, parsed.isValid]);

  // Generate terminal command chains
  const commandChains = useMemo(() => {
    if (!parsed.isValid) return null;
    const options: CommandOptions = {
      protocol,
      shallow,
      packageManager,
      includeBranch,
    };
    return generateCommandChains(parsed, options);
  }, [parsed, protocol, shallow, packageManager, includeBranch]);

  // Copy handler with feedback
  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Clipboard paste helper
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputValue(text.trim());
        inputRef.current?.focus();
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  // Token save handler
  const handleSaveToken = () => {
    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, githubToken.trim());
      setTokenSavedToast(true);
      setTimeout(() => setTokenSavedToast(false), 2500);
    } catch (e) {}
  };

  // Clear history
  const handleClearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      setHistory([]);
    } catch (e) {}
  };

  // Subfolder download action
  const handleDownloadSubfolder = async () => {
    if (!parsed.isValid || !parsed.subfolder) return;

    setIsDownloading(true);
    setDownloadProgress({
      stage: 'scanning',
      message: dict.downloader.fetchingTree,
      percent: 10,
    });

    try {
      const blob = await downloadGitHubSubfolder({
        owner: parsed.owner,
        repo: parsed.repo,
        branch: parsed.branch || 'main',
        subfolder: parsed.subfolder,
        token: githubToken,
        onProgress: (prog) => {
          setDownloadProgress(prog);
        },
      });

      const folderName = parsed.subfolder.split('/').filter(Boolean).pop() || parsed.repo;
      triggerBlobDownload(blob, `${folderName}.zip`);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err: any) {
      console.error('Download error:', err);
      if (err.message === 'RATE_LIMIT') {
        setIsTokenOpen(true);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Sample pill click
  const setSample = (sample: string) => {
    setInputValue(sample);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full space-y-8">
      {/* Smart Input Card */}
      <div className="rounded-2xl bg-white dark:bg-clonelink-darkSurface border border-clonelink-lightBorder dark:border-clonelink-darkBorder shadow-clean-md p-5 sm:p-7 transition-all">
        <label htmlFor="repo-input" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {dict.input.label}
        </label>

        {/* Input Bar with Paste & Clear buttons */}
        <div className="relative flex items-center">
          <div className="absolute left-4 text-gray-400 dark:text-gray-500 pointer-events-none flex items-center">
            {/* Git Branch / Link Icon */}
            <svg className="w-5 h-5 text-clonelink-indigo dark:text-clonelink-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>

          <input
            ref={inputRef}
            id="repo-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={dict.input.placeholder}
            autoFocus
            className="w-full pl-12 pr-28 sm:pr-32 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-mono bg-gray-50 dark:bg-clonelink-darkBg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-clonelink-indigo dark:focus:ring-clonelink-emerald focus:border-transparent transition-all shadow-inner"
          />

          <div className="absolute right-2 sm:right-3 flex items-center gap-1">
            {inputValue && (
              <button
                type="button"
                onClick={() => setInputValue('')}
                title={dict.input.clear}
                aria-label={dict.input.clear}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              title={dict.input.paste}
              aria-label={dict.input.paste}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="hidden sm:inline">{dict.input.paste}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Badges / Notices */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {parsed.isSingleOrg && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-clonelink-indigo dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {dict.input.orgDetected}: <strong className="font-mono">{parsed.owner}/{parsed.repo}</strong>
            </span>
          )}

          {parsed.subfolder && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-clonelink-emerald dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              {dict.downloader.subfolderPath}: <strong className="font-mono">{parsed.subfolder}</strong> ({parsed.branch})
            </span>
          )}

          {!parsed.isValid && inputValue.trim().length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {dict.input.invalidUrl}
            </span>
          )}
        </div>

        {/* Quick Sample Pills */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500 dark:text-gray-400 font-medium">{dict.input.samplesLabel}</span>
          <button
            type="button"
            onClick={() => setSample('facebook/react')}
            className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-clonelink-indigo dark:hover:text-indigo-400 text-gray-700 dark:text-gray-300 font-mono transition-colors border border-gray-200 dark:border-gray-700"
          >
            facebook/react
          </button>
          <button
            type="button"
            onClick={() => setSample('vercel/next.js/tree/canary/examples')}
            className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-clonelink-emerald dark:hover:text-emerald-400 text-gray-700 dark:text-gray-300 font-mono transition-colors border border-gray-200 dark:border-gray-700"
          >
            next.js/tree/canary/examples 📁
          </button>
          <button
            type="button"
            onClick={() => setSample('shadcn-ui/ui/tree/main/apps/www/src/components')}
            className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-clonelink-indigo dark:hover:text-indigo-400 text-gray-700 dark:text-gray-300 font-mono transition-colors border border-gray-200 dark:border-gray-700"
          >
            shadcn/ui/components 📁
          </button>
          <button
            type="button"
            onClick={() => setSample('kisharadilz')}
            className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-950 hover:text-amber-600 dark:hover:text-amber-400 text-gray-700 dark:text-gray-300 font-mono transition-colors border border-gray-200 dark:border-gray-700"
          >
            kisharadilz (single org)
          </button>
        </div>
      </div>

      {/* Protocol & Flags Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-clonelink-darkSurface border border-clonelink-lightBorder dark:border-clonelink-darkBorder shadow-sm">
        {/* Protocol Selector Tabs */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-2 uppercase tracking-wider">
            {dict.options.protocolLabel}:
          </span>
          {(['https', 'ssh', 'cli'] as ProtocolType[]).map((p) => {
            const isActive = protocol === p;
            const labels: Record<ProtocolType, string> = {
              https: 'HTTPS',
              ssh: 'SSH',
              cli: 'GitHub CLI (gh)',
            };
            return (
              <button
                key={p}
                type="button"
                onClick={() => setProtocol(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-clonelink-indigo text-white shadow-sm shadow-indigo-500/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Command Flags: Shallow Clone & Package Manager */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Shallow clone toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none" title={dict.options.shallowTip}>
            <input
              type="checkbox"
              checked={shallow}
              onChange={(e) => setShallow(e.target.checked)}
              className="w-4 h-4 rounded text-clonelink-indigo focus:ring-clonelink-indigo border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            />
            <span className="font-medium text-gray-700 dark:text-gray-300">{dict.options.shallow}</span>
          </label>

          {/* Include branch toggle (when branch detected or subfolder) */}
          {parsed.branch && (
            <label className="flex items-center gap-2 cursor-pointer select-none" title={dict.options.branchTip}>
              <input
                type="checkbox"
                checked={includeBranch}
                onChange={(e) => setIncludeBranch(e.target.checked)}
                className="w-4 h-4 rounded text-clonelink-indigo focus:ring-clonelink-indigo border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {dict.options.branchOption} <code className="font-mono text-[11px]">({parsed.branch})</code>
              </span>
            </label>
          )}

          {/* Package Manager Selector for Dev command */}
          <div className="flex items-center gap-1 pl-2 border-l border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400 font-medium">{dict.options.packageManager}:</span>
            <select
              value={packageManager}
              onChange={(e) => setPackageManager(e.target.value as PackageManagerType)}
              className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono text-xs rounded-md px-2 py-1 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-clonelink-indigo"
            >
              <option value="npm">npm</option>
              <option value="pnpm">pnpm</option>
              <option value="yarn">yarn</option>
              <option value="bun">bun</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subfolder ZIP Downloader Card (Visible when subfolder detected) */}
      {parsed.subfolder && (
        <div className="rounded-2xl border-2 border-clonelink-emerald/40 dark:border-clonelink-emerald/30 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent p-5 sm:p-6 shadow-dark-glow dark:bg-clonelink-darkCard">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  {dict.downloader.badge}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {dict.downloader.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                {dict.downloader.desc}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                <span className="text-gray-500 dark:text-gray-400">Path:</span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-gray-800 text-clonelink-emerald font-semibold border border-gray-200 dark:border-gray-700">
                  {parsed.subfolder}
                </span>
                <span className="text-gray-500 dark:text-gray-400">Branch:</span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {parsed.branch}
                </span>
              </div>
            </div>

            {/* Action Download Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSubfolder}
                disabled={isDownloading}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-clonelink-emerald hover:bg-clonelink-emeraldHover active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-500/20"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{downloadProgress?.message || dict.downloader.downloading}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{dict.downloader.button}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsTokenOpen(!isTokenOpen)}
                className="px-3 py-3 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700 text-center"
              >
                🔑 {dict.downloader.tokenToggle}
              </button>
            </div>
          </div>

          {/* Download Progress Bar */}
          {downloadProgress && (
            <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-gray-800">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                <span>{downloadProgress.message}</span>
                <span className="font-mono">{downloadProgress.percent ?? 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full bg-clonelink-emerald transition-all duration-300 rounded-full"
                  style={{ width: `${downloadProgress.percent ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {/* GitHub Token Accordion / Modal */}
          {isTokenOpen && (
            <div className="mt-4 p-4 rounded-xl bg-white dark:bg-clonelink-darkSurface border border-gray-200 dark:border-gray-700 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {dict.downloader.tokenToggle}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {dict.downloader.rateLimitNotice}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder={dict.downloader.tokenPlaceholder}
                  className="flex-1 px-3 py-2 rounded-lg font-mono text-xs bg-gray-50 dark:bg-clonelink-darkBg border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-clonelink-emerald"
                />
                <button
                  type="button"
                  onClick={handleSaveToken}
                  className="px-3 py-2 rounded-lg font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity"
                >
                  {dict.downloader.tokenSave}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {dict.downloader.tokenHelp}
              </p>
              {tokenSavedToast && (
                <div className="text-[11px] font-semibold text-clonelink-emerald flex items-center gap-1">
                  ✓ {dict.downloader.tokenSaved}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instant Command Cards Grid */}
      {commandChains && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                {dict.commands.heading}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {dict.commands.subheading}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Card 1: Clone & Enter */}
            <CommandCard
              cardKey="clone-enter"
              title={dict.commands.cloneEnter.title}
              description={dict.commands.cloneEnter.desc}
              command={commandChains.cloneAndEnter}
              isCopied={copiedKey === 'clone-enter'}
              onCopy={() => handleCopy('clone-enter', commandChains.cloneAndEnter)}
              copyLabel={dict.commands.copy}
              copiedLabel={dict.commands.copied}
              badge="Basic"
            />

            {/* Card 2: Clone & Open in VS Code */}
            <CommandCard
              cardKey="clone-vscode"
              title={dict.commands.cloneCode.title}
              description={dict.commands.cloneCode.desc}
              command={commandChains.cloneAndVsCode}
              isCopied={copiedKey === 'clone-vscode'}
              onCopy={() => handleCopy('clone-vscode', commandChains.cloneAndVsCode)}
              copyLabel={dict.commands.copy}
              copiedLabel={dict.commands.copied}
              badge="VS Code"
            />

            {/* Card 3: Clone, Install & Dev */}
            <CommandCard
              cardKey="clone-dev"
              title={dict.commands.cloneDev.title}
              description={dict.commands.cloneDev.desc}
              command={commandChains.cloneInstallDev}
              isCopied={copiedKey === 'clone-dev'}
              onCopy={() => handleCopy('clone-dev', commandChains.cloneInstallDev)}
              copyLabel={dict.commands.copy}
              copiedLabel={dict.commands.copied}
              badge={packageManager.toUpperCase()}
            />

            {/* Card 4: GitHub Pages Quick-Clone */}
            <CommandCard
              cardKey="gh-pages"
              title={dict.commands.ghPages.title}
              description={dict.commands.ghPages.desc}
              command={commandChains.ghPagesCommand}
              isCopied={copiedKey === 'gh-pages'}
              onCopy={() => handleCopy('gh-pages', commandChains.ghPagesCommand)}
              copyLabel={dict.commands.copy}
              copiedLabel={dict.commands.copied}
              badge="Pages"
            />

            {/* Card 5: Sparse-Checkout (When Subfolder Present) */}
            {commandChains.sparseCheckoutCommand && (
              <CommandCard
                cardKey="sparse-checkout"
                title={dict.commands.sparseCheckout.title}
                description={dict.commands.sparseCheckout.desc}
                command={commandChains.sparseCheckoutCommand}
                isCopied={copiedKey === 'sparse-checkout'}
                onCopy={() => handleCopy('sparse-checkout', commandChains.sparseCheckoutCommand)}
                copyLabel={dict.commands.copy}
                copiedLabel={dict.commands.copied}
                badge="Sparse"
                highlightBorder
              />
            )}
          </div>
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <div className="pt-6 border-t border-clonelink-lightBorder dark:border-clonelink-darkBorder">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {dict.history.title} ({history.length})
            </h3>
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-xs text-gray-400 hover:text-rose-500 transition-colors"
            >
              {dict.history.clear}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((item, idx) => (
              <button
                key={`${item.owner}-${item.repo}-${idx}`}
                type="button"
                onClick={() => {
                  setInputValue(item.input);
                  inputRef.current?.focus();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-white dark:bg-clonelink-darkSurface border border-clonelink-lightBorder dark:border-clonelink-darkBorder text-gray-700 dark:text-gray-300 hover:border-clonelink-indigo dark:hover:border-clonelink-emerald transition-all shadow-sm"
              >
                <span className="font-semibold">{item.owner}/{item.repo}</span>
                {item.subfolder && (
                  <span className="text-[10px] text-clonelink-emerald bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded">
                    📁
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Monospace Command Card Component
interface CommandCardProps {
  cardKey: string;
  title: string;
  description: string;
  command: string;
  isCopied: boolean;
  onCopy: () => void;
  copyLabel: string;
  copiedLabel: string;
  badge?: string;
  highlightBorder?: boolean;
}

function CommandCard({
  title,
  description,
  command,
  isCopied,
  onCopy,
  copyLabel,
  copiedLabel,
  badge,
  highlightBorder,
}: CommandCardProps) {
  return (
    <div
      onClick={onCopy}
      className={`group relative rounded-xl border p-4 sm:p-5 transition-all cursor-pointer ${
        highlightBorder
          ? 'border-clonelink-emerald/60 bg-white dark:bg-clonelink-darkSurface shadow-dark-glow'
          : 'border-clonelink-lightBorder dark:border-clonelink-darkBorder bg-white dark:bg-clonelink-darkSurface hover:border-clonelink-indigo/60 dark:hover:border-clonelink-emerald/60 shadow-clean hover:shadow-clean-md'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              {badge}
            </span>
          )}
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 sm:text-right">
          {description}
        </span>
      </div>

      {/* Terminal Code Box */}
      <div className="relative rounded-lg bg-gray-900 text-gray-100 p-3 sm:p-3.5 font-mono text-xs sm:text-sm overflow-x-auto border border-gray-800 flex items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-clonelink-emerald font-bold select-none" aria-hidden="true">$</span>
          <span className="break-all whitespace-pre-wrap select-all font-mono text-gray-100">
            {command}
          </span>
        </div>

        {/* Copy Button (Inside Code box on desktop, full button on mobile) */}
        <button
          type="button"
          aria-live="polite"
          aria-label={isCopied ? copiedLabel : `${copyLabel}: ${command}`}
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs font-semibold transition-all ${
            isCopied
              ? 'bg-clonelink-emerald text-white'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 group-hover:border-clonelink-indigo'
          }`}
        >
          {isCopied ? (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{copiedLabel}</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copyLabel}</span>
            </>
          )}
        </button>
      </div>

      {/* Mobile-Only One-Tap Copy Pill */}
      <div className="mt-2 block sm:hidden">
        <button
          type="button"
          aria-live="polite"
          aria-label={isCopied ? copiedLabel : `${copyLabel} Command`}
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className={`w-full py-2 rounded-lg font-sans text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${
            isCopied
              ? 'bg-clonelink-emerald text-white'
              : 'bg-clonelink-indigo text-white shadow-sm'
          }`}
        >
          {isCopied ? copiedLabel : `${copyLabel} Command`}
        </button>
      </div>
    </div>
  );
}
