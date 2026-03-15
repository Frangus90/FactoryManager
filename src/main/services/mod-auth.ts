import fs from 'fs/promises';
import path from 'path';
import Store from 'electron-store';
import type { ModPortalAuth } from '../../shared/types';
import { APPDATA_FACTORIO_PATH } from '../util/constants';

const PLAYER_DATA_FILE = 'player-data.json';

interface PlayerData {
  'service-username'?: string;
  'service-token'?: string;
}

const store = new Store<{ modPortalAuth: ModPortalAuth | null; authDisabled: boolean }>({
  name: 'mod-portal-auth',
  defaults: { modPortalAuth: null, authDisabled: false },
});

async function readPlayerData(): Promise<ModPortalAuth | null> {
  try {
    const filePath = path.join(APPDATA_FACTORIO_PATH, PLAYER_DATA_FILE);
    const raw = await fs.readFile(filePath, 'utf-8');
    const data: PlayerData = JSON.parse(raw);
    const username = data['service-username'];
    const token = data['service-token'];
    if (username && token) {
      return { username, token };
    }
  } catch {
    // player-data.json doesn't exist or is unreadable
  }
  return null;
}

export async function getCredentials(): Promise<ModPortalAuth | null> {
  // If user explicitly disabled auth, return null
  if (store.get('authDisabled')) return null;

  // Try manual credentials first (user explicitly set these)
  const manual = store.get('modPortalAuth');
  if (manual) return manual;

  // Fall back to auto-detect from game files
  return readPlayerData();
}

export function setManualCredentials(username: string, token: string): void {
  store.set('modPortalAuth', { username, token });
  store.set('authDisabled', false);
}

export function clearCredentials(): void {
  store.set('modPortalAuth', null);
  store.set('authDisabled', true);
}

export async function hasCredentials(): Promise<boolean> {
  const creds = await getCredentials();
  return creds !== null;
}
