import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppContext, useAppState } from '../hooks/useAppState.js';
import {
  useItemsLoader,
  useFieldsLoader,
  useItemMutations,
} from '../hooks/useGH.js';
import { colors, priorityColors, statusColors } from '../theme/theme.js';
import { getIcons } from '../theme/icons.js';
import {
  findField,
  groupItemsByStatus,
  buildFlatRows,
  getGroupKeyForRow,
  getItemOption,
  getItemOptionId,
  type FlatRow,
} from '../utils/fields.js';
import { relativeTime } from '../utils/time.js';
import { filterItems } from '../utils/filterItems.js';
import { hasActiveFilters } from '../hooks/useAppState.js';
import * as client from '../../gh/client.js';
import SelectPicker from '../components/SelectPicker.js';
import InlineTextInput from '../components/InlineTextInput.js';
import ItemDetailPanel from '../components/ItemDetailPanel.js';
import Spinner from '../components/Spinner.js';
import type { Item, Field, FieldValue } from '../../gh/types.js';

type ActivePicker = 'status' | 'priority' | null;

export default function ListView() {
  const state = useAppState();
  const { dispatch } = useAppContext();
  const icons = getIcons(state.config.appearance.nerdFonts);

  const projectNumber = state.activeProject?.number ?? 0;
  const { items, itemsLoaded, hasNextPage, loadItems, refresh } = useItemsLoader(projectNumber);
  const { fields, fieldsLoaded, loadFields } = useFieldsLoader(projectNumber);
  const { deleteItem, editField, editTitle } = useItemMutations(projectNumber);

  // Load lazily on mount (stable ref pattern avoids effect re-firing)
  const loadItemsRef = useRef(loadItems);
  const loadFieldsRef = useRef(loadFields);
  loadItemsRef.current = loadItems;
  loadFieldsRef.current = loadFields;
  useEffect(() => {
    void loadItemsRef.current();
    void loadFieldsRef.current();
  }, []);

  const statusField   = useMemo(() => findField(fields, 'Status'),   [fields]);
  const priorityField = useMemo(() => findField(fields, 'Priority'), [fields]);

  const filteredItems = useMemo(
    () => filterItems(items, state.filters, fields),
    [items, state.filters, fields],
  );

  const groups = useMemo(
    () => groupItemsByStatus(filteredItems, statusField),
    [filteredItems, statusField],
  );

  const [collapsed, setCollapsed]  = useState<Set<string>>(new Set());
  const [cursor, setCursor]        = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const searchMode = state.searchMode;
  const setSearchMode = (active: boolean) => dispatch({ type: 'SET_SEARCH_MODE', active });
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [editingId, setEditingId]  = useState<string | null>(null);
  const [editDraft, setEditDraft]  = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => buildFlatRows(groups, collapsed), [groups, collapsed]);

  // Clamp cursor after data changes
  const effectiveCursor = Math.min(cursor, Math.max(0, rows.length - 1));

  // Scroll: keep cursor in view
  const termHeight = process.stdout.rows;
  // Reserve rows for header (1) + statusbar (1) + picker/form at bottom (~5) + padding
  const listHeight = Math.max(5, termHeight - 7);
  useEffect(() => {
    if (effectiveCursor < scrollOffset) {
      setScrollOffset(effectiveCursor);
    } else if (effectiveCursor >= scrollOffset + listHeight) {
      setScrollOffset(effectiveCursor - listHeight + 1);
    }
  }, [effectiveCursor, scrollOffset, listHeight]);

  const selectedRow = rows[effectiveCursor];
  const selectedItem: Item | null =
    selectedRow?.kind === 'item' ? selectedRow.item : null;

  // Sync selectedItem to global state for other components (detail panel, statusbar)
  useEffect(() => {
    if (selectedItem) {
      dispatch({ type: 'SET_ITEM', item: selectedItem });
    }
  }, [selectedItem?.id, dispatch]);

  // Split panel: show detail when item selected and terminal is wide enough
  const termWidth = process.stdout.columns;
  const detailRatio = state.config.appearance.detailPanelRatio;
  const showSplit = selectedItem !== null && termWidth >= 110;
  const detailWidth = Math.floor(termWidth * detailRatio);

  const overlayOpen = state.commandPaletteOpen || state.helpOpen;
  const pickerOpen = activePicker !== null;
  const editing = editingId !== null;
  const confirming = confirmDeleteId !== null;
  const mainInputActive = !overlayOpen && !pickerOpen && !editing && !confirming && !searchMode;

  // ── Main keyboard handler ──────────────────────────────────────────────────
  useInput(
    (input, key) => {
      // Navigation
      if (key.upArrow) {
        setCursor(c => Math.max(0, c - 1));
        return;
      }
      if (key.downArrow) {
        setCursor(c => Math.min(rows.length - 1, c + 1));
        return;
      }

      // Collapse/expand
      if (key.leftArrow) {
        const groupKey = getGroupKeyForRow(rows, effectiveCursor);
        if (groupKey) setCollapsed(prev => new Set([...prev, groupKey]));
        return;
      }
      if (key.rightArrow) {
        const groupKey = getGroupKeyForRow(rows, effectiveCursor);
        if (groupKey) setCollapsed(prev => { const s = new Set(prev); s.delete(groupKey); return s; });
        return;
      }

      // Open detail full-screen (when split isn't shown)
      if (key.return && selectedItem) {
        if (!showSplit) {
          dispatch({ type: 'NAVIGATE', view: 'ITEM_DETAIL' });
        }
        // In split mode, detail is already visible
        return;
      }

      // Back
      if (key.escape) {
        if (selectedItem && showSplit) {
          dispatch({ type: 'SET_ITEM', item: selectedItem }); // no-op, just deselect
          setCursor(c => c); // trigger re-render without item detail
        } else {
          dispatch({ type: 'NAVIGATE', view: 'PROJECT_LIST' });
        }
        return;
      }

      switch (input.toLowerCase()) {
        case '/':
          setSearchMode(true);
          return;

        case 'f':
          dispatch({ type: 'TOGGLE_FILTER_OVERLAY' });
          return;

        case 'n':
          dispatch({ type: 'SET_FORM_DEFAULTS', defaults: null });
          dispatch({ type: 'NAVIGATE', view: 'ITEM_FORM' });
          return;
      }

      // Actions on selected item
      if (!selectedItem) return;

      switch (input.toLowerCase()) {
        case 'e':
          setEditDraft(selectedItem.title);
          setEditingId(selectedItem.id);
          break;

        case 'd':
          setConfirmDeleteId(selectedItem.id);
          break;

        case 's':
          if (statusField) setActivePicker('status');
          break;

        case 'p':
          if (priorityField) setActivePicker('priority');
          break;

        case 'o': {
          const url = selectedItem.content?.url ?? state.activeProject?.url;
          if (url) void client.openInBrowser(url).catch(() => null);
          break;
        }

        case 'r':
          if (key.ctrl) void refresh();
          break;

        case 'c':
          if (hasActiveFilters(state.filters)) {
            dispatch({ type: 'CLEAR_FILTERS' });
          }
          break;
      }

      // G G / G B jumps
      if (input === 'g') {
        setCursor(0);
      }
    },
    { isActive: mainInputActive },
  );

  // ── Search mode input ──────────────────────────────────────────────────────
  useInput(
    (input, key) => {
      if (key.escape) {
        dispatch({ type: 'SET_FILTERS', filters: { searchQuery: '' } });
        setSearchMode(false);
        return;
      }
      if (key.return) {
        setSearchMode(false);
        return;
      }
      if (key.backspace || key.delete) {
        dispatch({ type: 'SET_FILTERS', filters: { searchQuery: state.filters.searchQuery.slice(0, -1) } });
        return;
      }
      if (!key.ctrl && !key.meta && !key.tab && input) {
        dispatch({ type: 'SET_FILTERS', filters: { searchQuery: state.filters.searchQuery + input } });
      }
    },
    { isActive: searchMode },
  );

  // ── Confirm delete ─────────────────────────────────────────────────────────
  useInput(
    (input, key) => {
      if (input.toLowerCase() === 'y' && confirmDeleteId) {
        void deleteItem(confirmDeleteId);
        setConfirmDeleteId(null);
      }
      if (input.toLowerCase() === 'n' || key.escape) {
        setConfirmDeleteId(null);
      }
    },
    { isActive: confirming },
  );

  // ── Picker select ──────────────────────────────────────────────────────────
  const handlePickerSelect = useCallback(
    async (option: { id: string; name: string }) => {
      setActivePicker(null);
      if (!activePicker || !selectedItem) return;
      const field = activePicker === 'status' ? statusField : priorityField;
      if (!field) return;
      const value: FieldValue = { type: 'singleSelect', optionId: option.id };
      await editField(selectedItem, field.id, value);
    },
    [activePicker, selectedItem, statusField, priorityField, editField],
  );

  // ── Early returns ──────────────────────────────────────────────────────────
  if (!state.activeProject) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text color={colors.textMuted}>No project selected</Text>
      </Box>
    );
  }

  if (!itemsLoaded || !fieldsLoaded) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Spinner label="Loading items…" />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column" gap={1}>
        <Text color={colors.textSecondary}>No items in this project</Text>
        <Text color={colors.textMuted}><Text color={colors.textSecondary}>N</Text> to create one</Text>
      </Box>
    );
  }

  const visibleRows = rows.slice(scrollOffset, scrollOffset + listHeight);

  return (
    <Box flexGrow={1} flexDirection="row">
      {/* ── List panel ──────────────────────────────────────────────────── */}
      <Box flexGrow={1} flexDirection="column">
        {visibleRows.map((row, visIdx) => {
          const absIdx = scrollOffset + visIdx;
          const isCursor = absIdx === effectiveCursor;

          if (row.kind === 'header') {
            return (
              <GroupHeader
                key={row.key}
                row={row}
                isCursor={isCursor}
                collapsed={collapsed.has(row.key)}
                icons={icons}
              />
            );
          }

          const isInlineEdit = row.item.id === editingId;
          return (
            <ItemRow
              key={row.key}
              item={row.item}
              isCursor={isCursor}
              statusField={statusField}
              priorityField={priorityField}
              fields={fields}
              icons={icons}
              isEditing={isInlineEdit}
              editDraft={editDraft}
              onEditChange={setEditDraft}
              onEditSubmit={async val => {
                setEditingId(null);
                if (val.trim() && val.trim() !== row.item.title) {
                  await editTitle(row.item, val.trim());
                }
              }}
              onEditCancel={() => setEditingId(null)}
            />
          );
        })}

        {/* Load more hint */}
        {hasNextPage && (
          <Box marginTop={1} paddingLeft={2}>
            <Text color={colors.textMuted}>
              More items available —{' '}
              <Text color={colors.textSecondary}>Tab</Text> to load
            </Text>
          </Box>
        )}

        <Box flexGrow={1} />

        {/* Delete confirm */}
        {confirmDeleteId && (
          <Box borderStyle="round" borderColor={colors.priorityUrgent} paddingX={1} marginX={1}>
            <Text color={colors.priorityUrgent}>Delete item? </Text>
            <Text color={colors.textPrimary} bold>Y</Text>
            <Text color={colors.textSecondary}> yes  </Text>
            <Text color={colors.textPrimary} bold>N</Text>
            <Text color={colors.textSecondary}> no</Text>
          </Box>
        )}

        {/* Pickers */}
        {activePicker === 'status' && statusField && (
          <SelectPicker
            title="Set Status"
            options={statusField.options}
            currentId={selectedItem ? getItemOptionId(selectedItem, statusField) : undefined}
            onSelect={handlePickerSelect}
            onCancel={() => setActivePicker(null)}
          />
        )}
        {activePicker === 'priority' && priorityField && (
          <SelectPicker
            title="Set Priority"
            options={priorityField.options}
            currentId={selectedItem ? getItemOptionId(selectedItem, priorityField) : undefined}
            onSelect={handlePickerSelect}
            onCancel={() => setActivePicker(null)}
          />
        )}

        {/* Search bar */}
        {searchMode && (
          <Box paddingX={1} gap={1} marginTop={1}>
            <Text color={colors.accentPurple}>/</Text>
            <Text color={state.filters.searchQuery ? colors.textPrimary : colors.textMuted}>
              {state.filters.searchQuery || 'type to search…'}
            </Text>
            <Text color={colors.accentPurple}>█</Text>
            <Text color={colors.textMuted}>  Enter confirm  Esc cancel</Text>
          </Box>
        )}

        {/* Active filter indicator */}
        {hasActiveFilters(state.filters) && !searchMode && (
          <Box paddingX={1} gap={1} marginTop={1}>
            <Text color={colors.accentPurpleLight}>Filters active</Text>
            {state.filters.searchQuery && (
              <Text color={colors.textMuted}>search: "{state.filters.searchQuery}"</Text>
            )}
            <Text color={colors.textMuted}>
              — <Text color={colors.textSecondary}>F</Text> edit  <Text color={colors.textSecondary}>C</Text> clear
            </Text>
          </Box>
        )}

        {/* Bottom key hints */}
        <Box paddingX={1} marginTop={1} gap={1} flexWrap="wrap">
          <Hint k="↑↓" label="navigate" />
          <Hint k="Enter" label="detail" />
          <Hint k="N" label="new" />
          <Hint k="E" label="edit" />
          <Hint k="D" label="delete" />
          <Hint k="S" label="status" />
          <Hint k="P" label="priority" />
          <Hint k="/" label="search" />
          <Hint k="F" label="filter" />
        </Box>
      </Box>

      {/* ── Detail panel (split) ────────────────────────────────────────── */}
      {showSplit && selectedItem && (
        <Box
          width={detailWidth}
          flexDirection="column"
          borderStyle="single"
          borderColor={colors.border}
          borderTop={false}
          borderBottom={false}
          borderRight={false}
        >
          <ItemDetailPanel
            item={selectedItem}
            fields={fields}
            projectNumber={projectNumber}
            onClose={() => {
              // In split mode, closing detail just moves focus back to list
              setActivePicker(null);
            }}
            isActive={!overlayOpen && !pickerOpen && !searchMode}
          />
        </Box>
      )}
    </Box>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function GroupHeader({
  row,
  isCursor,
  collapsed,
  icons,
}: {
  row: Extract<FlatRow, { kind: 'header' }>;
  isCursor: boolean;
  collapsed: boolean;
  icons: ReturnType<typeof getIcons>;
}) {
  const labelColor = row.color ? `#${row.color}` : colors.textMuted;
  return (
    <Box gap={1} paddingLeft={1}>
      <Text color={isCursor ? colors.accentPurple : colors.textMuted}>
        {collapsed ? icons.chevronRight : icons.chevronDown}
      </Text>
      <Text color={labelColor} bold>{row.label}</Text>
      <Text color={colors.textMuted}>{row.count}</Text>
    </Box>
  );
}

function ItemRow({
  item,
  isCursor,
  statusField,
  priorityField,
  fields: _fields,
  icons,
  isEditing,
  editDraft,
  onEditChange,
  onEditSubmit,
  onEditCancel,
}: {
  item: Item;
  isCursor: boolean;
  statusField: Field | undefined;
  priorityField: Field | undefined;
  fields: Field[];
  icons: ReturnType<typeof getIcons>;
  isEditing: boolean;
  editDraft: string;
  onEditChange: (v: string) => void;
  onEditSubmit: (v: string) => Promise<void>;
  onEditCancel: () => void;
}) {
  const priorityOption = priorityField ? getItemOption(item, priorityField) : undefined;
  const statusOption   = statusField   ? getItemOption(item, statusField)   : undefined;

  const priorityIcon  = getPriorityIcon(priorityOption?.name, icons);
  const priorityColor = priorityColors[priorityOption?.name?.toLowerCase() ?? ''] ?? colors.textMuted;
  const typeIcon      = getTypeIcon(item.type, icons);
  const statusColor   = statusColors[statusOption?.name?.toLowerCase() ?? ''] ?? colors.textSecondary;

  const idStr = item.content ? `#${item.content.number}` : '';
  const dateStr = relativeTime(item.updatedAt);
  const assignee = item.assignees[0]?.login ?? '';

  return (
    <Box
      gap={1}
      paddingLeft={1}
      paddingRight={1}
    >
      {/* Cursor indicator */}
      <Text color={isCursor ? colors.accentPurpleLight : 'transparent'}>{isCursor ? '▶' : ' '}</Text>

      {/* Priority */}
      <Box width={2}>
        <Text color={priorityColor}>{priorityIcon}</Text>
      </Box>

      {/* Type */}
      <Box width={1}>
        <Text color={isCursor ? colors.textSecondary : colors.textMuted}>{typeIcon}</Text>
      </Box>

      {/* ID */}
      <Box width={6}>
        <Text color={isCursor ? colors.textSecondary : colors.textMuted}>{idStr}</Text>
      </Box>

      {/* Title (grows) */}
      <Box flexGrow={1} overflow="hidden">
        {isEditing ? (
          <InlineTextInput
            value={editDraft}
            onChange={onEditChange}
            onSubmit={onEditSubmit}
            onCancel={onEditCancel}
          />
        ) : (
          <Text
            color={isCursor ? colors.textPrimary : colors.textSecondary}
            bold={isCursor}
          >
            {item.title}
          </Text>
        )}
      </Box>

      {/* Status */}
      <Box width={12}>
        <Text color={isCursor ? colors.textPrimary : statusColor}>
          {statusOption?.name ?? ''}
        </Text>
      </Box>

      {/* Assignee */}
      <Box width={10}>
        <Text color={isCursor ? colors.textSecondary : colors.textMuted}>
          {assignee ? `@${assignee.slice(0, 8)}` : ''}
        </Text>
      </Box>

      {/* Date */}
      <Box width={4}>
        <Text color={isCursor ? colors.textSecondary : colors.textMuted}>{dateStr}</Text>
      </Box>
    </Box>
  );
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <Text color={colors.textMuted}>
      <Text color={colors.textSecondary}>{k}</Text> {label}
    </Text>
  );
}

function getPriorityIcon(name: string | undefined, icons: ReturnType<typeof getIcons>): string {
  switch (name?.toLowerCase()) {
    case 'urgent': return icons.urgent;
    case 'high':   return icons.high;
    case 'medium': return icons.medium;
    case 'low':    return icons.low;
    default:       return icons.noPriority;
  }
}

function getTypeIcon(type: Item['type'], icons: ReturnType<typeof getIcons>): string {
  switch (type) {
    case 'ISSUE':        return icons.issue;
    case 'PULL_REQUEST': return icons.pullRequest;
    case 'DRAFT_ISSUE':  return icons.draftIssue;
  }
}
