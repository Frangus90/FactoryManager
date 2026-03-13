import { useState, useEffect, useCallback, useRef } from 'react';
import type { RconStatus } from '../../shared/types';

interface CommandHistoryEntry {
  command: string;
  response: string;
  timestamp: number;
}

export function useRcon() {
  const [rconStatus, setRconStatus] = useState<RconStatus>('disconnected');
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const historyIndexRef = useRef(-1);

  useEffect(() => {
    const unsub = window.electronAPI.rcon.onStatusChange(setRconStatus);
    return unsub;
  }, []);

  const connect = useCallback(async (host: string, port: number, password: string) => {
    await window.electronAPI.rcon.connect(host, port, password);
  }, []);

  const disconnect = useCallback(async () => {
    await window.electronAPI.rcon.disconnect();
  }, []);

  const send = useCallback(async (command: string) => {
    const response = await window.electronAPI.rcon.send(command);
    setHistory((prev) => [...prev, { command, response, timestamp: Date.now() }]);
    setCommandHistory((prev) => [...prev, command]);
    historyIndexRef.current = -1;
    return response;
  }, []);

  const getPreviousCommand = useCallback(() => {
    if (commandHistory.length === 0) return null;
    const newIndex = historyIndexRef.current === -1
      ? commandHistory.length - 1
      : Math.max(0, historyIndexRef.current - 1);
    historyIndexRef.current = newIndex;
    return commandHistory[newIndex];
  }, [commandHistory]);

  const getNextCommand = useCallback(() => {
    if (historyIndexRef.current === -1) return null;
    const newIndex = historyIndexRef.current + 1;
    if (newIndex >= commandHistory.length) {
      historyIndexRef.current = -1;
      return '';
    }
    historyIndexRef.current = newIndex;
    return commandHistory[newIndex];
  }, [commandHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    rconStatus,
    history,
    connect,
    disconnect,
    send,
    clearHistory,
    getPreviousCommand,
    getNextCommand,
  };
}
