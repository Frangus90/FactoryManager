import path from 'path';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { readJsonList, writeJsonList, readBanList, writeBanList } from '../services/player-manager';
import type { BanEntry } from '../../shared/types';

const ALLOWED_PLAYER_FILES = new Set([
  'server-adminlist.json',
  'server-banlist.json',
  'server-whitelist.json',
]);

function assertAllowedPlayerFile(filePath: string): void {
  const resolved = path.resolve(filePath);
  const baseName = path.basename(resolved);
  if (!ALLOWED_PLAYER_FILES.has(baseName)) {
    throw new Error(`Invalid path: unexpected file name "${baseName}"`);
  }
}

export function registerPlayersIpc(): void {
  ipcMain.handle(IPC.PLAYERS_GET_ADMIN_LIST, async (_, filePath: string) => {
    assertAllowedPlayerFile(filePath);
    return readJsonList(filePath);
  });

  ipcMain.handle(IPC.PLAYERS_SET_ADMIN_LIST, async (_, filePath: string, names: string[]) => {
    assertAllowedPlayerFile(filePath);
    return writeJsonList(filePath, names);
  });

  ipcMain.handle(IPC.PLAYERS_GET_BAN_LIST, async (_, filePath: string) => {
    assertAllowedPlayerFile(filePath);
    return readBanList(filePath);
  });

  ipcMain.handle(IPC.PLAYERS_SET_BAN_LIST, async (_, filePath: string, entries: BanEntry[]) => {
    assertAllowedPlayerFile(filePath);
    return writeBanList(filePath, entries);
  });

  ipcMain.handle(IPC.PLAYERS_GET_WHITELIST, async (_, filePath: string) => {
    assertAllowedPlayerFile(filePath);
    return readJsonList(filePath);
  });

  ipcMain.handle(IPC.PLAYERS_SET_WHITELIST, async (_, filePath: string, names: string[]) => {
    assertAllowedPlayerFile(filePath);
    return writeJsonList(filePath, names);
  });
}
