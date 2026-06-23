# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-06-22

### Fixed
- Standalone binary builds (`pkg:all`) now work correctly by producing a CJS bundle for `@yao-pkg/pkg` to consume, avoiding an ESM `import.meta` parse failure
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
