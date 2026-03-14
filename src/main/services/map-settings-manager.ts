import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';

function serverDataDir(): string {
  return path.join(app.getPath('userData'), 'server-data');
}

export function getMapSettingsPath(): string {
  return path.join(serverDataDir(), 'map-settings.json');
}

export function getMapGenSettingsPath(): string {
  return path.join(serverDataDir(), 'map-gen-settings.json');
}

export async function readJsonFile<T>(filePath: string, defaults: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return { ...defaults, ...JSON.parse(raw) } as T;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { ...defaults };
    throw err;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
