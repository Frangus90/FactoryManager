import { useState, useEffect, useCallback } from 'react';
import type { ServerStatus } from '../../shared/types';

export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>('stopped');

  useEffect(() => {
    // Get initial status
    window.electronAPI.server.getStatus().then(setStatus);

    // Subscribe to status changes
    const unsub = window.electronAPI.server.onStatusChange(setStatus);
    return unsub;
  }, []);

  const start = useCallback(async (profileId: string) => {
    await window.electronAPI.server.start(profileId);
  }, []);

  const stop = useCallback(async () => {
    await window.electronAPI.server.stop();
  }, []);

  return { status, start, stop };
}
