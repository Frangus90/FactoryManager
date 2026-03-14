import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ProfileProvider } from './context/ProfileContext';
import { RconProvider } from './context/RconContext';
import { ServerProvider } from './context/ServerContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import ConfigEditor from './pages/ConfigEditor';
import SaveManager from './pages/SaveManager';
import RconConsole from './pages/RconConsole';
import LogViewer from './pages/LogViewer';
import ModManager from './pages/ModManager';
import PlayerManager from './pages/PlayerManager';
import MapSettings from './pages/MapSettings';
import Settings from './pages/Settings';
import Help from './pages/Help';

export default function App() {
  return (
    <ErrorBoundary>
    <ServerProvider>
    <ProfileProvider>
    <RconProvider>
      <MemoryRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/config" element={<ConfigEditor />} />
            <Route path="/saves" element={<SaveManager />} />
            <Route path="/rcon" element={<RconConsole />} />
            <Route path="/logs" element={<LogViewer />} />
            <Route path="/mods" element={<ModManager />} />
            <Route path="/players" element={<PlayerManager />} />
            <Route path="/map-settings" element={<MapSettings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </RconProvider>
    </ProfileProvider>
    </ServerProvider>
    </ErrorBoundary>
  );
}
