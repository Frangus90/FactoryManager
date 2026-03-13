import { registerProfileIpc } from './profiles.ipc';
import { registerServerIpc } from './server.ipc';
import { registerConfigIpc } from './config.ipc';
import { registerSavesIpc } from './saves.ipc';
import { registerRconIpc } from './rcon.ipc';
import { registerModsIpc } from './mods.ipc';
import { registerPlayersIpc } from './players.ipc';

export function registerAllIpc(): void {
  registerProfileIpc();
  registerServerIpc();
  registerConfigIpc();
  registerSavesIpc();
  registerRconIpc();
  registerModsIpc();
  registerPlayersIpc();
}
