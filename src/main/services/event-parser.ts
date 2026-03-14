import type { ServerEvent } from '../../shared/types';

const JOIN_PATTERN = /\[JOIN\]\s+(.+)\s+joined the game/;
const LEAVE_PATTERN = /\[LEAVE\]\s+(.+)\s+left the game/;
const CHAT_PATTERN = /\[CHAT\]\s+(\S+):\s+(.*)/;

export function parseServerEvent(line: string): ServerEvent | null {
  const join = line.match(JOIN_PATTERN);
  if (join) return { type: 'join', player: join[1].trim(), timestamp: Date.now() };

  const leave = line.match(LEAVE_PATTERN);
  if (leave) return { type: 'leave', player: leave[1].trim(), timestamp: Date.now() };

  const chat = line.match(CHAT_PATTERN);
  if (chat) return { type: 'chat', player: chat[1], message: chat[2], timestamp: Date.now() };

  return null;
}
