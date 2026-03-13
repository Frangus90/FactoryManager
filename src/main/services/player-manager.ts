import fs from 'fs/promises';
import type { BanEntry } from '../../shared/types';

export async function readJsonList(filePath: string): Promise<string[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

export async function writeJsonList(filePath: string, items: string[]): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf-8');
}

export async function readBanList(filePath: string): Promise<BanEntry[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map((entry: unknown) => {
      if (typeof entry === 'string') return { username: entry };
      if (typeof entry === 'object' && entry !== null) {
        const obj = entry as Record<string, unknown>;
        return {
          username: String(obj.username ?? obj.name ?? ''),
          reason: obj.reason ? String(obj.reason) : undefined,
        };
      }
      return { username: String(entry) };
    });
  } catch {
    return [];
  }
}

export async function writeBanList(filePath: string, entries: BanEntry[]): Promise<void> {
  // Factorio expects a simple array of strings for server-banlist.json
  const names = entries.map((e) => e.username);
  await fs.writeFile(filePath, JSON.stringify(names, null, 2), 'utf-8');
}
