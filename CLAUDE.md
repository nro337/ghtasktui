# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm install          # install dependencies
npm run dev          # tsup --watch, rebuilds on file change → run with: node dist/cli.js
npm run build        # production build to dist/
npm run typecheck    # strict TypeScript check (no emit)
npm run start        # node dist/cli.js (after build)
```

There are no tests. Type checking (`npm run typecheck`) is the primary correctness gate.

## Architecture

`ghtasktui` is a terminal UI (TUI) built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal) that wraps the `gh` CLI to manage GitHub Projects.

### Data flow

```
gh CLI (subprocess via execa)
  └─ src/gh/client.ts   — raw gh command invocations, retry logic, GHError
  └─ src/gh/normalize.ts — maps raw gh JSON → typed domain models
  └─ src/gh/types.ts     — domain types (Project, Item, Field, FieldValue) + Raw* shapes

src/config/config.ts    — cosmiconfig loader; searches ~/.config/ghtasktui/config.json
src/cli.tsx             — Commander entry point; boots Ink, passes Config to <App>

src/ui/App.tsx          — root component; owns AppContext.Provider + AppShell
src/ui/hooks/useAppState.ts — global reducer (AppState, AppAction, appReducer)
src/ui/hooks/useGH.ts   — async data loaders + mutations backed by client.ts; cache via dispatch
src/ui/hooks/useKeymap.ts — key binding definitions and matchKey helper
```

### State management

All UI state lives in a single `AppState` via `useReducer`. Components access it through `AppContext` using `useAppState()` / `useDispatch()`. Loaded data (projects, items, fields) is stored in `AppState.projectCache` keyed by project number — loaders use `inflightRef` guards to avoid duplicate requests.

Optimistic updates: mutations (`editField`, `editTitle`) dispatch `UPSERT_ITEM` before the gh call resolves.

### Views and components

`src/ui/views/` — full-screen views (`PROJECT_LIST`, `LIST`, `BOARD`, `ITEM_DETAIL`, `ITEM_FORM`, `SETTINGS`). `App.tsx` renders the active one via a switch on `AppState.view`.

`src/ui/components/` — shared UI pieces (overlays like `CommandPalette`, `FilterOverlay`, `Help`; chrome like `Header`, `Sidebar`, `StatusBar`, `Toast`; reusables like `Modal`, `SelectPicker`, `InlineTextInput`).

Ink has no z-index — full-screen overlays replace the entire shell (`if (state.helpOpen) return <Help />`).

`searchMode` in `AppState` suppresses global single-key shortcuts whenever a text input is focused, preventing accidental navigation while typing.

### Build

tsup bundles `src/cli.tsx` → `dist/cli.js` (ESM, Node 20, shebang prepended). TypeScript strict mode is on with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.

### Releasing

1. `npm version patch|minor|major` (commits + creates git tag)
2. Update `CHANGELOG.md`
3. `git push origin main --follow-tags`
4. GitHub Actions on `v*` tag: builds standalone binaries, creates GitHub Release, publishes to npm
