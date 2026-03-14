import path from 'path';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { readJsonList, writeJsonList, readBanList, writeBanList } from '../services/player-manager';
import type { BanEntry } from '../../shared/types';

function assertJsonFile(filePath: string): void {
  const resolved = path.resolve(filePath);
  if (!resolved.endsWith('.json')) {
    throw new Error('Invalid path: must be a .json file');
  }
}

export function registerPlayersIpc(): void {
  ipcMain.handle(IPC.PLAYERS_GET_ADMIN_LIST, async (_, filePath: string) => {
    assertJsonFile(filePath);
    return readJsonList(filePath);
  });

  ipcMain.handle(IPC.PLAYERS_SET_ADMIN_LIST, async (_, filePath: string, names: string[]) => {
    assertJsonFile(filePath);
    return writeJsonList(filePath, names);
  });

  ipcMain.handle(IPC.PLAYERS_GET_BAN_LIST, async (_, filePath: string) => {
    assertJsonFile(filePath);
    return readBanList(filePath);
  });

  ipcMain.handle(IPC.PLAYERS_SET_BAN_LIST, async (_, filePath: string, entries: BanEntry[]) => {
    assertJsonFile(filePath);
    return writeBanList(filePath, entries);
  });

  ipcMain.handle(IPC.PLAYERS_GET_WHITELIST, async (_, filePath: string) => {
    assertJsonFile(filePath);
    return readJsonList(filePath);
  });

  ipcMain.handle(IPC.PLAYERS_SET_WHITELIST, async (_, filePath: string, names: string[]) => {
    assertJsonFile(filePath);
    return writeJsonList(filePath, names);
  });
}
