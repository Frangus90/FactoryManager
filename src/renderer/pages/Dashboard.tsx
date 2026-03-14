import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { LogEntry } from '../../shared/types';
import StatusIndicator from '../components/StatusIndicator';
import { useServerStatus } from '../hooks/useServerStatus';
import { useProfile } from '../context/ProfileContext';
import { useLogs } from '../hooks/useLogs';
import { useServerContext } from '../context/ServerContext';

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0'),
  ].join(':');
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return [
    d.getHours().toString().padStart(2, '0'),
    d.getMinutes().toString().padStart(2, '0'),
    d.getSeconds().toString().padStart(2, '0'),
  ].join(':');
}

export default function Dashboard() {
  const { status, start, stop } = useServerStatus();
  const { activeProfile } = useProfile();
  const { logs } = useLogs();
  const { startedAt } = useServerContext();

  // ---- Uptime display (re-renders every second while running) ----
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setUptime(0);
      return;
    }
    // Immediately compute current uptime
    setUptime(Math.floor((Date.now() - startedAt) / 1000));
    const id = setInterval(() => {
      setUptime(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // ---- IPs for the server address card ----
  const [localIp, setLocalIp] = useState<string | null>(null);
  const [publicIp, setPublicIp] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.util.getLocalIp().then(setLocalIp).catch(() => setLocalIp(null));
    window.electronAPI.util.getPublicIp().then(setPublicIp).catch(() => setPublicIp(null));
  }, []);

  const port = activeProfile?.serverPort;
  const localAddress = localIp && port ? `${localIp}:${port}` : null;
  const publicAddress = publicIp && port ? `${publicIp}:${port}` : null;

  const [localCopyLabel, setLocalCopyLabel] = useState('Copy');
  const [publicCopyLabel, setPublicCopyLabel] = useState('Copy');
  const copyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => copyTimers.current.forEach(clearTimeout);
  }, []);

  const copyToClipboard = useCallback(async (text: string, setSetter: (v: string) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setSetter('Copied!');
      const t = setTimeout(() => setSetter('Copy'), 2000);
      copyTimers.current.push(t);
    } catch {
      setSetter('Failed');
      const t = setTimeout(() => setSetter('Copy'), 2000);
      copyTimers.current.push(t);
    }
  }, []);

  // ---- Recent logs (last 20) ----
  const recentLogs = logs.slice(-20);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [recentLogs.length]);

  // ---- Error toast ----
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // ---- Handlers ----
  const handleStart = useCallback(async () => {
    if (!activeProfile) return;
    try {
      await start(activeProfile.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start server');
    }
  }, [activeProfile, start]);

  const handleStop = useCallback(async () => {
    try {
      await stop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop server');
    }
  }, [stop]);

  const [restarting, setRestarting] = useState(false);
  const handleRestart = useCallback(async () => {
    if (!activeProfile) return;
    setRestarting(true);
    try {
      await stop();
      await start(activeProfile.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart server');
    } finally {
      setRestarting(false);
    }
  }, [activeProfile, stop, start]);

  // ---- Copy logs to clipboard ----
  const [copyLabel, setCopyLabel] = useState('Copy');
  const handleCopyLogs = useCallback(async () => {
    const text = recentLogs
      .map((e) => `[${formatTimestamp(e.timestamp)}] ${e.text}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel('Copied!');
      const t = setTimeout(() => setCopyLabel('Copy'), 2000);
      copyTimers.current.push(t);
    } catch {
      setCopyLabel('Failed');
      const t = setTimeout(() => setCopyLabel('Copy'), 2000);
      copyTimers.current.push(t);
    }
  }, [recentLogs]);

  const isStartDisabled = !activeProfile || status === 'running' || status === 'starting' || status === 'stopping' || restarting;
  const isStopDisabled = status === 'stopped' || status === 'stopping' || status === 'errored' || restarting;
  const isRestartDisabled = status !== 'running' || restarting;

  // ---- No profile warning ----
  if (!activeProfile) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-factorio-text">Dashboard</h2>
        <div className="card">
          <div className="flex items-center gap-3 text-yellow-400">
            <svg
              className="w-6 h-6 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium">No profile configured</p>
              <p className="text-sm text-factorio-muted mt-1">
                Create a server profile in Settings before starting the server.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error toast */}
      {error && (
        <div className="toast-error flex items-center justify-between">
          <span>{error}</span>
          <button className="text-red-400 hover:text-red-200 ml-4" onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-factorio-text">Dashboard</h2>
      </div>

      {/* Status + Controls row */}
      <div className="card">
        <div className="flex items-center justify-between">
          {/* Large status indicator */}
          <div className="flex items-center gap-4">
            <StatusIndicator status={status} size="lg" />
            {status === 'running' && (
              <span className="text-sm text-factorio-muted ml-2">
                Uptime: {formatUptime(uptime)}
              </span>
            )}
          </div>

          {/* Start / Stop buttons */}
          <div className="flex items-center gap-3">
            <button
              className="btn-primary"
              disabled={isStartDisabled}
              onClick={handleStart}
            >
              Start Server
            </button>
            <button
              className="btn-secondary"
              disabled={isRestartDisabled}
              onClick={handleRestart}
            >
              {restarting ? 'Restarting...' : 'Restart'}
            </button>
            <button
              className="btn-danger"
              disabled={isStopDisabled}
              onClick={handleStop}
            >
              Stop Server
            </button>
          </div>
        </div>
      </div>

      {/* Server address — shown when running */}
      {status === 'running' && localAddress && (
        <div className="card">
          <h3 className="text-sm font-semibold text-factorio-orange mb-3 uppercase tracking-wide">
            Server Address
          </h3>
          <div className="space-y-2">
            {/* Local IP */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-factorio-muted w-14 shrink-0 uppercase tracking-wide">Local</span>
              <code className="flex-1 bg-factorio-darker border border-factorio-border px-4 py-2.5 text-factorio-text font-mono text-lg select-all">
                {localAddress}
              </code>
              <button className="btn-primary shrink-0" onClick={() => copyToClipboard(localAddress, setLocalCopyLabel)}>
                {localCopyLabel}
              </button>
            </div>
            {/* Public IP */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-factorio-muted w-14 shrink-0 uppercase tracking-wide">Public</span>
              {publicAddress ? (
                <>
                  <code className="flex-1 bg-factorio-darker border border-factorio-border px-4 py-2.5 text-factorio-text font-mono text-lg select-all">
                    {publicAddress}
                  </code>
                  <button className="btn-primary shrink-0" onClick={() => copyToClipboard(publicAddress, setPublicCopyLabel)}>
                    {publicCopyLabel}
                  </button>
                </>
              ) : (
                <span className="flex-1 text-factorio-muted text-sm italic">Could not detect public IP</span>
              )}
            </div>
          </div>
          <p className="text-xs text-factorio-muted mt-3">
            Share the <strong>local</strong> address with friends on your LAN. For
            internet play, share the <strong>public</strong> address and make sure
            UDP port {activeProfile.serverPort} is forwarded on your router.
          </p>
        </div>
      )}

      {/* Profile info */}
      <div className="card">
        <h3 className="text-sm font-semibold text-factorio-orange mb-3 uppercase tracking-wide">
          Active Profile
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="label">Profile Name</span>
            <p className="text-factorio-text font-medium">{activeProfile.name}</p>
          </div>
          <div className="min-w-0">
            <span className="label">Selected Save</span>
            <p className="text-factorio-text font-medium truncate">
              {activeProfile.selectedSave
                ? activeProfile.selectedSave.replace(/^.*[\\/]/, '').replace(/\.zip$/, '')
                : (
                  <span className="text-factorio-muted italic">
                    {activeProfile.useLatestSave ? 'Latest save' : 'None selected'}
                  </span>
                )}
            </p>
          </div>
          <div>
            <span className="label">RCON Port</span>
            <p className="text-factorio-text font-medium">{activeProfile.rconPort}</p>
          </div>
        </div>

        {/* Warning if no save selected and not using latest */}
        {!activeProfile.selectedSave && !activeProfile.useLatestSave && (
          <div className="mt-3 flex items-center gap-2 text-yellow-400 text-sm">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>No save file selected. Select a save in the Saves page before starting.</span>
          </div>
        )}
      </div>

      {/* Recent logs */}
      <div className="card flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-factorio-orange uppercase tracking-wide">
            Recent Logs
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-factorio-muted">
              Last {recentLogs.length} line{recentLogs.length !== 1 ? 's' : ''}
            </span>
            <button
              className="btn-secondary text-xs !px-2 !py-1"
              onClick={handleCopyLogs}
              disabled={recentLogs.length === 0}
            >
              {copyLabel}
            </button>
          </div>
        </div>
        <div className="bg-factorio-darker border border-factorio-border p-3 h-64 overflow-y-auto font-mono text-xs leading-relaxed">
          {recentLogs.length === 0 ? (
            <p className="text-factorio-muted italic">No log output yet.</p>
          ) : (
            recentLogs.map((entry: LogEntry, i: number) => (
              <div key={i} className="flex gap-2 whitespace-pre-wrap break-all">
                <span className="text-factorio-muted shrink-0 select-none">
                  {formatTimestamp(entry.timestamp)}
                </span>
                <span
                  className={
                    entry.stream === 'stderr'
                      ? 'text-red-400'
                      : 'text-factorio-text'
                  }
                >
                  {entry.text}
                </span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
