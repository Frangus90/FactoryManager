import React, { useEffect, useState } from 'react';

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI.window.isMaximized().then(setMaximized);
    const unsub = window.electronAPI.window.onMaximizeChange(setMaximized);
    return unsub;
  }, []);

  return (
    <div
      className="flex items-center justify-between bg-factorio-darker select-none shrink-0"
      style={{
        height: 32,
        WebkitAppRegion: 'drag',
        borderBottom: '1px solid #1a1a1a',
      } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3 text-xs text-factorio-muted">
        <span className="text-factorio-orange font-semibold">FactoryManager</span>
      </div>

      <div
        className="flex h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.electronAPI.window.minimize()}
          className="h-full px-4 text-factorio-muted hover:bg-factorio-panel hover:text-factorio-text transition-colors"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>

        <button
          onClick={() => window.electronAPI.window.maximize()}
          className="h-full px-4 text-factorio-muted hover:bg-factorio-panel hover:text-factorio-text transition-colors"
          title={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="0" width="8" height="8" rx="0.5" />
              <rect x="0" y="2" width="8" height="8" rx="0.5" fill="#242324" />
              <rect x="0" y="2" width="8" height="8" rx="0.5" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
            </svg>
          )}
        </button>

        <button
          onClick={() => window.electronAPI.window.close()}
          className="h-full px-4 text-factorio-muted hover:bg-red-600 hover:text-white transition-colors"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
