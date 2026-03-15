# FactoryManager

Desktop app for managing a local Factorio dedicated server on Windows. Built with Electron, React, and TypeScript.

Styled to match Factorio's native UI.

## Features

### Server Management
- Start/stop/restart with real-time status and log output
- Crash auto-restart (per-profile, up to 3 attempts in 5 minutes)
- Scheduled restarts (every N hours or daily at a set time, with RCON player warnings)
- Auto-start server on app launch
- UPnP automatic port forwarding
- Resource monitor (CPU, memory, UPS)

### RCON Console
- Live command input with output display
- Quick command buttons (Players, Time, Evolution, Seed, Save)
- Command scheduler (run RCON commands at configurable intervals)

### Save Management
- List, create, delete server saves
- Import saves from game client
- Backup system with create/restore/delete
- Auto-backup before server start with configurable max backups

### Mod Portal integration
- Browse, install, update, and manage mods from the official Factorio mod portal without leaving the app.
- Full catalog cached client-side with search, sort, and lazy scroll.
- Downloads verified with SHA1.
- Auth auto-detected from game files with manual fallback.

### Configuration
- Server settings editor (GUI for `server-settings.json`)
- Map settings editor (difficulty, pollution, evolution, expansion)
- Map generation editor (terrain, cliffs, resources, world size)
- Player management (admin list, ban list, whitelist)
- Profile system for multiple server configurations
- Profile export/import (JSON)

### Dashboard
- Server status with uptime counter
- Local and public IP display with copy-to-clipboard
- Live activity feed (player joins, leaves, chat)
- Server resource usage (CPU/memory/UPS)
- Factorio update checker
- UPnP port forwarding status

### Desktop Integration
- System tray with context menu (show/hide, start/stop, quit)
- Close-to-tray option
- Desktop notifications (server start/stop/crash, player join/leave)
- Log export to text file

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Factorio](https://www.factorio.com/) installed (Steam or standalone)

## Getting Started

```bash
npm install
npm start
```

On first launch, create a profile and point it to your Factorio installation directory.

## Build

```bash
npm run make
```

Produces a Windows installer in the `out/` directory.

## Architecture

- **Main process**: Electron + Node.js services (server process management, RCON client, file I/O)
- **Renderer**: React 18 + Tailwind CSS
- **IPC**: Typed channels with preload bridge (`contextBridge`)
- **Persistence**: `electron-store` for profiles and app settings
- **Server isolation**: Separate write-data directory avoids conflicts with the game client

## License

MIT
