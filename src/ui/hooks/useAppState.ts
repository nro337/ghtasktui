import { createContext, useContext, useReducer, type Dispatch } from 'react';
import type { Project, Item, Field } from '../../gh/types.js';
import type { Config } from '../../config/config.js';

export interface ItemFilters {
  statusIds: string[];
  priorityNames: string[];
  types: Array<'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE'>;
  searchQuery: string;
}

export const defaultFilters: ItemFilters = {
  statusIds: [],
  priorityNames: [],
  types: [],
  searchQuery: '',
};

export function hasActiveFilters(f: ItemFilters): boolean {
  return (
    f.statusIds.length > 0 ||
    f.priorityNames.length > 0 ||
    f.types.length > 0 ||
    f.searchQuery.length > 0
  );
}

export type AppView =
  | 'PROJECT_LIST'
  | 'LIST'
  | 'BOARD'
  | 'ITEM_DETAIL'
  | 'ITEM_FORM'
  | 'SETTINGS';

export interface ProjectCache {
  items: Item[];
  fields: Field[];
  itemsLoaded: boolean;
  fieldsLoaded: boolean;
  // Pagination
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface AppState {
  view: AppView;
  activeProject: Project | null;
  selectedItem: Item | null;
  owner: string;
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  helpOpen: boolean;
  loading: boolean;
  toast: { message: string; kind: 'info' | 'success' | 'error' } | null;
  config: Config;
  // Global project list (sidebar)
  projects: Project[];
  projectsLoaded: boolean;
  // Filters applied to List / Board views
  filters: ItemFilters;
  filterOverlayOpen: boolean;
  // True while a view has a text input field focused (search bar, inline edit, etc.)
  // Used by the global App handler to suppress single-key shortcuts.
  searchMode: boolean;
  // Pre-populate the item creation form (e.g. from board column)
  formDefaults: { statusId?: string | undefined } | null;
  // Cache: keyed by project number
  projectCache: Record<number, ProjectCache>;
}

export type AppAction =
  | { type: 'NAVIGATE'; view: AppView }
  | { type: 'SET_PROJECT'; project: Project }
  | { type: 'SET_ITEM'; item: Item }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_COMMAND_PALETTE' }
  | { type: 'TOGGLE_HELP' }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SHOW_TOAST'; message: string; kind: 'info' | 'success' | 'error' }
  | { type: 'CLEAR_TOAST' }
  | { type: 'SET_PROJECTS'; projects: Project[] }
  | { type: 'SET_FORM_DEFAULTS'; defaults: AppState['formDefaults'] }
  | { type: 'SET_FILTERS'; filters: Partial<ItemFilters> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'TOGGLE_FILTER_OVERLAY' }
  | { type: 'SET_SEARCH_MODE'; active: boolean }
  | {
      type: 'CACHE_ITEMS';
      projectNumber: number;
      items: Item[];
      hasNextPage: boolean;
      endCursor: string | null;
      append: boolean;
    }
  | {
      type: 'CACHE_FIELDS';
      projectNumber: number;
      fields: Field[];
    }
  | { type: 'UPSERT_ITEM'; projectNumber: number; item: Item }
  | { type: 'REMOVE_ITEM'; projectNumber: number; itemId: string }
  | { type: 'SET_OWNER'; owner: string };

function emptyProjectCache(): ProjectCache {
  return {
    items: [],
    fields: [],
    itemsLoaded: false,
    fieldsLoaded: false,
    hasNextPage: false,
    endCursor: null,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, view: action.view };

    case 'SET_PROJECT':
      return { ...state, activeProject: action.project };

    case 'SET_ITEM':
      return { ...state, selectedItem: action.item };

    case 'SET_OWNER':
      return { ...state, owner: action.owner };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case 'TOGGLE_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: !state.commandPaletteOpen };

    case 'TOGGLE_HELP':
      return { ...state, helpOpen: !state.helpOpen };

    case 'SET_PROJECTS':
      return { ...state, projects: action.projects, projectsLoaded: true };

    case 'SET_FORM_DEFAULTS':
      return { ...state, formDefaults: action.defaults };

    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.filters } };

    case 'CLEAR_FILTERS':
      return { ...state, filters: defaultFilters };

    case 'TOGGLE_FILTER_OVERLAY':
      return { ...state, filterOverlayOpen: !state.filterOverlayOpen };

    case 'SET_SEARCH_MODE':
      return { ...state, searchMode: action.active };

    case 'SET_LOADING':
      return { ...state, loading: action.loading };

    case 'SHOW_TOAST':
      return { ...state, toast: { message: action.message, kind: action.kind } };

    case 'CLEAR_TOAST':
      return { ...state, toast: null };

    case 'CACHE_ITEMS': {
      const existing = state.projectCache[action.projectNumber] ?? emptyProjectCache();
      const items = action.append
        ? [...existing.items, ...action.items]
        : action.items;
      return {
        ...state,
        projectCache: {
          ...state.projectCache,
          [action.projectNumber]: {
            ...existing,
            items,
            itemsLoaded: true,
            hasNextPage: action.hasNextPage,
            endCursor: action.endCursor,
          },
        },
      };
    }

    case 'CACHE_FIELDS': {
      const existing = state.projectCache[action.projectNumber] ?? emptyProjectCache();
      return {
        ...state,
        projectCache: {
          ...state.projectCache,
          [action.projectNumber]: {
            ...existing,
            fields: action.fields,
            fieldsLoaded: true,
          },
        },
      };
    }

    case 'UPSERT_ITEM': {
      const existing = state.projectCache[action.projectNumber] ?? emptyProjectCache();
      const idx = existing.items.findIndex(i => i.id === action.item.id);
      const items =
        idx >= 0
          ? existing.items.map((i, n) => (n === idx ? action.item : i))
          : [...existing.items, action.item];
      return {
        ...state,
        projectCache: {
          ...state.projectCache,
          [action.projectNumber]: { ...existing, items },
        },
        selectedItem:
          state.selectedItem?.id === action.item.id
            ? action.item
            : state.selectedItem,
      };
    }

    case 'REMOVE_ITEM': {
      const existing = state.projectCache[action.projectNumber] ?? emptyProjectCache();
      return {
        ...state,
        projectCache: {
          ...state.projectCache,
          [action.projectNumber]: {
            ...existing,
            items: existing.items.filter(i => i.id !== action.itemId),
          },
        },
        selectedItem:
          state.selectedItem?.id === action.itemId ? null : state.selectedItem,
      };
    }

    default:
      return state;
  }
}

export function initialState(config: Config): AppState {
  return {
    view: 'PROJECT_LIST',
    activeProject: null,
    selectedItem: null,
    owner: config.general.defaultOwner,
    sidebarOpen: true,
    commandPaletteOpen: false,
    helpOpen: false,
    loading: false,
    toast: null,
    config,
    projects: [],
    projectsLoaded: false,
    filters: defaultFilters,
    filterOverlayOpen: false,
    searchMode: false,
    formDefaults: null,
    projectCache: {},
  };
}

export interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppContext.Provider');
  return ctx;
}

export function useAppState() {
  return useAppContext().state;
}

export function useDispatch() {
  return useAppContext().dispatch;
}

// Custom hook to get cached data for a project with a dispatch-bound load trigger
export function useProjectCache(projectNumber: number | null) {
  const { state } = useAppContext();
  if (projectNumber === null) return null;
  return state.projectCache[projectNumber] ?? null;
}
