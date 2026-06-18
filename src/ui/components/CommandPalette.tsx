import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Fuse from 'fuse.js';
import { useAppContext, hasActiveFilters, type AppState } from '../hooks/useAppState.js';
import type { AppAction } from '../hooks/useAppState.js';
import { colors } from '../theme/theme.js';
import { getIcons } from '../theme/icons.js';
import { truncate } from '../utils/text.js';
import type { Dispatch } from 'react';

// ── Command type ────────────────────────────────────────────────────────────

interface Command {
  id: string;
  label: string;
  secondary?: string | undefined;
  category: 'navigation' | 'action' | 'item';
  hint?: string;
  action: () => void;
}

const CATEGORY_LABEL: Record<Command['category'], string> = {
  navigation: 'NAVIGATION',
  action:     'ACTIONS',
  item:       'ITEMS',
};

// ── Build commands from state ────────────────────────────────────────────────

function buildCommands(
  state: AppState,
  dispatch: Dispatch<AppAction>,
): Command[] {
  const cmds: Command[] = [];

  // ── Navigation: projects ────────────────────────────────────────────────
  for (const project of state.projects) {
    const isActive = project.number === state.activeProject?.number;
    cmds.push({
      id: `nav-project-${project.number}`,
      label: project.title,
      secondary: isActive ? 'active' : `#${project.number}`,
      category: 'navigation',
      action: () => {
        dispatch({ type: 'SET_PROJECT', project });
        dispatch({
          type: 'NAVIGATE',
          view: state.config.general.defaultView === 'board' ? 'BOARD' : 'LIST',
        });
        dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
      },
    });
  }

  // ── Actions ─────────────────────────────────────────────────────────────
  if (state.activeProject) {
    cmds.push({
      id: 'new-item',
      label: 'Create new item',
      category: 'action',
      hint: 'N',
      action: () => {
        dispatch({ type: 'SET_FORM_DEFAULTS', defaults: null });
        dispatch({ type: 'NAVIGATE', view: 'ITEM_FORM' });
        dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
      },
    });

    const isBoard = state.view === 'BOARD';
    cmds.push({
      id: 'toggle-view',
      label: isBoard ? 'Switch to list view' : 'Switch to board view',
      category: 'action',
      hint: 'V',
      action: () => {
        dispatch({ type: 'NAVIGATE', view: isBoard ? 'LIST' : 'BOARD' });
        dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
      },
    });

    cmds.push({
      id: 'filter',
      label: 'Filter items',
      secondary: hasActiveFilters(state.filters) ? 'active' : undefined,
      category: 'action',
      hint: 'F',
      action: () => {
        dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
        dispatch({ type: 'TOGGLE_FILTER_OVERLAY' });
      },
    });

    if (hasActiveFilters(state.filters)) {
      cmds.push({
        id: 'clear-filters',
        label: 'Clear all filters',
        category: 'action',
        action: () => {
          dispatch({ type: 'CLEAR_FILTERS' });
          dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
        },
      });
    }
  }

  cmds.push({
    id: 'toggle-sidebar',
    label: state.sidebarOpen ? 'Hide sidebar' : 'Show sidebar',
    category: 'action',
    hint: 'B',
    action: () => {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
      dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
    },
  });

  cmds.push({
    id: 'settings',
    label: 'Settings',
    category: 'action',
    action: () => {
      dispatch({ type: 'NAVIGATE', view: 'SETTINGS' });
      dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
    },
  });

  cmds.push({
    id: 'help',
    label: 'Keyboard shortcuts',
    category: 'action',
    hint: '?',
    action: () => {
      dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
      dispatch({ type: 'TOGGLE_HELP' });
    },
  });

  // ── Items: most-recently-updated from active project ─────────────────────
  if (state.activeProject) {
    const cache = state.projectCache[state.activeProject.number];
    const items = (cache?.items ?? [])
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 30);

    for (const item of items) {
      const idStr = item.content ? `#${item.content.number}` : '';
      cmds.push({
        id: `item-${item.id}`,
        label: [idStr, item.title].filter(Boolean).join(' '),
        secondary: item.type === 'PULL_REQUEST' ? 'PR' : item.type === 'ISSUE' ? 'issue' : 'draft',
        category: 'item',
        action: () => {
          dispatch({ type: 'SET_ITEM', item });
          dispatch({ type: 'NAVIGATE', view: 'ITEM_DETAIL' });
          dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
        },
      });
    }
  }

  return cmds;
}

// ── CommandPalette component ─────────────────────────────────────────────────

const VISIBLE = 14;

export default function CommandPalette() {
  const { state, dispatch } = useAppContext();
  const icons = getIcons(state.config.appearance.nerdFonts);

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [scroll, setScroll] = useState(0);

  const commands = useMemo(
    () => buildCommands(state, dispatch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.projects, state.activeProject, state.view, state.filters,
     state.projectCache, state.sidebarOpen, state.config],
  );

  const fuse = useMemo(
    () => new Fuse(commands, { keys: ['label', 'secondary'], threshold: 0.4 }),
    [commands],
  );

  const results: Command[] = query
    ? fuse.search(query).map(r => r.item)
    : commands;

  const effectiveCursor = Math.min(cursor, Math.max(0, results.length - 1));

  // Scroll to follow cursor
  useEffect(() => {
    if (effectiveCursor < scroll) setScroll(effectiveCursor);
    else if (effectiveCursor >= scroll + VISIBLE) setScroll(effectiveCursor - VISIBLE + 1);
  }, [effectiveCursor, scroll]);

  useInput((input, key) => {
    if (key.escape) { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); return; }
    if (key.upArrow)   { setCursor(c => Math.max(0, c - 1)); return; }
    if (key.downArrow) { setCursor(c => Math.min(results.length - 1, c + 1)); return; }
    if (key.return) {
      const cmd = results[effectiveCursor];
      if (cmd) cmd.action();
      return;
    }
    if (key.backspace || key.delete) {
      setQuery(q => q.slice(0, -1));
      setCursor(0); setScroll(0);
      return;
    }
    if (!key.ctrl && !key.meta && !key.tab && input) {
      setQuery(q => q + input);
      setCursor(0); setScroll(0);
    }
  });

  const visibleResults = results.slice(scroll, scroll + VISIBLE);
  const termWidth = process.stdout.columns;
  const divider = '─'.repeat(Math.max(10, Math.min(72, termWidth - 4)));

  return (
    <Box flexDirection="column" height={process.stdout.rows} paddingX={2} paddingY={1}>
      {/* Header */}
      <Box gap={1} marginBottom={1}>
        <Text color={colors.accentPurple} bold>{icons.app}</Text>
        <Text color={colors.textPrimary} bold>Command Palette</Text>
        {results.length > 0 && (
          <Text color={colors.textMuted}>— {results.length} result{results.length !== 1 ? 's' : ''}</Text>
        )}
      </Box>

      {/* Search input */}
      <Box gap={1} marginBottom={1}>
        <Text color={colors.accentPurple}>›</Text>
        <Text color={query ? colors.textPrimary : colors.textMuted}>
          {query || 'Search commands, projects, items…'}
        </Text>
        <Text color={colors.accentPurple}>█</Text>
      </Box>

      <Text color={colors.border}>{divider}</Text>

      {/* Results */}
      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        {visibleResults.length === 0 && (
          <Text color={colors.textMuted}>  No results for "{query}"</Text>
        )}
        {renderResults(visibleResults, effectiveCursor, scroll, !!query, icons, termWidth)}
      </Box>

      {/* Footer */}
      <Text color={colors.border}>{divider}</Text>
      <Box marginTop={1} gap={2}>
        <Text color={colors.textMuted}><Text color={colors.textSecondary}>↑↓</Text> navigate</Text>
        <Text color={colors.textMuted}><Text color={colors.textSecondary}>Enter</Text> execute</Text>
        <Text color={colors.textMuted}><Text color={colors.textSecondary}>Esc</Text> close</Text>
        <Text color={colors.textMuted}>Type to search</Text>
      </Box>
    </Box>
  );
}

// ── Render helpers ────────────────────────────────────────────────────────────

function renderResults(
  visible: Command[],
  effectiveCursor: number,
  scroll: number,
  isSearching: boolean,
  icons: ReturnType<typeof getIcons>,
  termWidth: number,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastCategory: Command['category'] | null = null;

  visible.forEach((cmd, visIdx) => {
    const absIdx = visIdx + scroll;
    const isSelected = absIdx === effectiveCursor;

    // Category header (only when not actively searching)
    if (!isSearching && cmd.category !== lastCategory) {
      lastCategory = cmd.category;
      nodes.push(
        <Box key={`hdr-${cmd.category}`} marginTop={lastCategory !== cmd.category ? 1 : 0}>
          <Text color={colors.textMuted} bold>  {CATEGORY_LABEL[cmd.category]}</Text>
        </Box>,
      );
    }

    const labelWidth = termWidth - 20;
    nodes.push(
      <Box key={cmd.id} gap={1} justifyContent="space-between">
        <Box gap={1}>
          <Text color={isSelected ? colors.accentPurple : colors.textMuted}>
            {isSelected ? '›' : ' '}
          </Text>
          {isSearching && (
            <Text color={colors.textMuted}>
              {cmd.category === 'navigation' ? icons.project :
               cmd.category === 'action'     ? '⚡' : icons.issue}
            </Text>
          )}
          <Text color={isSelected ? colors.textPrimary : colors.textSecondary} bold={isSelected}>
            {truncate(cmd.label, labelWidth)}
          </Text>
          {cmd.secondary && (
            <Text color={colors.textMuted}>{cmd.secondary}</Text>
          )}
        </Box>
        {cmd.hint && (
          <Text color={colors.accentPurpleLight}>{cmd.hint}</Text>
        )}
      </Box>,
    );
  });

  return nodes;
}
