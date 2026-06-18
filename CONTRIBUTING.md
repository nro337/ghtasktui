# Contributing to ghtasktui

Thanks for your interest! Below is a quick orientation to the codebase.

## Architecture

```
src/
  cli.tsx               Entry point — Commander, auth checks, render(<App>)
  config/
    config.ts           Config type + cosmiconfig loader
  gh/
    client.ts           All gh subprocess calls (execa); GHError; debug/retry
    normalize.ts        Raw gh JSON → domain types
    types.ts            Domain types: Project, Item, Field, FieldValue, …
  ui/
    App.tsx             Root component; global keybindings; overlay routing
    hooks/
      useAppState.ts    Global state (useReducer) + AppContext
      useGH.ts          Data-fetching hooks → writes into reducer cache
      useKeymap.ts      Typed keybindings + matchKey()
    theme/
      theme.ts          Color palette (Linear-inspired hex values)
      icons.ts          Unicode + Nerd Font icon sets
    components/         Reusable UI pieces (Header, Sidebar, Modal, …)
    views/              Full-screen views (List, Board, ItemDetail, …)
    utils/
      fields.ts         Field helpers + groupItemsByStatus + buildFlatRows
      filterItems.ts    Multi-select filter + Fuse.js text search
      detect.ts         Nerd Font + TrueColor detection
      text.ts           truncate, padStart, padEnd, normalizeColor
      time.ts           relativeTime, shortDate
```

### Key patterns

**Cache-in-reducer** — All fetched data (items, fields) lives in `AppState.projectCache[projectNumber]`. Loaders check `itemsLoaded` / `fieldsLoaded` and are no-ops if already populated. Pass `force: true` to re-fetch.

**Stable-ref mount** — Avoids `useEffect` loops when the loader function itself changes. Pattern:
```ts
const ref = useRef(fn);
ref.current = fn;
useEffect(() => { void ref.current(); }, []);
```

**Full-screen overlays** — Ink has no z-index. Overlays (Help, CommandPalette, FilterOverlay) are rendered as full replacements of the shell via early returns in `AppShell`.

**Optimistic updates** — Field edits dispatch `UPSERT_ITEM` immediately; the `gh` call happens in the background.

## Adding a new view

1. Create `src/ui/views/MyView.tsx`
2. Add `'MY_VIEW'` to the `AppView` union in `useAppState.ts`
3. Add a `case` in `ActiveView` in `App.tsx`
4. Navigate to it with `dispatch({ type: 'NAVIGATE', view: 'MY_VIEW' })`

## Adding a new `gh` operation

1. Add the function to `src/gh/client.ts` using the internal `gh()` helper
2. Add a mutation in `src/ui/hooks/useGH.ts` that calls it and dispatches a cache action
3. Add the reducer case in `useAppState.ts` if a new action type is needed

## Development

```sh
npm install
npm run dev        # tsup --watch
node dist/cli.js   # run locally
npm run typecheck  # strict TypeScript check
```

## Building standalone binaries

```sh
npm run build
npm run pkg:all    # builds all platforms into bin/
```

## Pull requests

- Keep PRs focused — one feature or fix per PR
- Run `npm run typecheck` before submitting
- Follow existing code style (no extra abstractions, no premature generalization)
