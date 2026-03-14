import React, { useState, useEffect, useCallback } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useUserDataPath } from '../hooks/useUserDataPath';
import { useServerStatus } from '../hooks/useServerStatus';
import ConfirmDialog from '../components/ConfirmDialog';
import type { ModInfo } from '../../shared/types';

export default function ModManager() {
  const { activeProfile } = useProfile();
  const userDataPath = useUserDataPath();
  const { status } = useServerStatus();

  const [mods, setMods] = useState<ModInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedMod, setExpandedMod] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModInfo | null>(null);

  const modsDir = userDataPath ? `${userDataPath}/mods` : '';
  const isRunning = status === 'running';

  const loadMods = useCallback(async () => {
    if (!activeProfile || !userDataPath) return;
    setLoading(true);
    try {
      const list = await window.electronAPI.mods.list(modsDir);
      setMods(list);
    } catch (err) {
      console.error('Failed to load mods:', err);
      setMods([]);
    } finally {
      setLoading(false);
    }
  }, [activeProfile, userDataPath, modsDir]);

  useEffect(() => {
    loadMods();
  }, [loadMods]);

  const handleToggle = async (mod: ModInfo) => {
    if (mod.name === 'base') return;
    try {
      await window.electronAPI.mods.setEnabled(modsDir, mod.name, !mod.enabled);
      await loadMods();
    } catch (err) {
      console.error('Failed to toggle mod:', err);
    }
  };

  const handleExpand = (modName: string) => {
    setExpandedMod((prev) => (prev === modName ? null : modName));
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-factorio-text">Mod Manager</h2>
          <p className="text-sm text-factorio-muted mt-0.5">
            {mods.length} mods total, {enabledCount} enabled
          </p>
        </div>
        <button className="btn-secondary" onClick={loadMods} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Warning banner when server is running */}
      {isRunning && (
        <div className="flex items-center gap-2 bg-yellow-600/20 border border-yellow-600/40 text-yellow-400 rounded-lg px-4 py-3 mb-4 text-sm">
          <span className="shrink-0 text-lg">!</span>
          <span>
            Mod changes require a server restart to take effect.
          </span>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          className="input w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mods by name..."
        />
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
              {search ? 'No mods match your search.' : 'No mods found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMods.map((mod) => {
              const isExpanded = expandedMod === mod.name;
              const isBase = mod.name === 'base';

              return (
                <div
                  key={mod.name}
                  className="card"
                >
                  <div className="flex items-center gap-3">
                    {/* Enable/Disable toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={mod.enabled}
                      disabled={isBase}
                      onClick={() => handleToggle(mod)}
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                        mod.enabled
                          ? 'bg-factorio-orange'
                          : 'bg-factorio-border'
                      } ${isBase ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          mod.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Mod info */}
                    <button
                      type="button"
                      className="flex-1 text-left min-w-0"
                      onClick={() => handleExpand(mod.name)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-factorio-text truncate">
                          {mod.title || mod.name}
                        </span>
                        <span className="text-xs text-factorio-muted shrink-0">
                          v{mod.version}
                        </span>
                      </div>
                      <p className="text-xs text-factorio-muted mt-0.5">
                        by {mod.author}
                      </p>
                    </button>

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
                        <p className="text-sm text-factorio-text mb-2">
                          {mod.description}
                        </p>
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
                                className="text-xs px-2 py-0.5 bg-factorio-darker rounded text-factorio-muted"
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
    </div>
  );
}
