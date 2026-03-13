import Store from 'electron-store';
import crypto from 'crypto';
import type { ServerProfile } from '../../shared/types';
import { DEFAULT_RCON_PORT, DEFAULT_SERVER_PORT, generateRconPassword } from '../util/constants';

interface StoreSchema {
  profiles: ServerProfile[];
  activeProfileId: string | null;
}

const store = new Store<StoreSchema>({
  name: 'profiles',
  defaults: {
    profiles: [],
    activeProfileId: null,
  },
});

export function listProfiles(): ServerProfile[] {
  return store.get('profiles');
}

export function getProfile(id: string): ServerProfile | undefined {
  return store.get('profiles').find((p) => p.id === id);
}

export function createProfile(data: Omit<ServerProfile, 'id'>): ServerProfile {
  const profile: ServerProfile = {
    id: crypto.randomUUID(),
    ...data,
  };
  const profiles = store.get('profiles');
  profiles.push(profile);
  store.set('profiles', profiles);
  if (!store.get('activeProfileId')) {
    store.set('activeProfileId', profile.id);
  }
  return profile;
}

export function updateProfile(id: string, updates: Partial<Omit<ServerProfile, 'id'>>): ServerProfile | null {
  const profiles = store.get('profiles');
  const index = profiles.findIndex((p) => p.id === id);
  if (index === -1) return null;
  profiles[index] = { ...profiles[index], ...updates, id };
  store.set('profiles', profiles);
  return profiles[index];
}

export function deleteProfile(id: string): boolean {
  const profiles = store.get('profiles');
  const filtered = profiles.filter((p) => p.id !== id);
  if (filtered.length === profiles.length) return false;
  store.set('profiles', filtered);
  if (store.get('activeProfileId') === id) {
    store.set('activeProfileId', filtered[0]?.id ?? null);
  }
  return true;
}

export function getActiveProfileId(): string | null {
  return store.get('activeProfileId');
}

export function setActiveProfileId(id: string | null): void {
  store.set('activeProfileId', id);
}

export function createDefaultProfile(factorioPath: string): ServerProfile {
  return createProfile({
    name: 'My Factorio Server',
    factorioPath,
    selectedSave: null,
    useLatestSave: true,
    rconPort: DEFAULT_RCON_PORT,
    rconPassword: generateRconPassword(),
    serverPort: DEFAULT_SERVER_PORT,
    serverSettingsPath: null,
    adminListPath: null,
    banListPath: null,
    whitelistPath: null,
  });
}
