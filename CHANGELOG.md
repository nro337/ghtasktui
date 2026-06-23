# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.4] - 2026-06-23
### Make binaries executable
- Fixes an issue where the standalone binaries were not marked as executable on Linux and macOS

## [0.3.3] - 2026-06-22
### Add repo url to package.json

## [0.3.2] - 2026-06-22
### Remove Intel macOS binary
- The Intel macOS binary (`ghtasktui-macos-x64`) is no longer built or published, as Node.js SEA builds now require native OS runners. Users on Intel Macs can still run the Apple Silicon binary (`ghtasktui-macos-arm64`) via Rosetta 2.

## [0.3.1] - 2026-06-22
### Trusted Publishing
- Set up trusted publishing for npm

## [0.3.0] - 2026-06-22

### Changed
- Replaced `@yao-pkg/pkg` with Node.js Single Executable Applications (SEA) for standalone binary builds — zero warnings, no external tooling beyond Node itself
- Targets Node 26; uses `--build-sea` with `mainFormat: "module"` so the ESM bundle is embedded directly without a CJS shim or postject
- Binary builds now require native OS runners (no cross-compilation); CI matrix updated to use `ubuntu-latest`, `macos-13`, `macos-latest`, and `windows-latest`
- Minimum Node.js version bumped to 26
- App version is now inlined at build time rather than read from `package.json` at runtime

## [0.2.0] - 2026-06-22

### UI Enhancements
- Added configurable themes
- Added high-contrast text mode
- Added stronger focus highlighting across TUI views

## [0.1.1] - 2026-06-18

### Bumped CI to use Node 24

## [0.1.0] - 2024-01-01

### Added

- List view with grouped items by Status, virtual scroll, split panel on wide terminals
- Board (Kanban) view with two-dimensional cursor navigation
- Item detail panel with inline editing (title, status, priority, custom fields)
- Item creation form with status pre-selection from Board columns
- Command Palette with fuzzy search across projects, actions, and items
- Filter overlay for status, priority, and type multi-select filters
- Text search with Fuse.js fuzzy matching
- Sidebar with project switcher
- Help overlay with full keybinding reference
- Lazy loading with cache-in-reducer pattern (no re-fetch on view navigation)
- Optimistic UI updates for field edits
- JSON configuration via cosmiconfig (`~/.config/ghtasktui/config.json`)
- Nerd Fonts support with `GHTASKTUI_NERD_FONTS=1` env var
- Debug logging to `~/.config/ghtasktui/debug.log` with `--debug` flag
- Standalone binary builds via `@yao-pkg/pkg` for Linux, macOS (x64/arm64), Windows
