# FactoryManager

Desktop app for running a Factorio dedicated server on Windows. Built with Electron, React, and TypeScript.

## Features

- Start/stop server with real-time status and log output
- RCON console for live server commands
- Save manager with game save import
- Mod manager (enable/disable mods)
- Player management (admin, ban, whitelist)
- Server settings editor (GUI for server-settings.json)
- Profile system for multiple server configurations
- Local and public IP display with copy-to-clipboard
- Runs alongside the Factorio game client (no lock conflicts)

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

## License

MIT
