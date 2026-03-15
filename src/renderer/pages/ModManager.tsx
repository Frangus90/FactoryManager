import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useUserDataPath } from '../hooks/useUserDataPath';
import { useServerStatus } from '../hooks/useServerStatus';
import ConfirmDialog from '../components/ConfirmDialog';
import type {
  ModInfo,
  PortalMod,
  PortalModFull,
  ModUpdate,
  DownloadProgress,
} from '../../shared/types';

type Tab = 'installed' | 'browse';
type SortKey = 'downloads' | 'updated' | 'name';

const ASSETS_BASE = 'https://assets-mod.factorio.com';

function resolveThumbnail(thumb: string): string {
  if (!thumb) return '';
  if (thumb.startsWith('http')) return thumb;
  return `${ASSETS_BASE}${thumb}`;
}

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays < 1) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// ---------------------------------------------------------------------------
// Simple Markdown renderer for mod descriptions
// ---------------------------------------------------------------------------

function SimpleMarkdown({ text }: { text: string }) {
  // Split into lines and process each
  const elements: React.ReactNode[] = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) elements.push(<br key={`br-${i}`} />);
    elements.push(...parseInline(lines[i], `line-${i}`));
  }

  return <div className="text-sm text-factorio-text">{elements}</div>;
}

function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Combined regex: markdown images, markdown links, bold, italic
  const regex = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined || (match[0].startsWith('![') && match[2])) {
      // Image: ![alt](url)
      nodes.push(
        <img
          key={`${keyPrefix}-${partIndex++}`}
          src={match[2]}
          alt={match[1] || ''}
          className="max-w-full h-auto my-1 bg-factorio-darker"
          loading="lazy"
        />,
      );
    } else if (match[3] !== undefined) {
      // Link: [text](url)
      nodes.push(
        <a
          key={`${keyPrefix}-${partIndex++}`}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-factorio-orange hover:underline"
        >
          {match[3]}
        </a>,
      );
    } else if (match[5] !== undefined) {
      // Bold: **text**
      nodes.push(<strong key={`${keyPrefix}-${partIndex++}`}>{match[5]}</strong>);
    } else if (match[6] !== undefined) {
      // Italic: *text*
      nodes.push(<em key={`${keyPrefix}-${partIndex++}`}>{match[6]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  // If no matches at all, just return the text
  if (nodes.length === 0) {
    nodes.push(text);
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Installed Tab
// ---------------------------------------------------------------------------

interface InstalledTabProps {
  mods: ModInfo[];
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
  isRunning: boolean;
  modsDir: string;
  loadMods: () => Promise<void>;
  updates: ModUpdate[];
  downloadingMods: Set<string>;
  onInstallUpdate: (update: ModUpdate) => void;
  onUpdateAll: () => void;
}

function InstalledTab({
  mods,
  loading,
  search,
  setSearch,
  isRunning,
  modsDir,
  loadMods,
  updates,
  downloadingMods,
  onInstallUpdate,
  onUpdateAll,
}: InstalledTabProps) {
  const [expandedMod, setExpandedMod] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModInfo | null>(null);

  const handleToggle = async (mod: ModInfo) => {
    if (mod.name === 'base') return;
    try {
      await window.electronAPI.mods.setEnabled(modsDir, mod.name, !mod.enabled);
      await loadMods();
    } catch (err) {
      console.error('Failed to toggle mod:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await window.electronAPI.mods.delete(modsDir, deleteTarget.fileName);
      setDeleteTarget(null);
      setExpandedMod(null);
      await loadMods();
    } catch (err) {
      console.error('Failed to delete mod:', err);
    }
  };

  const filteredMods = mods.filter((mod) => {
    const query = search.toLowerCase();
    return (
      mod.name.toLowerCase().includes(query) ||
      mod.title.toLowerCase().includes(query)
    );
  });

  const updateMap = new Map(updates.map((u) => [u.name, u]));

  return (
    <>
      {/* Search + Update All */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          className="input flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search installed mods..."
        />
        {updates.length > 0 && (
          <button className="btn-primary text-xs whitespace-nowrap" onClick={onUpdateAll}>
            Update All ({updates.length})
          </button>
        )}
      </div>

      {/* Mod list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-factorio-muted">Loading mods...</p>
          </div>
        ) : filteredMods.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-factorio-muted">
              {search ? 'No mods match your search.' : 'No mods installed.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMods.map((mod) => {
              const isExpanded = expandedMod === mod.name;
              const isBase = mod.name === 'base';
              const update = updateMap.get(mod.name);
              const isDownloading = downloadingMods.has(mod.name);

              return (
                <div key={mod.name} className="card">
                  <div className="flex items-center gap-3">
                    {/* Enable/Disable toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={mod.enabled}
                      disabled={isBase}
                      onClick={() => handleToggle(mod)}
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                        mod.enabled ? 'bg-factorio-orange' : 'bg-factorio-border'
                      } ${isBase ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-factorio-text transition-transform ${
                          mod.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Mod info */}
                    <button
                      type="button"
                      className="flex-1 text-left min-w-0"
                      onClick={() => setExpandedMod((p) => (p === mod.name ? null : mod.name))}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-factorio-text truncate">
                          {mod.title || mod.name}
                        </span>
                        <span className="text-xs text-factorio-muted shrink-0">v{mod.version}</span>
                        {update && (
                          <span className="text-xs text-factorio-orange shrink-0">
                            -&gt; v{update.latestVersion}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-factorio-muted mt-0.5">by {mod.author}</p>
                    </button>

                    {/* Update button */}
                    {update && (
                      <button
                        className="btn-primary text-xs !px-2 !py-1"
                        onClick={() => onInstallUpdate(update)}
                        disabled={isDownloading}
                      >
                        {isDownloading ? 'Updating...' : 'Update'}
                      </button>
                    )}

                    {/* Expand indicator */}
                    <span
                      className={`text-factorio-muted text-sm transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    >
                      &#9654;
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-factorio-border">
                      {mod.description && (
                        <p className="text-sm text-factorio-text mb-2">{mod.description}</p>
                      )}
                      {mod.dependencies.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-factorio-muted">
                            Dependencies:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {mod.dependencies.map((dep, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 bg-factorio-darker text-factorio-muted"
                              >
                                {dep}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 text-xs text-factorio-muted">
                          <span>Factorio: {mod.factorioVersion}</span>
                          <span>File: {mod.fileName}</span>
                        </div>
                        {!isBase && (
                          <button
                            className="btn-danger text-xs !px-2 !py-1"
                            onClick={() => setDeleteTarget(mod)}
                            disabled={isRunning}
                            title={isRunning ? 'Stop the server before deleting mods' : ''}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Mod"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will remove the mod file permanently.`}
        confirmLabel="Delete"
        confirmDanger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Portal Browse Tab
// ---------------------------------------------------------------------------

interface PortalTabProps {
  catalog: PortalMod[];
  catalogLoading: boolean;
  catalogError: string | null;
  onRefreshCatalog: () => void;
  installedNames: Set<string>;
  downloadingMods: Set<string>;
  onInstall: (mod: PortalMod) => void;
}

function PortalTab({
  catalog,
  catalogLoading,
  catalogError,
  onRefreshCatalog,
  installedNames,
  downloadingMods,
  onInstall,
}: PortalTabProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('downloads');
  const [expandedMod, setExpandedMod] = useState<string | null>(null);
  const [modDetails, setModDetails] = useState<PortalModFull | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(50);
  const scrollRef = useRef<HTMLDivElement>(null);
  const expandingRef = useRef<string | null>(null);

  // Reset display count on search/sort change
  useEffect(() => {
    setDisplayCount(50);
  }, [search, sortKey]);

  const handleExpand = async (modName: string) => {
    if (expandedMod === modName) {
      setExpandedMod(null);
      setModDetails(null);
      expandingRef.current = null;
      return;
    }
    setExpandedMod(modName);
    setModDetails(null);
    setDetailsLoading(true);
    expandingRef.current = modName;
    try {
      const details = await window.electronAPI.modPortal.fetchDetails(modName);
      if (expandingRef.current === modName) {
        setModDetails(details);
      }
    } catch {
      // Failed to load details
    } finally {
      if (expandingRef.current === modName) {
        setDetailsLoading(false);
      }
    }
  };

  // Filter
  const filtered = catalog.filter((mod) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      mod.name.toLowerCase().includes(q) ||
      mod.title.toLowerCase().includes(q) ||
      mod.summary.toLowerCase().includes(q) ||
      mod.owner.toLowerCase().includes(q)
    );
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'downloads') return b.downloads_count - a.downloads_count;
    if (sortKey === 'updated') {
      const aDate = a.latest_release?.released_at ?? '';
      const bDate = b.latest_release?.released_at ?? '';
      return bDate.localeCompare(aDate);
    }
    return a.title.localeCompare(b.title);
  });

  const displayed = sorted.slice(0, displayCount);
  const hasMore = displayCount < sorted.length;

  // Scroll-based lazy loading
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      setDisplayCount((prev) => prev + 50);
    }
  }, [hasMore]);

  return (
    <>
      {/* Search + Sort + Refresh */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          className="input flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mod portal..."
        />
        <select
          className="input w-36"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="downloads">Most Downloaded</option>
          <option value="updated">Recently Updated</option>
          <option value="name">Name A-Z</option>
        </select>
        <button
          className="btn-secondary whitespace-nowrap"
          onClick={onRefreshCatalog}
          disabled={catalogLoading}
        >
          {catalogLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Results info */}
      <div className="text-xs text-factorio-muted mb-2">
        {catalogLoading
          ? 'Loading mod catalog...'
          : catalogError
            ? `Error: ${catalogError}`
            : `${filtered.length} mods found${search ? ` for "${search}"` : ''}`}
      </div>

      {/* Mod list */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto"
        onScroll={handleScroll}
      >
        {catalogLoading && catalog.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-factorio-muted">Fetching mod catalog...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((mod) => {
              const isExpanded = expandedMod === mod.name;
              const isInstalled = installedNames.has(mod.name);
              const isDownloading = downloadingMods.has(mod.name);

              return (
                <div key={mod.name} className="card">
                  <div className="flex items-start gap-3">
                    {/* Mod info */}
                    <button
                      type="button"
                      className="flex-1 text-left min-w-0"
                      onClick={() => handleExpand(mod.name)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-factorio-text truncate">
                          {mod.title}
                        </span>
                        {mod.latest_release && (
                          <span className="text-xs text-factorio-muted shrink-0">
                            v{mod.latest_release.version}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-factorio-muted mt-0.5">
                        by {mod.owner} | {formatDownloads(mod.downloads_count)} downloads
                        {mod.latest_release?.released_at && (
                          <> | Updated {formatRelativeDate(mod.latest_release.released_at)}</>
                        )}
                      </p>
                      <p className="text-xs text-factorio-muted mt-1 line-clamp-2">
                        {mod.summary}
                      </p>
                    </button>

                    {/* Install / Installed badge */}
                    <div className="shrink-0">
                      {isInstalled ? (
                        <span className="text-xs text-green-400 px-2 py-1 border border-green-700">
                          Installed
                        </span>
                      ) : (
                        <button
                          className="btn-primary text-xs !px-2 !py-1"
                          onClick={() => onInstall(mod)}
                          disabled={isDownloading || !mod.latest_release}
                        >
                          {isDownloading ? 'Installing...' : 'Install'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-factorio-border">
                      {detailsLoading ? (
                        <p className="text-sm text-factorio-muted">Loading details...</p>
                      ) : modDetails && modDetails.name === mod.name ? (
                        <div className="space-y-3">
                          {modDetails.thumbnail && (
                            <img
                              src={resolveThumbnail(modDetails.thumbnail)}
                              alt=""
                              className="w-32 h-auto bg-factorio-darker"
                            />
                          )}
                          {modDetails.description && (
                            <SimpleMarkdown text={modDetails.description} />
                          )}
                          {/* Dependencies from latest release */}
                          {modDetails.releases.length > 0 && (
                            <PortalDependencies release={modDetails.releases[modDetails.releases.length - 1]} />
                          )}
                          <div className="flex items-center gap-3 text-xs text-factorio-muted">
                            <span>Category: {mod.category || 'none'}</span>
                            <span>Releases: {modDetails.releases.length}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-factorio-muted">
                          {mod.summary}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <div className="text-center py-4">
                <button
                  className="btn-secondary text-xs"
                  onClick={() => setDisplayCount((p) => Math.min(p + 50, sorted.length))}
                >
                  Load More ({sorted.length - displayCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Portal Dependencies display
// ---------------------------------------------------------------------------

function PortalDependencies({ release }: { release: { info_json: { dependencies?: string[] } } }) {
  const deps = release.info_json.dependencies;
  if (!deps || deps.length === 0) return null;

  const required = deps.filter((d) => !d.startsWith('?') && !d.startsWith('(?)') && !d.startsWith('!'));
  const optional = deps.filter((d) => d.startsWith('?') || d.startsWith('(?)'));
  const incompatible = deps.filter((d) => d.startsWith('!'));

  return (
    <div className="space-y-1">
      {required.length > 0 && (
        <div>
          <span className="text-xs font-medium text-factorio-muted">Required:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {required.map((dep, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-factorio-darker text-factorio-muted">
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}
      {optional.length > 0 && (
        <div>
          <span className="text-xs font-medium text-factorio-muted">Optional:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {optional.map((dep, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-factorio-darker text-factorio-muted">
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}
      {incompatible.length > 0 && (
        <div>
          <span className="text-xs font-medium text-red-400">Incompatible:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {incompatible.map((dep, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-factorio-darker text-red-400">
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ModManager Component
// ---------------------------------------------------------------------------

export default function ModManager() {
  const { activeProfile } = useProfile();
  const userDataPath = useUserDataPath();
  const { status } = useServerStatus();

  const [tab, setTab] = useState<Tab>('installed');

  // Installed mods state
  const [mods, setMods] = useState<ModInfo[]>([]);
  const [modsLoading, setModsLoading] = useState(true);
  const [installedSearch, setInstalledSearch] = useState('');

  // Portal catalog state
  const [catalog, setCatalog] = useState<PortalMod[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [factorioVersion, setFactorioVersion] = useState<string | null>(null);

  // Update checking state
  const [updates, setUpdates] = useState<ModUpdate[]>([]);

  // Download state
  const [downloadingMods, setDownloadingMods] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const modsDir = userDataPath ? `${userDataPath}/mods` : '';
  const isRunning = status === 'running';

  // Dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  // Subscribe to download progress events
  useEffect(() => {
    const unsub = window.electronAPI.modPortal.onDownloadProgress((progress: DownloadProgress) => {
      if (progress.phase === 'complete') {
        setDownloadingMods((prev) => {
          const next = new Set(prev);
          next.delete(progress.modName);
          return next;
        });
      } else if (progress.phase === 'error') {
        setDownloadingMods((prev) => {
          const next = new Set(prev);
          next.delete(progress.modName);
          return next;
        });
        setToast(`Failed to download ${progress.modName}: ${progress.error}`);
      }
    });
    return unsub;
  }, []);

  // Load installed mods
  const loadMods = useCallback(async () => {
    if (!activeProfile || !userDataPath) return;
    setModsLoading(true);
    try {
      const list = await window.electronAPI.mods.list(modsDir);
      setMods(list);
    } catch (err) {
      console.error('Failed to load mods:', err);
      setMods([]);
    } finally {
      setModsLoading(false);
    }
  }, [activeProfile, userDataPath, modsDir]);

  useEffect(() => {
    loadMods();
  }, [loadMods]);

  // Get Factorio version for portal queries
  useEffect(() => {
    if (!activeProfile?.factorioPath) return;
    window.electronAPI.util
      .getFactorioVersion(activeProfile.factorioPath)
      .then((v) => {
        if (v) {
          // Truncate "2.0.28" -> "2.0"
          const parts = v.split('.');
          setFactorioVersion(parts.length >= 2 ? `${parts[0]}.${parts[1]}` : v);
        }
      })
      .catch(() => {});
  }, [activeProfile?.factorioPath]);

  // Fetch catalog
  const fetchCatalog = useCallback(async () => {
    if (!factorioVersion) return;
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const results = await window.electronAPI.modPortal.fetchCatalog(factorioVersion);
      setCatalog(results);
    } catch (err) {
      setCatalogError((err as Error).message);
    } finally {
      setCatalogLoading(false);
    }
  }, [factorioVersion]);

  // Reset catalog when factorio version changes (e.g. profile switch)
  const catalogFetched = useRef(false);
  useEffect(() => {
    catalogFetched.current = false;
  }, [factorioVersion]);

  // Auto-fetch catalog when switching to browse tab (once per version)
  useEffect(() => {
    if (tab === 'browse' && !catalogFetched.current && factorioVersion) {
      catalogFetched.current = true;
      fetchCatalog();
    }
  }, [tab, factorioVersion, fetchCatalog]);

  // Check for updates
  const checkUpdates = useCallback(async () => {
    if (!modsDir || !factorioVersion) return;
    try {
      const result = await window.electronAPI.modPortal.checkUpdates(modsDir, factorioVersion);
      setUpdates(result);
    } catch (err) {
      console.error('Failed to check updates:', err);
    }
  }, [modsDir, factorioVersion]);

  // Auto-check updates only on initial load and version change (not on every mod list refresh)
  const updatesChecked = useRef(false);
  useEffect(() => {
    updatesChecked.current = false;
  }, [factorioVersion]);

  useEffect(() => {
    if (mods.length > 0 && factorioVersion && !updatesChecked.current) {
      updatesChecked.current = true;
      checkUpdates();
    }
  }, [mods.length, factorioVersion, checkUpdates]);

  // Install a mod from portal
  const handleInstall = useCallback(
    async (mod: PortalMod) => {
      if (!mod.latest_release || !modsDir) return;
      setDownloadingMods((prev) => new Set(prev).add(mod.name));
      try {
        await window.electronAPI.modPortal.download(mod.name, mod.latest_release, modsDir);
        setToast(`Installed ${mod.title}`);
        await loadMods();
      } catch (err) {
        // Error toast is sent via progress event
        console.error('Install failed:', err);
      }
    },
    [modsDir, loadMods],
  );

  // Install an update: download new version first, then delete old
  const handleInstallUpdate = useCallback(
    async (update: ModUpdate) => {
      if (!modsDir) return;
      setDownloadingMods((prev) => new Set(prev).add(update.name));
      try {
        // Download new version first (files have different names due to version in filename)
        await window.electronAPI.modPortal.download(update.name, update.release, modsDir);

        // Only now delete the old version (fetch fresh list to avoid stale closure)
        const currentMods = await window.electronAPI.mods.list(modsDir);
        const oldMod = currentMods.find(
          (m) => m.name === update.name && m.fileName !== update.release.file_name,
        );
        if (oldMod) {
          await window.electronAPI.mods.delete(modsDir, oldMod.fileName).catch(() => {});
        }

        setToast(`Updated ${update.title} to v${update.latestVersion}`);
        await loadMods();
      } catch (err) {
        console.error('Update failed:', err);
      }
    },
    [modsDir, loadMods],
  );

  // Update all
  const handleUpdateAll = useCallback(async () => {
    for (const update of updates) {
      await handleInstallUpdate(update);
    }
  }, [updates, handleInstallUpdate]);

  const installedNames = new Set(mods.map((m) => m.name));
  const enabledCount = mods.filter((m) => m.enabled).length;

  if (!activeProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-factorio-muted">No active profile selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toast */}
      {toast && (
        <div className="toast-success mb-4 flex items-center justify-between">
          <span>{toast}</span>
          <button
            className="text-green-400 hover:text-green-200 ml-4"
            onClick={() => setToast(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-factorio-text">Mod Manager</h2>
          <p className="text-sm text-factorio-muted mt-0.5">
            {mods.length} mods total, {enabledCount} enabled
            {factorioVersion && ` | Factorio ${factorioVersion}`}
          </p>
        </div>
        <button className="btn-secondary" onClick={loadMods} disabled={modsLoading}>
          {modsLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Warning banner when server is running */}
      {isRunning && (
        <div className="toast-warn mb-4 flex items-center gap-2">
          <span className="shrink-0 text-lg">!</span>
          <span>Mod changes require a server restart to take effect.</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-0 mb-4 border-b border-factorio-border">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            tab === 'installed'
              ? 'text-factorio-orange border-factorio-orange'
              : 'text-factorio-muted border-transparent hover:text-factorio-text'
          }`}
          onClick={() => setTab('installed')}
        >
          Installed
          {updates.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-factorio-orange text-factorio-darker">
              {updates.length}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            tab === 'browse'
              ? 'text-factorio-orange border-factorio-orange'
              : 'text-factorio-muted border-transparent hover:text-factorio-text'
          }`}
          onClick={() => setTab('browse')}
        >
          Browse Portal
          {catalog.length > 0 && (
            <span className="ml-2 text-xs text-factorio-muted">({catalog.length})</span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {tab === 'installed' ? (
        <InstalledTab
          mods={mods}
          loading={modsLoading}
          search={installedSearch}
          setSearch={setInstalledSearch}
          isRunning={isRunning}
          modsDir={modsDir}
          loadMods={loadMods}
          updates={updates}
          downloadingMods={downloadingMods}
          onInstallUpdate={handleInstallUpdate}
          onUpdateAll={handleUpdateAll}
        />
      ) : (
        <PortalTab
          catalog={catalog}
          catalogLoading={catalogLoading}
          catalogError={catalogError}
          onRefreshCatalog={fetchCatalog}
          installedNames={installedNames}
          downloadingMods={downloadingMods}
          onInstall={handleInstall}
        />
      )}
    </div>
  );
}
