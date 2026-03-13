import { useState, useEffect } from 'react';
import { useProfile } from '../context/ProfileContext';

/**
 * Resolves the correct user-data directory for the active profile.
 *
 * For Steam/installer Factorio this is `%APPDATA%\Factorio`,
 * for portable/zip Factorio it's the installation directory itself.
 *
 * Returns `null` while loading or when no profile is active.
 */
export function useUserDataPath(): string | null {
  const { activeProfile } = useProfile();
  const [userDataPath, setUserDataPath] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfile) {
      setUserDataPath(null);
      return;
    }

    let cancelled = false;

    window.electronAPI.util
      .resolveUserDataPath(activeProfile.factorioPath)
      .then((resolved) => {
        if (!cancelled) setUserDataPath(resolved);
      })
      .catch(() => {
        // Fallback to install path on error
        if (!cancelled) setUserDataPath(activeProfile.factorioPath);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.factorioPath]);

  return userDataPath;
}
