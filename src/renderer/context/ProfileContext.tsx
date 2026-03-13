import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ServerProfile } from '../../shared/types';

interface ProfileContextValue {
  profiles: ServerProfile[];
  activeProfile: ServerProfile | null;
  setActiveProfile: (profile: ServerProfile) => void;
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<ServerProfile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<ServerProfile | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load profiles and restore persisted active profile on mount
  useEffect(() => {
    (async () => {
      const list = await window.electronAPI.profiles.list();
      setProfiles(list);

      const savedId = await window.electronAPI.profiles.getActiveId();
      const saved = savedId ? list.find((p) => p.id === savedId) : null;
      setActiveProfileState(saved ?? list[0] ?? null);
      setInitialized(true);
    })();
  }, []);

  const refreshProfiles = useCallback(async () => {
    const list = await window.electronAPI.profiles.list();
    setProfiles(list);
    if (activeProfile) {
      const updated = list.find((p) => p.id === activeProfile.id);
      if (updated) {
        setActiveProfileState(updated);
      } else if (list.length > 0) {
        setActiveProfileState(list[0]);
        await window.electronAPI.profiles.setActiveId(list[0].id);
      } else {
        setActiveProfileState(null);
        await window.electronAPI.profiles.setActiveId(null);
      }
    } else if (list.length > 0) {
      setActiveProfileState(list[0]);
      await window.electronAPI.profiles.setActiveId(list[0].id);
    }
  }, [activeProfile]);

  const setActiveProfile = useCallback((profile: ServerProfile) => {
    setActiveProfileState(profile);
    window.electronAPI.profiles.setActiveId(profile.id);
  }, []);

  if (!initialized) return null;

  return (
    <ProfileContext.Provider value={{ profiles, activeProfile, setActiveProfile, refreshProfiles }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
