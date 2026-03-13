import { useState, useEffect, useCallback, useRef } from 'react';
import type { LogEntry } from '../../shared/types';

const MAX_LOG_LINES = 10000;

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsRef = useRef<LogEntry[]>([]);

  useEffect(() => {
    const unsub = window.electronAPI.server.onLog((entry) => {
      logsRef.current = [...logsRef.current.slice(-(MAX_LOG_LINES - 1)), entry];
      setLogs(logsRef.current);
    });
    return unsub;
  }, []);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setLogs([]);
  }, []);

  return { logs, clearLogs };
}
