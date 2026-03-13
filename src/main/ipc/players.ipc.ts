import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { readJsonList, writeJsonList, readBanList, writeBanList } from '../services/player-manager';
import type { BanEntry } from '../../shared/types';

export function registerPlayersIpc(): void {
  ipcMain.handle(IPC.PLAYERS_GET_ADMIN_LIST, async (_, filePath: string) => {
    return readJsonList(filePath);
  });

  ipcMain.handle(IPC.PLAYERS_SET_ADMIN_LIST, async (_, filePath: string, names: string[]) => {
    return writeJsonList(filePath, names);
  });

  ipcMain.handle(IPC.PLAYERS_GET_BAN_LIST, async (_, filePath: string) => {
    return readBanList(filePath);
  });

  ipcMain.handle(IPC.PLAYERS_SET_BAN_LIST, async (_, filePath: string, entries: BanEntry[]) => {
    return writeBanList(filePath, entries);
  });

  ipcMain.handle(IPC.PLAYERS_GET_WHITELIST, async (_, filePath: string) => {
    return readJsonList(filePath);
  });

  ipcMain.handle(IPC.PLAYERS_SET_WHITELIST, async (_, filePath: string, names: string[]) => {
    return writeJsonList(filePath, names);
  });
}
