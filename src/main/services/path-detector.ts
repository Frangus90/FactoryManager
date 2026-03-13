import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { CANDIDATE_FACTORIO_PATHS, FACTORIO_EXE_RELATIVE, STEAM_REGISTRY_KEY, STEAM_INSTALL_VALUE } from '../util/constants';

function isValidFactorioPath(dir: string): boolean {
  try {
    const exePath = path.join(dir, FACTORIO_EXE_RELATIVE);
    return fs.existsSync(exePath);
  } catch {
    return false;
  }
}

function getSteamPathFromRegistry(): string | null {
  try {
    const output = execSync(
      `reg query "${STEAM_REGISTRY_KEY}" /v ${STEAM_INSTALL_VALUE}`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    const match = output.match(/InstallPath\s+REG_SZ\s+(.+)/);
    if (match) {
      const steamPath = match[1].trim();
      const factorioPath = path.join(steamPath, 'steamapps', 'common', 'Factorio');
      if (isValidFactorioPath(factorioPath)) {
        return factorioPath;
      }
      // Check for library folders
      try {
        const libraryFolders = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
        const content = fs.readFileSync(libraryFolders, 'utf-8');
        const pathMatches = content.matchAll(/"path"\s+"([^"]+)"/g);
        for (const m of pathMatches) {
          const libPath = m[1].replace(/\\\\/g, '\\');
          const candidate = path.join(libPath, 'steamapps', 'common', 'Factorio');
          if (isValidFactorioPath(candidate)) {
            return candidate;
          }
        }
      } catch {
        // library folders parsing failed, skip
      }
    }
  } catch {
    // registry query failed
  }
  return null;
}

export function detectFactorioPath(): string | null {
  // Check hardcoded candidate paths first
  for (const candidate of CANDIDATE_FACTORIO_PATHS) {
    if (isValidFactorioPath(candidate)) {
      return candidate;
    }
  }

  // Try Steam registry
  const steamPath = getSteamPathFromRegistry();
  if (steamPath) return steamPath;

  return null;
}

export function validateFactorioPath(dir: string): boolean {
  return isValidFactorioPath(dir);
}
