import { registerProfileIpc } from './profiles.ipc';
import { registerServerIpc } from './server.ipc';
import { registerConfigIpc } from './config.ipc';
import { registerSavesIpc } from './saves.ipc';
import { registerRconIpc } from './rcon.ipc';
import { registerModsIpc } from './mods.ipc';
import { registerPlayersIpc } from './players.ipc';
import { registerAppSettingsIpc } from './app-settings.ipc';
import { registerBackupsIpc } from './backups.ipc';
import { registerMapSettingsIpc } from './map-settings.ipc';
import { registerUpnpIpc } from './upnp.ipc';
import { registerModPortalIpc } from './mod-portal.ipc';

export function registerAllIpc(): void {
  registerProfileIpc();
  registerServerIpc();
  registerConfigIpc();
  registerSavesIpc();
  registerRconIpc();
  registerModsIpc();
  registerPlayersIpc();
  registerAppSettingsIpc();
  registerBackupsIpc();
  registerMapSettingsIpc();
  registerUpnpIpc();
  registerModPortalIpc();
}
