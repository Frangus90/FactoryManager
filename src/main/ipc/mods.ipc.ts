import path from 'path';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { listMods, setModEnabled, deleteMod } from '../services/mod-manager';
import { APPDATA_FACTORIO_PATH } from '../util/constants';

function assertIsModsDir(modsDir: string): void {
  const resolved = path.resolve(modsDir);
  const allowed = path.resolve(APPDATA_FACTORIO_PATH);
  if (!resolved.startsWith(allowed + path.sep) && resolved !== allowed) {
    throw new Error('Invalid mods directory: outside allowed paths');
  }
}

export function registerModsIpc(): void {
  ipcMain.handle(IPC.MODS_LIST, async (_, modsDir: string) => {
    assertIsModsDir(modsDir);
    return listMods(modsDir);
  });

  ipcMain.handle(IPC.MODS_SET_ENABLED, async (_, modsDir: string, modName: string, enabled: boolean) => {
    assertIsModsDir(modsDir);
    return setModEnabled(modsDir, modName, enabled);
  });

  ipcMain.handle(IPC.MODS_DELETE, async (_, modsDir: string, fileName: string) => {
    assertIsModsDir(modsDir);
    return deleteMod(modsDir, fileName);
  });
}
