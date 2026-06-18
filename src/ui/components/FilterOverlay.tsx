import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppContext } from '../hooks/useAppState.js';
import { colors } from '../theme/theme.js';
import { findField } from '../utils/fields.js';
import { truncate } from '../utils/text.js';
import type { Item } from '../../gh/types.js';

// ── Filter option row types ──────────────────────────────────────────────────

type FilterCategory = 'status' | 'priority' | 'type';

interface FilterOption {
  category: FilterCategory;
  id: string;         // optionId for status/priority, item type string for type
  label: string;
  color?: string | undefined;
}

const TYPE_OPTIONS: FilterOption[] = [
  { category: 'type', id: 'ISSUE',        label: 'Issue' },
  { category: 'type', id: 'PULL_REQUEST', label: 'Pull Request' },
  { category: 'type', id: 'DRAFT_ISSUE',  label: 'Draft Issue' },
];

// ── FilterOverlay ─────────────────────────────────────────────────────────────

export default function FilterOverlay() {
  const { state, dispatch } = useAppContext();
  const { filters } = state;

  // Load fields from active project cache to get status/priority options
  const fields = useMemo(() => {
    if (!state.activeProject) return [];
    return state.projectCache[state.activeProject.number]?.fields ?? [];
  }, [state.activeProject, state.projectCache]);

  const statusField   = findField(fields, 'Status');
  const priorityField = findField(fields, 'Priority');

  // Build the flat list of toggle options
  const options: FilterOption[] = useMemo(() => {
    const opts: FilterOption[] = [];
    if (statusField) {
      for (const opt of statusField.options) {
        opts.push({ category: 'status', id: opt.id, label: opt.name, color: opt.color });
      }
    }
    if (priorityField) {
      for (const opt of priorityField.options) {
        opts.push({ category: 'priority', id: opt.id, label: opt.name });
      }
    }
    opts.push(...TYPE_OPTIONS);
    return opts;
  }, [statusField, priorityField]);

  const [cursor, setCursor] = useState(0);
  const effectiveCursor = Math.min(cursor, Math.max(0, options.length - 1));
  const focusedOpt = options[effectiveCursor];

  function isActive(opt: FilterOption): boolean {
    switch (opt.category) {
      case 'status':   return filters.statusIds.includes(opt.id);
      case 'priority': return filters.priorityNames.includes(opt.label.toLowerCase());
      case 'type':     return (filters.types as string[]).includes(opt.id);
    }
  }

  function toggle(opt: FilterOption) {
    switch (opt.category) {
      case 'status': {
        const ids = isActive(opt)
          ? filters.statusIds.filter(id => id !== opt.id)
          : [...filters.statusIds, opt.id];
        dispatch({ type: 'SET_FILTERS', filters: { statusIds: ids } });
        break;
      }
      case 'priority': {
        const name = opt.label.toLowerCase();
        const names = isActive(opt)
          ? filters.priorityNames.filter(n => n !== name)
          : [...filters.priorityNames, name];
        dispatch({ type: 'SET_FILTERS', filters: { priorityNames: names } });
        break;
      }
      case 'type': {
        const t = opt.id as Item['type'];
        const types = isActive(opt)
          ? filters.types.filter(x => x !== t)
          : [...filters.types, t];
        dispatch({ type: 'SET_FILTERS', filters: { types } });
        break;
      }
    }
  }

  useInput((input, key) => {
    if (key.escape) { dispatch({ type: 'TOGGLE_FILTER_OVERLAY' }); return; }
    if (key.upArrow)   { setCursor(c => Math.max(0, c - 1)); return; }
    if (key.downArrow) { setCursor(c => Math.min(options.length - 1, c + 1)); return; }
    if (input === ' ' && focusedOpt) { toggle(focusedOpt); return; }
    if (key.return) { dispatch({ type: 'TOGGLE_FILTER_OVERLAY' }); return; }
    if (input.toLowerCase() === 'c') {
      dispatch({ type: 'CLEAR_FILTERS' });
      return;
    }
  });

  const activeCount = filters.statusIds.length + filters.priorityNames.length + filters.types.length;

  return (
    <Box flexDirection="column" height={process.stdout.rows} paddingX={2} paddingY={1}>
      {/* Header */}
      <Box gap={1} marginBottom={1}>
        <Text color={colors.accentPurple} bold>Filter Items</Text>
        {activeCount > 0 && (
          <Text color={colors.accentPurpleLight}>
            — {activeCount} active
          </Text>
        )}
      </Box>

      {/* Sections */}
      <Box flexDirection="column" flexGrow={1}>
        {statusField && (
          <Section title="Status" options={options} category="status"
            cursor={effectiveCursor} isActive={isActive} />
        )}
        {priorityField && (
          <Section title="Priority" options={options} category="priority"
            cursor={effectiveCursor} isActive={isActive} />
        )}
        <Section title="Type" options={options} category="type"
          cursor={effectiveCursor} isActive={isActive} />
      </Box>

      {/* Search query display */}
      {filters.searchQuery && (
        <Box marginTop={1} gap={1}>
          <Text color={colors.textMuted}>Active search:</Text>
          <Text color={colors.textSecondary}>"{filters.searchQuery}"</Text>
          <Text color={colors.textMuted}>
            (press <Text color={colors.textSecondary}>/</Text> in list view to change)
          </Text>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={2} gap={2} flexWrap="wrap">
        <Text color={colors.textMuted}><Text color={colors.textSecondary}>↑↓</Text> navigate</Text>
        <Text color={colors.textMuted}><Text color={colors.textSecondary}>Space</Text> toggle</Text>
        <Text color={colors.textMuted}><Text color={colors.textSecondary}>Enter/Esc</Text> close</Text>
        <Text color={colors.textMuted}><Text color={colors.textSecondary}>C</Text> clear all</Text>
      </Box>
    </Box>
  );
}

// ── Section helper ────────────────────────────────────────────────────────────

function Section({
  title,
  options,
  category,
  cursor,
  isActive,
}: {
  title: string;
  options: FilterOption[];
  category: FilterCategory;
  cursor: number;
  isActive: (opt: FilterOption) => boolean;
}) {
  const catOptions = options.filter(o => o.category === category);
  if (catOptions.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={colors.textMuted} bold>{title.toUpperCase()}</Text>
      <Box flexDirection="row" flexWrap="wrap" gap={2} paddingLeft={1}>
        {catOptions.map(opt => {
          const absIdx = options.indexOf(opt);
          const isCursor = absIdx === cursor;
          const active = isActive(opt);
          const optColor = opt.color ? `#${opt.color}` : undefined;

          return (
            <Box key={opt.id} gap={1}>
              <Text color={isCursor ? colors.accentPurple : colors.textMuted}>
                {isCursor ? '›' : ' '}
              </Text>
              <Text color={active ? colors.accentPurpleLight : colors.border}>
                {active ? '[✓]' : '[ ]'}
              </Text>
              <Text
                color={optColor ?? (isCursor ? colors.textPrimary : colors.textSecondary)}
                bold={isCursor}
              >
                {truncate(opt.label, 14)}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
