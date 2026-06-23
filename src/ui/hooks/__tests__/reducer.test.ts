import { describe, it, expect } from 'vitest';
import {
  appReducer,
  initialState,
  defaultFilters,
  hasActiveFilters,
  type AppState,
  type AppAction,
  type ItemFilters,
} from '../useAppState.js';
import type { Config } from '../../../config/config.js';
import type { Item, Project, Field } from '../../../gh/types.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

const mockConfig: Config = {
  general: { defaultOwner: '@me', defaultView: 'list', refreshInterval: 0 },
  appearance: { theme: 'dark', highContrastText: false, nerdFonts: false, sidebarWidth: 22, detailPanelRatio: 0.4 },
  keybindings: {},
  projects: {},
};

function makeState(overrides: Partial<AppState> = {}): AppState {
  return { ...initialState(mockConfig), ...overrides };
}

function reduce(state: AppState, action: AppAction): AppState {
  return appReducer(state, action);
}

function makeItem(id: string, title = 'Item'): Item {
  return {
    id,
    title,
    type: 'DRAFT_ISSUE',
    status: '',
    priority: '',
    assignees: [],
    labels: [],
    createdAt: '',
    updatedAt: '',
    body: '',
    fieldValues: {},
  };
}

function makeProject(number = 1): Project {
  return {
    number,
    id: `PVT_${number}`,
    title: `Project ${number}`,
    shortDescription: '',
    url: '',
    closed: false,
    fields: [],
    items: [],
  };
}

function makeField(id: string): Field {
  return { id, name: 'Field', type: 'TEXT', options: [] };
}

// ─── initialState ─────────────────────────────────────────────────────────────

describe('initialState', () => {
  it('sets view to PROJECT_LIST', () => {
    expect(initialState(mockConfig).view).toBe('PROJECT_LIST');
  });

  it('derives owner from config.general.defaultOwner', () => {
    const cfg = { ...mockConfig, general: { ...mockConfig.general, defaultOwner: 'acme' } };
    expect(initialState(cfg).owner).toBe('acme');
  });

  it('initializes empty cache', () => {
    expect(initialState(mockConfig).projectCache).toEqual({});
  });

  it('initializes filters to defaultFilters', () => {
    expect(initialState(mockConfig).filters).toEqual(defaultFilters);
  });
});

// ─── simple state-update actions ─────────────────────────────────────────────

describe('NAVIGATE', () => {
  it('updates view', () => {
    const next = reduce(makeState(), { type: 'NAVIGATE', view: 'LIST' });
    expect(next.view).toBe('LIST');
  });
});

describe('SET_PROJECT', () => {
  it('sets activeProject', () => {
    const project = makeProject();
    const next = reduce(makeState(), { type: 'SET_PROJECT', project });
    expect(next.activeProject).toBe(project);
  });
});

describe('SET_ITEM', () => {
  it('sets selectedItem', () => {
    const item = makeItem('I1');
    const next = reduce(makeState(), { type: 'SET_ITEM', item });
    expect(next.selectedItem).toBe(item);
  });
});

describe('SET_OWNER', () => {
  it('updates owner string', () => {
    const next = reduce(makeState(), { type: 'SET_OWNER', owner: 'my-org' });
    expect(next.owner).toBe('my-org');
  });
});

describe('TOGGLE_SIDEBAR', () => {
  it('flips sidebarOpen from true to false', () => {
    const next = reduce(makeState({ sidebarOpen: true }), { type: 'TOGGLE_SIDEBAR' });
    expect(next.sidebarOpen).toBe(false);
  });

  it('flips sidebarOpen from false to true', () => {
    const next = reduce(makeState({ sidebarOpen: false }), { type: 'TOGGLE_SIDEBAR' });
    expect(next.sidebarOpen).toBe(true);
  });
});

describe('TOGGLE_COMMAND_PALETTE', () => {
  it('flips commandPaletteOpen', () => {
    const s0 = makeState({ commandPaletteOpen: false });
    const s1 = reduce(s0, { type: 'TOGGLE_COMMAND_PALETTE' });
    expect(s1.commandPaletteOpen).toBe(true);
    const s2 = reduce(s1, { type: 'TOGGLE_COMMAND_PALETTE' });
    expect(s2.commandPaletteOpen).toBe(false);
  });
});

describe('TOGGLE_HELP', () => {
  it('flips helpOpen', () => {
    const s0 = makeState({ helpOpen: false });
    expect(reduce(s0, { type: 'TOGGLE_HELP' }).helpOpen).toBe(true);
  });
});

describe('SET_PROJECTS', () => {
  it('stores projects and marks projectsLoaded', () => {
    const projects = [makeProject(1), makeProject(2)];
    const next = reduce(makeState(), { type: 'SET_PROJECTS', projects });
    expect(next.projects).toEqual(projects);
    expect(next.projectsLoaded).toBe(true);
  });
});

describe('SET_FORM_DEFAULTS', () => {
  it('stores form defaults', () => {
    const next = reduce(makeState(), { type: 'SET_FORM_DEFAULTS', defaults: { statusId: 'S1' } });
    expect(next.formDefaults).toEqual({ statusId: 'S1' });
  });

  it('can clear form defaults to null', () => {
    const next = reduce(makeState({ formDefaults: { statusId: 'S1' } }), { type: 'SET_FORM_DEFAULTS', defaults: null });
    expect(next.formDefaults).toBeNull();
  });
});

describe('SET_LOADING', () => {
  it('sets loading flag', () => {
    expect(reduce(makeState({ loading: false }), { type: 'SET_LOADING', loading: true }).loading).toBe(true);
    expect(reduce(makeState({ loading: true }), { type: 'SET_LOADING', loading: false }).loading).toBe(false);
  });
});

describe('SHOW_TOAST / CLEAR_TOAST', () => {
  it('sets toast message and kind', () => {
    const next = reduce(makeState(), { type: 'SHOW_TOAST', message: 'Done', kind: 'success' });
    expect(next.toast).toEqual({ message: 'Done', kind: 'success' });
  });

  it('clears toast', () => {
    const withToast = makeState({ toast: { message: 'Hello', kind: 'info' } });
    const next = reduce(withToast, { type: 'CLEAR_TOAST' });
    expect(next.toast).toBeNull();
  });
});

// ─── filters ──────────────────────────────────────────────────────────────────

describe('SET_FILTERS', () => {
  it('merges partial filter into existing filters', () => {
    const base = makeState({ filters: { ...defaultFilters, statusIds: ['S1'] } });
    const next = reduce(base, { type: 'SET_FILTERS', filters: { searchQuery: 'bug' } });
    expect(next.filters.statusIds).toEqual(['S1']);
    expect(next.filters.searchQuery).toBe('bug');
  });

  it('overwrites a filter key when provided', () => {
    const base = makeState({ filters: { ...defaultFilters, statusIds: ['S1', 'S2'] } });
    const next = reduce(base, { type: 'SET_FILTERS', filters: { statusIds: ['S3'] } });
    expect(next.filters.statusIds).toEqual(['S3']);
  });
});

describe('CLEAR_FILTERS', () => {
  it('resets filters to defaultFilters', () => {
    const dirty = makeState({
      filters: { statusIds: ['S1'], priorityNames: ['High'], types: ['ISSUE'], searchQuery: 'foo' },
    });
    const next = reduce(dirty, { type: 'CLEAR_FILTERS' });
    expect(next.filters).toEqual(defaultFilters);
  });
});

describe('TOGGLE_FILTER_OVERLAY', () => {
  it('flips filterOverlayOpen', () => {
    expect(reduce(makeState({ filterOverlayOpen: false }), { type: 'TOGGLE_FILTER_OVERLAY' }).filterOverlayOpen).toBe(true);
    expect(reduce(makeState({ filterOverlayOpen: true }), { type: 'TOGGLE_FILTER_OVERLAY' }).filterOverlayOpen).toBe(false);
  });
});

describe('SET_SEARCH_MODE', () => {
  it('sets searchMode', () => {
    expect(reduce(makeState(), { type: 'SET_SEARCH_MODE', active: true }).searchMode).toBe(true);
    expect(reduce(makeState({ searchMode: true }), { type: 'SET_SEARCH_MODE', active: false }).searchMode).toBe(false);
  });
});

// ─── CACHE_ITEMS ──────────────────────────────────────────────────────────────

describe('CACHE_ITEMS', () => {
  it('stores items and marks itemsLoaded for a new project', () => {
    const items = [makeItem('I1'), makeItem('I2')];
    const next = reduce(makeState(), {
      type: 'CACHE_ITEMS',
      projectNumber: 1,
      items,
      hasNextPage: false,
      endCursor: null,
      append: false,
    });
    expect(next.projectCache[1]?.items).toEqual(items);
    expect(next.projectCache[1]?.itemsLoaded).toBe(true);
  });

  it('replaces items when append is false', () => {
    const first = [makeItem('I1')];
    const second = [makeItem('I2')];
    const s1 = reduce(makeState(), {
      type: 'CACHE_ITEMS', projectNumber: 1, items: first, hasNextPage: true, endCursor: 'C1', append: false,
    });
    const s2 = reduce(s1, {
      type: 'CACHE_ITEMS', projectNumber: 1, items: second, hasNextPage: false, endCursor: null, append: false,
    });
    expect(s2.projectCache[1]?.items).toEqual(second);
  });

  it('appends items when append is true', () => {
    const first = [makeItem('I1')];
    const second = [makeItem('I2')];
    const s1 = reduce(makeState(), {
      type: 'CACHE_ITEMS', projectNumber: 1, items: first, hasNextPage: true, endCursor: 'C1', append: false,
    });
    const s2 = reduce(s1, {
      type: 'CACHE_ITEMS', projectNumber: 1, items: second, hasNextPage: false, endCursor: null, append: true,
    });
    expect(s2.projectCache[1]?.items).toEqual([...first, ...second]);
  });

  it('stores hasNextPage and endCursor', () => {
    const next = reduce(makeState(), {
      type: 'CACHE_ITEMS', projectNumber: 1, items: [], hasNextPage: true, endCursor: 'cursor_abc', append: false,
    });
    expect(next.projectCache[1]?.hasNextPage).toBe(true);
    expect(next.projectCache[1]?.endCursor).toBe('cursor_abc');
  });

  it('creates a fresh cache entry for an unseen project number', () => {
    const next = reduce(makeState(), {
      type: 'CACHE_ITEMS', projectNumber: 99, items: [], hasNextPage: false, endCursor: null, append: false,
    });
    expect(next.projectCache[99]).toBeDefined();
    expect(next.projectCache[99]?.fieldsLoaded).toBe(false);
  });

  it('preserves existing fields when updating items', () => {
    const fields = [makeField('F1')];
    const s1 = reduce(makeState(), {
      type: 'CACHE_FIELDS', projectNumber: 1, fields,
    });
    const s2 = reduce(s1, {
      type: 'CACHE_ITEMS', projectNumber: 1, items: [], hasNextPage: false, endCursor: null, append: false,
    });
    expect(s2.projectCache[1]?.fields).toEqual(fields);
  });
});

// ─── CACHE_FIELDS ─────────────────────────────────────────────────────────────

describe('CACHE_FIELDS', () => {
  it('stores fields and marks fieldsLoaded', () => {
    const fields = [makeField('F1'), makeField('F2')];
    const next = reduce(makeState(), { type: 'CACHE_FIELDS', projectNumber: 1, fields });
    expect(next.projectCache[1]?.fields).toEqual(fields);
    expect(next.projectCache[1]?.fieldsLoaded).toBe(true);
  });

  it('preserves existing items when updating fields', () => {
    const items = [makeItem('I1')];
    const s1 = reduce(makeState(), {
      type: 'CACHE_ITEMS', projectNumber: 1, items, hasNextPage: false, endCursor: null, append: false,
    });
    const s2 = reduce(s1, {
      type: 'CACHE_FIELDS', projectNumber: 1, fields: [],
    });
    expect(s2.projectCache[1]?.items).toEqual(items);
  });
});

// ─── UPSERT_ITEM ──────────────────────────────────────────────────────────────

describe('UPSERT_ITEM', () => {
  it('appends a new item when id not found', () => {
    const existing = makeItem('I1');
    const newItem = makeItem('I2');
    const s0 = reduce(makeState(), {
      type: 'CACHE_ITEMS', projectNumber: 1, items: [existing], hasNextPage: false, endCursor: null, append: false,
    });
    const s1 = reduce(s0, { type: 'UPSERT_ITEM', projectNumber: 1, item: newItem });
    expect(s1.projectCache[1]?.items).toHaveLength(2);
    expect(s1.projectCache[1]?.items[1]).toBe(newItem);
  });

  it('replaces an existing item in-place when id matches', () => {
    const v1 = makeItem('I1', 'Original');
    const v2 = makeItem('I1', 'Updated');
    const s0 = reduce(makeState(), {
      type: 'CACHE_ITEMS', projectNumber: 1, items: [v1], hasNextPage: false, endCursor: null, append: false,
    });
    const s1 = reduce(s0, { type: 'UPSERT_ITEM', projectNumber: 1, item: v2 });
    expect(s1.projectCache[1]?.items).toHaveLength(1);
    expect(s1.projectCache[1]?.items[0]?.title).toBe('Updated');
  });

  it('updates selectedItem when ids match', () => {
    const v1 = makeItem('I1', 'Before');
    const v2 = makeItem('I1', 'After');
    const s0 = makeState({ selectedItem: v1 });
    const s1 = reduce(s0, { type: 'UPSERT_ITEM', projectNumber: 1, item: v2 });
    expect(s1.selectedItem?.title).toBe('After');
  });

  it('leaves selectedItem unchanged when ids do not match', () => {
    const selected = makeItem('I99');
    const other = makeItem('I1');
    const s0 = makeState({ selectedItem: selected });
    const s1 = reduce(s0, { type: 'UPSERT_ITEM', projectNumber: 1, item: other });
    expect(s1.selectedItem).toBe(selected);
  });

  it('creates a new cache entry for an unseen project', () => {
    const item = makeItem('I1');
    const next = reduce(makeState(), { type: 'UPSERT_ITEM', projectNumber: 42, item });
    expect(next.projectCache[42]?.items).toEqual([item]);
  });
});

// ─── REMOVE_ITEM ──────────────────────────────────────────────────────────────

describe('REMOVE_ITEM', () => {
  it('removes item from cache by id', () => {
    const items = [makeItem('I1'), makeItem('I2'), makeItem('I3')];
    const s0 = reduce(makeState(), {
      type: 'CACHE_ITEMS', projectNumber: 1, items, hasNextPage: false, endCursor: null, append: false,
    });
    const s1 = reduce(s0, { type: 'REMOVE_ITEM', projectNumber: 1, itemId: 'I2' });
    expect(s1.projectCache[1]?.items.map(i => i.id)).toEqual(['I1', 'I3']);
  });

  it('nulls selectedItem when it matches the removed id', () => {
    const item = makeItem('I1');
    const s0 = makeState({ selectedItem: item });
    const s1 = reduce(s0, { type: 'REMOVE_ITEM', projectNumber: 1, itemId: 'I1' });
    expect(s1.selectedItem).toBeNull();
  });

  it('preserves selectedItem when it does not match the removed id', () => {
    const selected = makeItem('I99');
    const s0 = makeState({ selectedItem: selected });
    const s1 = reduce(s0, { type: 'REMOVE_ITEM', projectNumber: 1, itemId: 'I1' });
    expect(s1.selectedItem).toBe(selected);
  });

  it('is a no-op for an id not in the cache', () => {
    const items = [makeItem('I1')];
    const s0 = reduce(makeState(), {
      type: 'CACHE_ITEMS', projectNumber: 1, items, hasNextPage: false, endCursor: null, append: false,
    });
    const s1 = reduce(s0, { type: 'REMOVE_ITEM', projectNumber: 1, itemId: 'GHOST' });
    expect(s1.projectCache[1]?.items).toEqual(items);
  });
});

// ─── hasActiveFilters ─────────────────────────────────────────────────────────

describe('hasActiveFilters', () => {
  it('returns false for default empty filters', () => {
    expect(hasActiveFilters(defaultFilters)).toBe(false);
  });

  it.each([
    [{ ...defaultFilters, statusIds: ['S1'] }],
    [{ ...defaultFilters, priorityNames: ['High'] }],
    [{ ...defaultFilters, types: ['ISSUE' as const] }],
    [{ ...defaultFilters, searchQuery: 'foo' }],
  ] as [ItemFilters][])('returns true when any filter is set (%o)', (f) => {
    expect(hasActiveFilters(f)).toBe(true);
  });
});
