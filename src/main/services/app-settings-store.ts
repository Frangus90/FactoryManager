import Store from 'electron-store';
import type { AppSettings } from '../../shared/types';

const defaults: AppSettings = {
  closeToTray: false,
  autoStartServer: false,
  notificationsEnabled: true,
  notifyOnStart: true,
  notifyOnStop: true,
  notifyOnCrash: true,
  notifyOnPlayerJoin: true,
  backupEnabled: false,
  backupBeforeStart: true,
  maxBackups: 10,
  backupDir: null,
  upnpEnabled: false,
};

const store = new Store<{ appSettings: AppSettings }>({
  name: 'app-settings',
  defaults: { appSettings: defaults },
});

export function getAppSettings(): AppSettings {
  return { ...defaults, ...store.get('appSettings') };
}

export function updateAppSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const updated = { ...current, ...partial };
  store.set('appSettings', updated);
  return updated;
}
