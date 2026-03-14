import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ServerStatus, LogEntry } from '../../shared/types';

const MAX_LOG_LINES = 10000;

interface ServerContextValue {
  status: ServerStatus;
  logs: LogEntry[];
  clearLogs: () => void;
  start: (profileId: string) => Promise<void>;
  stop: () => Promise<void>;
  startedAt: number | null;
}

const ServerContext = createContext<ServerContextValue | null>(null);

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ServerStatus>('stopped');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsRef = useRef<LogEntry[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const prevStatus = useRef<ServerStatus>('stopped');
  const initialized = useRef(false);

  // Fetch initial status and subscribe to changes
  useEffect(() => {
    window.electronAPI.server.getStatus().then((s) => {
      setStatus(s);
      // If server is already running on mount, start uptime from now
      if (s === 'running') {
        setStartedAt(Date.now());
      }
      initialized.current = true;
    });

    const unsub = window.electronAPI.server.onStatusChange((s) => {
      setStatus(s);
    });
    return unsub;
  }, []);

  // Track status transitions for startedAt
  useEffect(() => {
    if (!initialized.current) return;

    if (status === 'running' && prevStatus.current !== 'running') {
      setStartedAt(Date.now());
    }
    if (status === 'stopped' || status === 'errored') {
      setStartedAt(null);
    }
    prevStatus.current = status;
  }, [status]);

  // Subscribe to log events — persists across route changes
  useEffect(() => {
    let rafId: number | null = null;

    const unsub = window.electronAPI.server.onLog((entry) => {
      const arr = logsRef.current;
      arr.push(entry);
      // Trim in-place if over limit
      if (arr.length > MAX_LOG_LINES) {
        logsRef.current = arr.slice(-MAX_LOG_LINES);
      }
      // Coalesce renders via rAF — one render per frame max
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          setLogs([...logsRef.current]);
        });
      }
    });

    return () => {
      unsub();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setLogs([]);
  }, []);

  const start = useCallback(async (profileId: string) => {
    await window.electronAPI.server.start(profileId);
  }, []);

  const stop = useCallback(async () => {
    await window.electronAPI.server.stop();
  }, []);

  return (
    <ServerContext.Provider value={{ status, logs, clearLogs, start, stop, startedAt }}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServerContext(): ServerContextValue {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error('useServerContext must be used within ServerProvider');
  return ctx;
}
