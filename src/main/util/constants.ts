import fs from 'fs';
import path from 'path';
import os from 'os';

export const DEFAULT_SERVER_PORT = 34197;
export const DEFAULT_RCON_PORT = 27015;

export const FACTORIO_EXE_RELATIVE = path.join('bin', 'x64', 'factorio.exe');
export const SAVES_DIR = 'saves';
export const MODS_DIR = 'mods';
export const MOD_LIST_FILE = 'mod-list.json';

export const CANDIDATE_FACTORIO_PATHS = [
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Factorio',
  'C:\\Program Files\\Factorio',
  path.join(os.homedir(), 'Factorio'),
];

/**
 * The %APPDATA%/Factorio directory used by Steam/installer versions of Factorio
 * to store user data (saves, mods, config, etc.).
 */
export const APPDATA_FACTORIO_PATH = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'Factorio',
);

/**
 * Resolve the correct user data directory for Factorio.
 *
 * - **Steam / installer** version: user data (saves, mods, configs) lives at
 *   `%APPDATA%\Factorio\`.
 * - **Portable / zip** version: user data lives inside the installation directory.
 *
 * We detect this by checking whether `%APPDATA%\Factorio` exists.
 */
export function resolveUserDataPath(factorioInstallPath: string): string {
  if (fs.existsSync(APPDATA_FACTORIO_PATH)) {
    return APPDATA_FACTORIO_PATH;
  }
  return factorioInstallPath;
}

export const STEAM_REGISTRY_KEY = 'HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam';
export const STEAM_INSTALL_VALUE = 'InstallPath';

export function generateRconPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
