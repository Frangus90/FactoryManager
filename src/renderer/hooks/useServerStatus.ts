import { useServerContext } from '../context/ServerContext';

export function useServerStatus() {
  const { status, start, stop } = useServerContext();
  return { status, start, stop };
}
