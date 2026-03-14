import React, { useState, useEffect, useCallback } from 'react';
import { useProfile } from '../context/ProfileContext';
import ConfirmDialog from '../components/ConfirmDialog';
import type { SaveFile, BackupEntry } from '../../shared/types';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export default function SaveManager() {
  const { activeProfile, refreshProfiles } = useProfile();

  // Server saves (isolated server-data/saves/)
  const [serverSavesDir, setServerSavesDir] = useState<string>('');
  const [saves, setSaves] = useState<SaveFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Game saves (user's Factorio saves folder)
  const [gameSaves, setGameSaves] = useState<SaveFile[]>([]);
  const [loadingGame, setLoadingGame] = useState(false);
  const [importingFile, setImportingFile] = useState<string | null>(null);

  // New save creation
  const [newSaveName, setNewSaveName] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SaveFile | null>(null);

  // Overwrite confirmation for imports
  const [overwriteTarget, setOverwriteTarget] = useState<SaveFile | null>(null);

  // Backups
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupEntry | null>(null);
  const [deleteBackupTarget, setDeleteBackupTarget] = useState<BackupEntry | null>(null);

  // Fetch the server saves directory path once
  useEffect(() => {
    window.electronAPI.saves.getServerDir().then(setServerSavesDir).catch(() => {});
  }, []);

  // Load server saves
  const loadServerSaves = useCallback(async () => {
    if (!serverSavesDir) return;
    setLoading(true);
    try {
      const list = await window.electronAPI.saves.list(serverSavesDir);
      list.sort((a, b) => b.lastModified - a.lastModified);
      setSaves(list);
    } catch (err) {
      console.error('Failed to load server saves:', err);
      setSaves([]);
    } finally {
      setLoading(false);
    }
  }, [serverSavesDir]);

  // Load game saves (5 most recent)
  const loadGameSaves = useCallback(async () => {
    if (!activeProfile) return;
    setLoadingGame(true);
    try {
      const list = await window.electronAPI.saves.listGameSaves(activeProfile.factorioPath);
      list.sort((a, b) => b.lastModified - a.lastModified);
      setGameSaves(list.slice(0, 5));
    } catch (err) {
      console.error('Failed to load game saves:', err);
      setGameSaves([]);
    } finally {
      setLoadingGame(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadServerSaves();
  }, [loadServerSaves]);

  useEffect(() => {
    loadGameSaves();
  }, [loadGameSaves]);

  const loadBackups = useCallback(async () => {
    try {
      const list = await window.electronAPI.backups.list();
      setBackups(list);
    } catch {
      setBackups([]);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleRefresh = useCallback(() => {
    loadServerSaves();
    loadGameSaves();
    loadBackups();
  }, [loadServerSaves, loadGameSaves, loadBackups]);

  const handleSelect = async (save: SaveFile) => {
    if (!activeProfile) return;
    try {
      await window.electronAPI.profiles.update(activeProfile.id, {
        selectedSave: save.filePath,
      });
      await refreshProfiles();
    } catch (err) {
      console.error('Failed to select save:', err);
    }
  };

  const handleToggleLatest = async () => {
    if (!activeProfile) return;
    try {
      await window.electronAPI.profiles.update(activeProfile.id, {
        useLatestSave: !activeProfile.useLatestSave,
      });
      await refreshProfiles();
    } catch (err) {
      console.error('Failed to toggle useLatestSave:', err);
    }
  };

  const handleCreate = async () => {
    const name = newSaveName.trim();
    if (!name || !activeProfile) return;
    setCreating(true);
    try {
      await window.electronAPI.saves.create(name, activeProfile.factorioPath, serverSavesDir || undefined);
      setNewSaveName('');
      await loadServerSaves();
    } catch (err) {
      console.error('Failed to create save:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await window.electronAPI.saves.delete(deleteTarget.filePath);
      setDeleteTarget(null);
      await loadServerSaves();
    } catch (err) {
      console.error('Failed to delete save:', err);
    }
  };

  const handleImport = async (save: SaveFile, overwrite = false) => {
    setImportingFile(save.filePath);
    try {
      await window.electronAPI.saves.import(save.filePath, overwrite);
      await loadServerSaves();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already exists')) {
        setOverwriteTarget(save);
      } else {
        console.error('Failed to import save:', err);
      }
    } finally {
      setImportingFile(null);
    }
  };

  const handleOverwriteConfirm = async () => {
    if (!overwriteTarget) return;
    setOverwriteTarget(null);
    await handleImport(overwriteTarget, true);
  };

  if (!activeProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-factorio-muted">No active profile selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-factorio-text">Save Manager</h2>
        <button className="btn-secondary" onClick={handleRefresh} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Use Latest Save toggle */}
      <div className="card mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={activeProfile.useLatestSave}
            onChange={handleToggleLatest}
            className="w-4 h-4 accent-factorio-orange"
          />
          <div>
            <span className="text-sm font-medium text-factorio-text">
              Use Latest Save
            </span>
            <p className="text-xs text-factorio-muted mt-0.5">
              Automatically use the most recently modified save file when starting the server.
            </p>
          </div>
        </label>
      </div>

      {/* New Save section */}
      <div className="card mb-4">
        <h3 className="text-sm font-semibold text-factorio-text mb-2">New Save</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="input flex-1"
            value={newSaveName}
            onChange={(e) => setNewSaveName(e.target.value)}
            placeholder="Enter save name"
            disabled={creating}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={creating || !newSaveName.trim()}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Import from Game section */}
      <div className="card mb-4">
        <h3 className="text-sm font-semibold text-factorio-orange mb-3 uppercase tracking-wide">
          Import from Game
        </h3>
        <p className="text-xs text-factorio-muted mb-3">
          Copy a save from your Factorio game to the server. Showing the 5 most recent saves.
        </p>
        {loadingGame ? (
          <p className="text-factorio-muted text-sm py-2">Loading game saves...</p>
        ) : gameSaves.length === 0 ? (
          <p className="text-factorio-muted text-sm py-2">No game saves found.</p>
        ) : (
          <div className="space-y-1.5">
            {gameSaves.map((save) => {
              const isImporting = importingFile === save.filePath;
              const alreadyExists = saves.some((s) => s.fileName === save.fileName);
              return (
                <div
                  key={save.filePath}
                  className="flex items-center justify-between bg-factorio-darker border border-factorio-border/50 px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-factorio-text text-sm truncate">{save.name}</span>
                    <span className="text-factorio-muted text-xs shrink-0">
                      {formatFileSize(save.sizeBytes)}
                    </span>
                    <span className="text-factorio-muted text-xs shrink-0">
                      {formatDate(save.lastModified)}
                    </span>
                  </div>
                  <button
                    className="btn-primary text-xs !px-3 !py-1 shrink-0"
                    onClick={() => handleImport(save)}
                    disabled={isImporting}
                  >
                    {isImporting ? 'Importing...' : alreadyExists ? 'Re-import' : 'Import'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Server Saves list */}
      <div className="card flex-1 min-h-0 flex flex-col">
        <h3 className="text-sm font-semibold text-factorio-orange mb-3 uppercase tracking-wide">
          Server Saves
        </h3>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-factorio-muted">Loading saves...</p>
            </div>
          ) : saves.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-factorio-muted">No server saves yet. Create one or import from your game.</p>
            </div>
          ) : (
            <div className="border border-factorio-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-factorio-dark border-b border-factorio-border">
                    <th className="text-left px-4 py-2 text-factorio-muted font-medium">
                      Name
                    </th>
                    <th className="text-right px-4 py-2 text-factorio-muted font-medium">
                      Size
                    </th>
                    <th className="text-right px-4 py-2 text-factorio-muted font-medium">
                      Last Modified
                    </th>
                    <th className="text-right px-4 py-2 text-factorio-muted font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {saves.map((save) => {
                    const isSelected =
                      !activeProfile.useLatestSave &&
                      activeProfile.selectedSave === save.filePath;

                    return (
                      <tr
                        key={save.filePath}
                        className={`border-b border-factorio-border/50 hover:bg-factorio-panel/50 transition-colors ${
                          isSelected ? 'ring-1 ring-inset ring-factorio-orange bg-factorio-panel' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-factorio-text">{save.name}</span>
                            {isSelected && (
                              <span className="text-xs text-factorio-orange font-medium px-1.5 py-0.5 bg-factorio-orange/10">
                                Selected
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-factorio-muted">
                          {formatFileSize(save.sizeBytes)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-factorio-muted">
                          {formatDate(save.lastModified)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="btn-secondary text-xs !px-2 !py-1"
                              onClick={() => handleSelect(save)}
                              disabled={isSelected}
                            >
                              Select
                            </button>
                            <button
                              className="btn-danger text-xs !px-2 !py-1"
                              onClick={() => setDeleteTarget(save)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Backups section */}
      <div className="card mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-factorio-orange uppercase tracking-wide">
            Backups
          </h3>
          <button
            className="btn-secondary text-xs"
            onClick={async () => {
              setCreatingBackup(true);
              try {
                await window.electronAPI.backups.create();
                await loadBackups();
              } catch (err) {
                console.error('Failed to create backup:', err);
              } finally {
                setCreatingBackup(false);
              }
            }}
            disabled={creatingBackup}
          >
            {creatingBackup ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
        {backups.length === 0 ? (
          <p className="text-factorio-muted text-sm py-2">No backups yet.</p>
        ) : (
          <div className="border border-factorio-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-factorio-dark border-b border-factorio-border">
                  <th className="text-left px-4 py-2 text-factorio-muted font-medium">Date</th>
                  <th className="text-right px-4 py-2 text-factorio-muted font-medium">Saves</th>
                  <th className="text-right px-4 py-2 text-factorio-muted font-medium">Size</th>
                  <th className="text-right px-4 py-2 text-factorio-muted font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id} className="border-b border-factorio-border/50 hover:bg-factorio-panel/50">
                    <td className="px-4 py-2.5 text-factorio-text">{formatDate(backup.timestamp)}</td>
                    <td className="px-4 py-2.5 text-right text-factorio-muted">{backup.saveCount}</td>
                    <td className="px-4 py-2.5 text-right text-factorio-muted">{formatFileSize(backup.totalSizeBytes)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="btn-secondary text-xs !px-2 !py-1"
                          onClick={() => setRestoreTarget(backup)}
                        >
                          Restore
                        </button>
                        <button
                          className="btn-danger text-xs !px-2 !py-1"
                          onClick={() => setDeleteBackupTarget(backup)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Save"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmDanger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Overwrite confirmation dialog */}
      <ConfirmDialog
        open={overwriteTarget !== null}
        title="Overwrite Save"
        message={`A server save named "${overwriteTarget?.fileName}" already exists. Overwrite it?`}
        confirmLabel="Overwrite"
        confirmDanger
        onConfirm={handleOverwriteConfirm}
        onCancel={() => setOverwriteTarget(null)}
      />

      {/* Restore backup confirmation */}
      <ConfirmDialog
        open={restoreTarget !== null}
        title="Restore Backup"
        message={`Restore backup from ${restoreTarget ? formatDate(restoreTarget.timestamp) : ''}? This will overwrite matching save files in the server saves directory.`}
        confirmLabel="Restore"
        confirmDanger
        onConfirm={async () => {
          if (!restoreTarget) return;
          try {
            await window.electronAPI.backups.restore(restoreTarget.path);
            setRestoreTarget(null);
            await loadServerSaves();
          } catch (err) {
            console.error('Failed to restore backup:', err);
          }
        }}
        onCancel={() => setRestoreTarget(null)}
      />

      {/* Delete backup confirmation */}
      <ConfirmDialog
        open={deleteBackupTarget !== null}
        title="Delete Backup"
        message={`Delete backup from ${deleteBackupTarget ? formatDate(deleteBackupTarget.timestamp) : ''}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmDanger
        onConfirm={async () => {
          if (!deleteBackupTarget) return;
          try {
            await window.electronAPI.backups.delete(deleteBackupTarget.path);
            setDeleteBackupTarget(null);
            await loadBackups();
          } catch (err) {
            console.error('Failed to delete backup:', err);
          }
        }}
        onCancel={() => setDeleteBackupTarget(null)}
      />
    </div>
  );
}
