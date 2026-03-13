import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import type { ModInfo } from '../../shared/types';
import { MOD_LIST_FILE } from '../util/constants';

interface ModListEntry {
  name: string;
  enabled: boolean;
}

interface ModListJson {
  mods: ModListEntry[];
}

interface ModInfoJson {
  name: string;
  version: string;
  title: string;
  author: string;
  description?: string;
  factorio_version?: string;
  dependencies?: string[];
}

async function readModList(modsDir: string): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  try {
    const raw = await fs.readFile(path.join(modsDir, MOD_LIST_FILE), 'utf-8');
    const data: ModListJson = JSON.parse(raw);
    for (const entry of data.mods) {
      map.set(entry.name, entry.enabled);
    }
  } catch {
    // mod-list.json doesn't exist or is invalid
  }
  return map;
}

function readModInfoFromZip(zipPath: string): ModInfoJson | null {
  try {
    const zip = new AdmZip(zipPath);
    // info.json is inside a top-level folder with the mod name
    const entries = zip.getEntries();
    for (const entry of entries) {
      if (entry.entryName.endsWith('/info.json') || entry.entryName === 'info.json') {
        const content = entry.getData().toString('utf-8');
        return JSON.parse(content);
      }
    }
  } catch {
    // corrupt or unreadable zip
  }
  return null;
}

async function readModInfoFromDir(dirPath: string): Promise<ModInfoJson | null> {
  try {
    const raw = await fs.readFile(path.join(dirPath, 'info.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function listMods(modsDir: string): Promise<ModInfo[]> {
  const enabledMap = await readModList(modsDir);
  const mods: ModInfo[] = [];

  try {
    const entries = await fs.readdir(modsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === MOD_LIST_FILE) continue;

      let info: ModInfoJson | null = null;
      const fullPath = path.join(modsDir, entry.name);

      if (entry.isFile() && entry.name.endsWith('.zip')) {
        info = readModInfoFromZip(fullPath);
      } else if (entry.isDirectory()) {
        info = await readModInfoFromDir(fullPath);
      }

      if (info) {
        mods.push({
          name: info.name,
          title: info.title || info.name,
          version: info.version || '?',
          author: info.author || 'Unknown',
          description: info.description || '',
          enabled: enabledMap.get(info.name) ?? true,
          factorioVersion: info.factorio_version || '',
          fileName: entry.name,
          dependencies: info.dependencies || [],
        });
      }
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  mods.sort((a, b) => a.title.localeCompare(b.title));
  return mods;
}

export async function setModEnabled(modsDir: string, modName: string, enabled: boolean): Promise<void> {
  const modListPath = path.join(modsDir, MOD_LIST_FILE);
  let data: ModListJson;

  try {
    const raw = await fs.readFile(modListPath, 'utf-8');
    data = JSON.parse(raw);
  } catch {
    data = { mods: [{ name: 'base', enabled: true }] };
  }

  const existing = data.mods.find((m) => m.name === modName);
  if (existing) {
    existing.enabled = enabled;
  } else {
    data.mods.push({ name: modName, enabled });
  }

  await fs.writeFile(modListPath, JSON.stringify(data, null, 2), 'utf-8');
}
