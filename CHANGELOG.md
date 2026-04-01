# Changelog

## 1.1.1 01.04.2026

### Added

- App icon for window, tray, and Windows installer
- Map settings integrated into save creation flow (overlay panel on create)
- Credential encryption at rest via Electron `safeStorage` (DPAPI on Windows)
- RCON command rate limiting (10 commands/sec)
- Token redaction in mod portal error messages

### Changed

- Map settings removed from sidebar; now only accessible when creating a new save
- Profile import uses strict field allowlist instead of open object spread

### Fixed

- 12 mod portal bugs: semver update checking, redirect handling, path traversal guard, download concurrency, stale closures, auth clear blocking auto-detect
- Tray icon uses ICO format on Windows
- Icon loading in production builds
- Input validation on all IPC handlers (port ranges, directory scoping, path traversal guards)

### Security

- RCON host restricted to localhost only
- Port validation on RCON and UPnP handlers
- Directory-scoped file access for config and player list operations
- Save import validates `.zip` extension
- `execFile` validates resolved path is `factorio.exe`
- Credentials encrypted with `safeStorage` instead of plaintext JSON
- RCON command rate limiter prevents renderer flooding
- Profile import rejects unknown fields
- Mod portal tokens redacted from error messages

## 1.1.0 - 2026-03-15

### Added

- Mod Portal integration: browse, search, download, and update mods from mods.factorio.com
- Mod portal authentication (auto-detect from game files or manual entry)
- Mod update checker with one-click update
- SHA1 verification on downloaded mods

## 1.0.0 - 2026-03-14

### Added

- Server lifecycle management (start/stop state machine)
- Source RCON protocol client for console commands
- Multi-profile system with persistent settings
- Save manager with game save import to isolated server directory
- Mod manager (enable/disable from `mod-list.json`)
- Player management (admin, ban, whitelist)
- Server settings editor (GUI for `server-settings.json`)
- Log viewer with clipboard copy and export
- Dashboard with uptime, local/public IP, quick controls
- Auto-detection of Steam and standalone Factorio installs
- Lock file isolation (game client and server run simultaneously)
- Auto-start server on app launch
- Profile export/import
- Scheduled auto-restart with RCON warnings
- Factorio update checker
- Chat and event feed
- Save backups with auto-backup before start
- CPU/memory/UPS resource monitor
- Map generation settings editor
- UPnP port forwarding
- Scheduled RCON command runner
- System tray with minimize-to-tray
- Desktop notifications (start, stop, crash, player join)
