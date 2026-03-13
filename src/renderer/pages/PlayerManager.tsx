import React, { useState, useEffect, useCallback } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useUserDataPath } from '../hooks/useUserDataPath';
import { useRcon } from '../hooks/useRcon';
import { useServerStatus } from '../hooks/useServerStatus';
import type { BanEntry } from '../../shared/types';

type Tab = 'admins' | 'bans' | 'whitelist';

// ---------------------------------------------------------------------------
// Helper: Parse the Factorio /players command output into a list of names.
// The output typically looks like:
//   Online players (2):
//     player1 (online)
//     player2 (online)
// ---------------------------------------------------------------------------
function parsePlayersOutput(output: string): string[] {
  const lines = output.split('\n').map((l) => l.trim()).filter(Boolean);
  const players: string[] = [];
  for (const line of lines) {
    // Skip header lines
    if (line.toLowerCase().startsWith('online players')) continue;
    // Extract the player name (first word)
    const match = line.match(/^(\S+)/);
    if (match) players.push(match[1]);
  }
  return players;
}

export default function PlayerManager() {
  const { activeProfile } = useProfile();
  const userDataPath = useUserDataPath();
  const { status } = useServerStatus();
  const { rconStatus, send } = useRcon();

  const [activeTab, setActiveTab] = useState<Tab>('admins');

  // Admins state
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdmin, setNewAdmin] = useState('');
  const [adminsLoading, setAdminsLoading] = useState(false);

  // Bans state
  const [bans, setBans] = useState<BanEntry[]>([]);
  const [banUsername, setBanUsername] = useState('');
  const [banReason, setBanReason] = useState('');
  const [bansLoading, setBansLoading] = useState(false);

  // Whitelist state
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [newWhitelist, setNewWhitelist] = useState('');
  const [whitelistLoading, setWhitelistLoading] = useState(false);

  // Active players state
  const [activePlayers, setActivePlayers] = useState<string[]>([]);
  const [activePlayersLoading, setActivePlayersLoading] = useState(false);
  const [kickReasons, setKickReasons] = useState<Record<string, string>>({});

  const isRunning = status === 'running';
  const isRconConnected = rconStatus === 'connected';

  // ------ Path helpers ------
  // Player list files live in the user data directory (same as saves/mods).
  const getAdminPath = useCallback(() => {
    if (!activeProfile || !userDataPath) return '';
    return (
      activeProfile.adminListPath ||
      `${userDataPath}/server-adminlist.json`
    );
  }, [activeProfile, userDataPath]);

  const getBanPath = useCallback(() => {
    if (!activeProfile || !userDataPath) return '';
    return (
      activeProfile.banListPath ||
      `${userDataPath}/server-banlist.json`
    );
  }, [activeProfile, userDataPath]);

  const getWhitelistPath = useCallback(() => {
    if (!activeProfile || !userDataPath) return '';
    return (
      activeProfile.whitelistPath ||
      `${userDataPath}/server-whitelist.json`
    );
  }, [activeProfile, userDataPath]);

  // ------ Data loaders ------
  const loadAdmins = useCallback(async () => {
    const path = getAdminPath();
    if (!path) return;
    setAdminsLoading(true);
    try {
      const list = await window.electronAPI.players.getAdminList(path);
      setAdmins(list);
    } catch {
      setAdmins([]);
    } finally {
      setAdminsLoading(false);
    }
  }, [getAdminPath]);

  const loadBans = useCallback(async () => {
    const path = getBanPath();
    if (!path) return;
    setBansLoading(true);
    try {
      const list = await window.electronAPI.players.getBanList(path);
      setBans(list);
    } catch {
      setBans([]);
    } finally {
      setBansLoading(false);
    }
  }, [getBanPath]);

  const loadWhitelist = useCallback(async () => {
    const path = getWhitelistPath();
    if (!path) return;
    setWhitelistLoading(true);
    try {
      const list = await window.electronAPI.players.getWhitelist(path);
      setWhitelist(list);
    } catch {
      setWhitelist([]);
    } finally {
      setWhitelistLoading(false);
    }
  }, [getWhitelistPath]);

  const fetchActivePlayers = useCallback(async () => {
    if (!isRconConnected) return;
    setActivePlayersLoading(true);
    try {
      const response = await send('/players');
      setActivePlayers(parsePlayersOutput(response));
    } catch {
      setActivePlayers([]);
    } finally {
      setActivePlayersLoading(false);
    }
  }, [isRconConnected, send]);

  // Load data when the tab changes or profile changes
  useEffect(() => {
    if (!activeProfile) return;
    if (activeTab === 'admins') loadAdmins();
    else if (activeTab === 'bans') loadBans();
    else if (activeTab === 'whitelist') loadWhitelist();
  }, [activeTab, activeProfile, loadAdmins, loadBans, loadWhitelist]);

  // ------ Admin actions ------
  const handleAddAdmin = async () => {
    const name = newAdmin.trim();
    if (!name) return;
    const updatedAdmins = [...admins, name];
    try {
      await window.electronAPI.players.setAdminList(getAdminPath(), updatedAdmins);
      if (isRunning && isRconConnected) {
        await send(`/promote ${name}`);
      }
      setNewAdmin('');
      await loadAdmins();
    } catch (err) {
      console.error('Failed to add admin:', err);
    }
  };

  const handleRemoveAdmin = async (name: string) => {
    const updatedAdmins = admins.filter((a) => a !== name);
    try {
      await window.electronAPI.players.setAdminList(getAdminPath(), updatedAdmins);
      if (isRunning && isRconConnected) {
        await send(`/demote ${name}`);
      }
      await loadAdmins();
    } catch (err) {
      console.error('Failed to remove admin:', err);
    }
  };

  // ------ Ban actions ------
  const handleBan = async () => {
    const name = banUsername.trim();
    if (!name) return;
    const entry: BanEntry = { username: name, reason: banReason.trim() || undefined };
    const updatedBans = [...bans, entry];
    try {
      await window.electronAPI.players.setBanList(getBanPath(), updatedBans);
      if (isRunning && isRconConnected) {
        const cmd = banReason.trim()
          ? `/ban ${name} ${banReason.trim()}`
          : `/ban ${name}`;
        await send(cmd);
      }
      setBanUsername('');
      setBanReason('');
      await loadBans();
    } catch (err) {
      console.error('Failed to ban player:', err);
    }
  };

  const handleUnban = async (username: string) => {
    const updatedBans = bans.filter((b) => b.username !== username);
    try {
      await window.electronAPI.players.setBanList(getBanPath(), updatedBans);
      if (isRunning && isRconConnected) {
        await send(`/unban ${username}`);
      }
      await loadBans();
    } catch (err) {
      console.error('Failed to unban player:', err);
    }
  };

  // ------ Whitelist actions ------
  const handleAddWhitelist = async () => {
    const name = newWhitelist.trim();
    if (!name) return;
    const updatedList = [...whitelist, name];
    try {
      await window.electronAPI.players.setWhitelist(getWhitelistPath(), updatedList);
      if (isRunning && isRconConnected) {
        await send(`/whitelist add ${name}`);
      }
      setNewWhitelist('');
      await loadWhitelist();
    } catch (err) {
      console.error('Failed to add to whitelist:', err);
    }
  };

  const handleRemoveWhitelist = async (name: string) => {
    const updatedList = whitelist.filter((w) => w !== name);
    try {
      await window.electronAPI.players.setWhitelist(getWhitelistPath(), updatedList);
      if (isRunning && isRconConnected) {
        await send(`/whitelist remove ${name}`);
      }
      await loadWhitelist();
    } catch (err) {
      console.error('Failed to remove from whitelist:', err);
    }
  };

  // ------ Kick action ------
  const handleKick = async (playerName: string) => {
    const reason = kickReasons[playerName]?.trim() || '';
    const cmd = reason
      ? `/kick ${playerName} ${reason}`
      : `/kick ${playerName}`;
    try {
      await send(cmd);
      setKickReasons((prev) => {
        const next = { ...prev };
        delete next[playerName];
        return next;
      });
      await fetchActivePlayers();
    } catch (err) {
      console.error('Failed to kick player:', err);
    }
  };

  if (!activeProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-factorio-muted">No active profile selected.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'admins', label: 'Admins' },
    { key: 'bans', label: 'Bans' },
    { key: 'whitelist', label: 'Whitelist' },
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold text-factorio-text mb-4">Player Management</h2>

      {/* Tabs */}
      <div className="flex border-b border-factorio-border mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'text-factorio-orange border-factorio-orange'
                : 'text-factorio-muted border-transparent hover:text-factorio-text'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* -------- Admins Tab -------- */}
        {activeTab === 'admins' && (
          <div>
            {/* Add admin form */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                className="input flex-1"
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                placeholder="Username"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAdmin();
                }}
              />
              <button
                className="btn-primary"
                onClick={handleAddAdmin}
                disabled={!newAdmin.trim()}
              >
                Add Admin
              </button>
            </div>

            {/* Admin list */}
            {adminsLoading ? (
              <p className="text-factorio-muted text-sm">Loading...</p>
            ) : admins.length === 0 ? (
              <p className="text-factorio-muted text-sm">No admins configured.</p>
            ) : (
              <div className="space-y-1">
                {admins.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between px-3 py-2 bg-factorio-darker rounded border border-factorio-border/50"
                  >
                    <span className="text-sm text-factorio-text">{name}</span>
                    <button
                      className="btn-danger text-xs !px-2 !py-1"
                      onClick={() => handleRemoveAdmin(name)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* -------- Bans Tab -------- */}
        {activeTab === 'bans' && (
          <div>
            {/* Ban form */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                className="input w-48"
                value={banUsername}
                onChange={(e) => setBanUsername(e.target.value)}
                placeholder="Username"
              />
              <input
                type="text"
                className="input flex-1"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason (optional)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBan();
                }}
              />
              <button
                className="btn-danger"
                onClick={handleBan}
                disabled={!banUsername.trim()}
              >
                Ban Player
              </button>
            </div>

            {/* Ban list */}
            {bansLoading ? (
              <p className="text-factorio-muted text-sm">Loading...</p>
            ) : bans.length === 0 ? (
              <p className="text-factorio-muted text-sm">No banned players.</p>
            ) : (
              <div className="space-y-1">
                {bans.map((entry) => (
                  <div
                    key={entry.username}
                    className="flex items-center justify-between px-3 py-2 bg-factorio-darker rounded border border-factorio-border/50"
                  >
                    <div className="min-w-0">
                      <span className="text-sm text-factorio-text">
                        {entry.username}
                      </span>
                      {entry.reason && (
                        <span className="text-xs text-factorio-muted ml-2">
                          -- {entry.reason}
                        </span>
                      )}
                    </div>
                    <button
                      className="btn-secondary text-xs !px-2 !py-1 shrink-0"
                      onClick={() => handleUnban(entry.username)}
                    >
                      Unban
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* -------- Whitelist Tab -------- */}
        {activeTab === 'whitelist' && (
          <div>
            {/* Add to whitelist form */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                className="input flex-1"
                value={newWhitelist}
                onChange={(e) => setNewWhitelist(e.target.value)}
                placeholder="Username"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddWhitelist();
                }}
              />
              <button
                className="btn-primary"
                onClick={handleAddWhitelist}
                disabled={!newWhitelist.trim()}
              >
                Add Player
              </button>
            </div>

            {/* Whitelist */}
            {whitelistLoading ? (
              <p className="text-factorio-muted text-sm">Loading...</p>
            ) : whitelist.length === 0 ? (
              <p className="text-factorio-muted text-sm">Whitelist is empty.</p>
            ) : (
              <div className="space-y-1">
                {whitelist.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between px-3 py-2 bg-factorio-darker rounded border border-factorio-border/50"
                  >
                    <span className="text-sm text-factorio-text">{name}</span>
                    <button
                      className="btn-danger text-xs !px-2 !py-1"
                      onClick={() => handleRemoveWhitelist(name)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* -------- Active Players (shown when server running) -------- */}
      {isRunning && (
        <div className="mt-4 pt-4 border-t border-factorio-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-factorio-text">
              Active Players
              {activePlayers.length > 0 && (
                <span className="text-factorio-muted font-normal ml-2">
                  ({activePlayers.length})
                </span>
              )}
            </h3>
            <button
              className="btn-secondary text-xs !px-2 !py-1"
              onClick={fetchActivePlayers}
              disabled={activePlayersLoading || !isRconConnected}
            >
              {activePlayersLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {!isRconConnected ? (
            <p className="text-factorio-muted text-xs">
              Connect to RCON to view active players.
            </p>
          ) : activePlayers.length === 0 ? (
            <p className="text-factorio-muted text-xs">
              No players online, or press Refresh to fetch the player list.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {activePlayers.map((player) => (
                <div
                  key={player}
                  className="flex items-center gap-2 px-3 py-2 bg-factorio-darker rounded border border-factorio-border/50"
                >
                  <span className="flex-1 text-sm text-factorio-text">
                    {player}
                  </span>
                  <input
                    type="text"
                    className="input text-xs !py-1 w-36"
                    placeholder="Kick reason"
                    value={kickReasons[player] || ''}
                    onChange={(e) =>
                      setKickReasons((prev) => ({
                        ...prev,
                        [player]: e.target.value,
                      }))
                    }
                  />
                  <button
                    className="btn-danger text-xs !px-2 !py-1"
                    onClick={() => handleKick(player)}
                  >
                    Kick
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
