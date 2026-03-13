import React from 'react';
import { NavLink } from 'react-router-dom';
import { useServerStatus } from '../../hooks/useServerStatus';
import StatusIndicator from '../StatusIndicator';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/config', label: 'Config', icon: '⚙' },
  { to: '/saves', label: 'Saves', icon: '💾' },
  { to: '/rcon', label: 'RCON Console', icon: '>' },
  { to: '/logs', label: 'Logs', icon: '📋' },
  { to: '/mods', label: 'Mods', icon: '🧩' },
  { to: '/players', label: 'Players', icon: '👥' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
  { to: '/help', label: 'Help & Guide', icon: '?' },
];

export default function Sidebar() {
  const { status } = useServerStatus();

  return (
    <aside className="w-56 bg-factorio-dark border-r border-factorio-border flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-factorio-border">
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
                  ? 'bg-factorio-panel text-factorio-orange border-r-2 border-factorio-orange'
                  : 'text-factorio-muted hover:text-factorio-text hover:bg-factorio-panel/50'
              }`
            }
          >
            <span className="w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-factorio-border text-xs text-factorio-muted">
        v1.0.0
      </div>
    </aside>
  );
}
