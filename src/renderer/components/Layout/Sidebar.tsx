import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useServerStatus } from '../../hooks/useServerStatus';
import { useProfile } from '../../context/ProfileContext';
import StatusIndicator from '../StatusIndicator';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/config', label: 'Config', icon: '⚙' },
  { to: '/saves', label: 'Saves', icon: '💾' },
  { to: '/rcon', label: 'RCON Console', icon: '>' },
  { to: '/logs', label: 'Logs', icon: '📋' },
  { to: '/mods', label: 'Mods', icon: '🧩' },
  { to: '/players', label: 'Players', icon: '👥' },
  { to: '/map-settings', label: 'Map Settings', icon: '🗺' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
  { to: '/help', label: 'Help & Guide', icon: '?' },
];

export default function Sidebar() {
  const { status } = useServerStatus();
  const { activeProfile } = useProfile();
  const [factorioVersion, setFactorioVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfile) { setFactorioVersion(null); return; }
    window.electronAPI.util.getFactorioVersion(activeProfile.factorioPath)
      .then(setFactorioVersion)
      .catch(() => setFactorioVersion(null));
  }, [activeProfile?.factorioPath]);

  return (
    <aside
      className="w-56 bg-factorio-dark flex flex-col h-full shrink-0"
      style={{
        borderRight: '1px solid #1a1a1a',
        boxShadow: 'inset -1px 0 0 #5a5a5a',
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{
          borderBottom: '1px solid #1a1a1a',
          boxShadow: '0 1px 0 #5a5a5a',
        }}
      >
        <h1 className="text-factorio-orange font-bold text-lg">FactoryManager</h1>
        <div className="mt-2">
          <StatusIndicator status={status} size="sm" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-factorio-orange text-factorio-darker font-semibold'
                  : 'text-factorio-muted hover:text-factorio-text hover:bg-factorio-panel'
              }`
            }
          >
            <span className="w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="p-3 text-xs text-factorio-muted"
        style={{
          borderTop: '1px solid #1a1a1a',
          boxShadow: '0 -1px 0 #5a5a5a',
        }}
      >
        {factorioVersion ? `Factorio ${factorioVersion}` : 'FactoryManager'}
      </div>
    </aside>
  );
}
