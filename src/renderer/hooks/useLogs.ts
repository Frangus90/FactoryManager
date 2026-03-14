import { useServerContext } from '../context/ServerContext';

export function useLogs() {
  const { logs, clearLogs } = useServerContext();
  return { logs, clearLogs };
}
