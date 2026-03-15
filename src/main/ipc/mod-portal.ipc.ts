import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { getCredentials, setManualCredentials, clearCredentials } from '../services/mod-auth';
import { fetchCatalog, fetchModDetails, downloadMod, checkUpdates } from '../services/mod-portal';
import { listMods } from '../services/mod-manager';
import type { ModPortalAuth, PortalRelease } from '../../shared/types';

export function registerModPortalIpc(): void {
  ipcMain.handle(IPC.MOD_PORTAL_GET_AUTH, async () => {
    return getCredentials();
  });

  ipcMain.handle(IPC.MOD_PORTAL_SET_AUTH, async (_, username: string, token: string) => {
    setManualCredentials(username, token);
  });

  ipcMain.handle(IPC.MOD_PORTAL_CLEAR_AUTH, async () => {
    clearCredentials();
  });

  ipcMain.handle(IPC.MOD_PORTAL_FETCH_CATALOG, async (_, factorioVersion: string) => {
    return fetchCatalog(factorioVersion);
  });

  ipcMain.handle(IPC.MOD_PORTAL_FETCH_DETAILS, async (_, modName: string) => {
    return fetchModDetails(modName);
  });

  ipcMain.handle(
    IPC.MOD_PORTAL_DOWNLOAD,
    async (_, modName: string, release: PortalRelease, modsDir: string) => {
      const auth = await getCredentials();
      if (!auth) {
        throw new Error('No mod portal credentials configured. Please log in first.');
      }
      return downloadMod(modName, release, modsDir, auth);
    },
  );

  ipcMain.handle(
    IPC.MOD_PORTAL_CHECK_UPDATES,
    async (_, modsDir: string, factorioVersion: string) => {
      const installed = await listMods(modsDir);
      return checkUpdates(installed, factorioVersion);
    },
  );
}
