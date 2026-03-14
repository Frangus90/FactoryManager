import fs from 'fs/promises';
import type { ServerSettings } from '../../shared/types';
import { DEFAULT_SERVER_SETTINGS } from '../../shared/server-settings.schema';

export async function readServerSettings(filePath: string): Promise<ServerSettings> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SERVER_SETTINGS,
      ...parsed,
      visibility: { ...DEFAULT_SERVER_SETTINGS.visibility, ...parsed.visibility },
    };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...DEFAULT_SERVER_SETTINGS };
    }
    throw err;
  }
}

export async function writeServerSettings(filePath: string, settings: ServerSettings): Promise<void> {
  const json = JSON.stringify(settings, null, 2);
  await fs.writeFile(filePath, json, 'utf-8');
}
