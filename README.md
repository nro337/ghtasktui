# ghtasktui

A Linear-inspired terminal UI for GitHub Projects, powered by the `gh` CLI.

```
┌─ ghtasktui ──────────────────────────── acme-org ─────── ? B V N F ─┐
│ ◆ My Project                                                          │
│                                                                       │
│  TODO                                                                 │
│  › #42  Add dark mode support                    In Progress          │
│    #38  Fix auth redirect loop                   Backlog              │
│                                                                       │
│  IN PROGRESS                                                          │
│    #47  Migrate to new API                       In Progress          │
│                                                                       │
└───────────────────────── 12 items  ↑↓ navigate  Enter open  / search ┘
```

## Features

- **List & Board views** — grouped by Status with virtual scroll; Kanban board with column navigation
- **Full CRUD** — create, edit, delete items; inline field editing (status, priority, custom fields)
- **Command Palette** (`Ctrl+K`) — fuzzy search across projects, actions, and recent items
- **Filters** — multi-select status/priority/type; live text search with fuzzy matching
- **Lazy loading** — items and fields load on demand; cached in-session so navigation is instant
- **Optimistic updates** — field changes apply immediately in the UI
- **Nerd Fonts support** — richer icons with `GHTASKTUI_NERD_FONTS=1`
- **Theming** — choose between dark and midnight themes, with optional high-contrast text
- **Configurable** — JSON config at `~/.config/ghtasktui/config.json`

## Requirements

- [gh CLI](https://cli.github.com) installed and authenticated (`gh auth login`)
- Node.js ≥ 20 (or use a standalone binary — no Node required)

## Installation

### npm

```sh
npm install -g ghtasktui
```

### Standalone binary

Download a pre-built binary from the [Releases](../../releases) page:

| Platform       | Binary                      |
|----------------|-----------------------------|
| macOS (Apple)  | `ghtasktui-macos-arm64`     |
| Linux (x64)    | `ghtasktui-linux`           |
| Windows (x64)  | `ghtasktui-win.exe`         |

```sh
# macOS example
curl -L https://github.com/YOUR_USERNAME/ghtasktui/releases/latest/download/ghtasktui-macos-arm64 \
  -o /usr/local/bin/ghtasktui
chmod +x /usr/local/bin/ghtasktui
```

## Usage

```sh
ghtasktui                     # use default owner (@me)
ghtasktui --owner myorg       # specify an org
ghtasktui --debug             # enable debug log to ~/.config/ghtasktui/debug.log
```

## Keyboard shortcuts

### Global

| Key        | Action              |
|------------|---------------------|
| `Ctrl+K`   | Command Palette     |
| `?`        | Help overlay        |
| `B`        | Toggle sidebar      |
| `V`        | Toggle List / Board |
| `R`        | Refresh             |
| `Q` / `q`  | Quit                |

### List / Board views

| Key        | Action                          |
|------------|---------------------------------|
| `↑` / `K`  | Move cursor up                  |
| `↓` / `J`  | Move cursor down                |
| `←` / `H`  | (Board) previous column         |
| `→` / `L`  | (Board) next column             |
| `Enter`    | Open item detail                |
| `N`        | New item                        |
| `D`        | Delete item (with confirmation) |
| `F`        | Filter overlay                  |
| `C`        | Clear filters                   |
| `/`        | Text search                     |
| `O`        | Open in browser                 |
| `M`        | (Board) Move item to column     |

### Item detail

| Key  | Action                    |
|------|---------------------------|
| `E`  | Edit title                |
| `S`  | Change status             |
| `P`  | Change priority           |
| `D`  | Delete item               |
| `O`  | Open in browser           |
| `Esc`| Back                      |

## Configuration

Create `~/.config/ghtasktui/config.json`:

```json
{
  "general": {
    "defaultOwner": "myorg",
    "defaultView": "board",
    "refreshInterval": 0
  },
  "appearance": {
    "theme": "midnight",
    "highContrastText": true,
    "nerdFonts": true,
    "sidebarWidth": 24,
    "detailPanelRatio": 0.45
  }
}
```

See [`examples/config.json`](examples/config.json) for all options.

## Environment variables

| Variable                  | Description                            |
|---------------------------|----------------------------------------|
| `GHTASKTUI_NERD_FONTS=1`  | Enable Nerd Font icons                 |
| `GHTASKTUI_NERD_FONTS=0`  | Disable Nerd Font icons (override cfg) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License. See [LICENSE](LICENSE).
