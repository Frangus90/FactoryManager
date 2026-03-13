import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { listMods, setModEnabled } from '../services/mod-manager';

export function registerModsIpc(): void {
  ipcMain.handle(IPC.MODS_LIST, async (_, modsDir: string) => {
    return listMods(modsDir);
  });

  ipcMain.handle(IPC.MODS_SET_ENABLED, async (_, modsDir: string, modName: string, enabled: boolean) => {
    return setModEnabled(modsDir, modName, enabled);
  });
}
