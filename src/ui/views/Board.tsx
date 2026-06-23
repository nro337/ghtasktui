import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppContext, useAppState } from '../hooks/useAppState.js';
import {
  useItemsLoader,
  useFieldsLoader,
  useItemMutations,
} from '../hooks/useGH.js';
import { colors, priorityColors } from '../theme/theme.js';
import { getIcons } from '../theme/icons.js';
import {
  findField,
  groupItemsByStatus,
  getItemOption,
  getItemOptionId,
  type GroupedItems,
} from '../utils/fields.js';
import { truncate, normalizeColor } from '../utils/text.js';
import { filterItems } from '../utils/filterItems.js';
import { hasActiveFilters } from '../hooks/useAppState.js';
import * as client from '../../gh/client.js';
import SelectPicker from '../components/SelectPicker.js';
import InlineTextInput from '../components/InlineTextInput.js';
import Spinner from '../components/Spinner.js';
import type { Item, Field, FieldValue } from '../../gh/types.js';

// ── Layout constants ────────────────────────────────────────────────────────
const CARD_WIDTH   = 28;  // full column width (including separator border)
const CARD_ROWS    = 3;   // rows per card: title + meta + blank gap

type ActivePicker = 'move' | 'priority' | null;

// ── Board view ───────────────────────────────────────────────────────────────

export default function BoardView() {
  const state    = useAppState();
  const { dispatch } = useAppContext();
  const icons    = getIcons(state.config.appearance.nerdFonts);

  const projectNumber = state.activeProject?.number ?? 0;
  const { items, itemsLoaded, loadItems, refresh } = useItemsLoader(projectNumber);
  const { fields, fieldsLoaded, loadFields }       = useFieldsLoader(projectNumber);
  const { deleteItem, editField, editTitle }        = useItemMutations(projectNumber);

  // Load lazily on mount
  const loadItemsRef  = useRef(loadItems);
  const loadFieldsRef = useRef(loadFields);
  loadItemsRef.current  = loadItems;
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

  // ── Cursor ─────────────────────────────────────────────────────────────────
  const [colIdx, setColIdx] = useState(0);
  const [rowIdx, setRowIdx] = useState(0);

  const effectiveColIdx  = Math.min(colIdx, Math.max(0, groups.length - 1));
  const activeGroup      = groups[effectiveColIdx];
  const colItems         = activeGroup?.items ?? [];
  const effectiveRowIdx  = Math.min(rowIdx, Math.max(0, colItems.length - 1));
  const selectedItem: Item | null = colItems[effectiveRowIdx] ?? null;

  // ── Scroll ─────────────────────────────────────────────────────────────────
  const termWidth  = process.stdout.columns;
  const termHeight = process.stdout.rows;

  // Horizontal: how many columns fit?
  const boardWidth      = termWidth - (state.sidebarOpen ? state.config.appearance.sidebarWidth + 2 : 0);
  const visibleColCount = Math.max(1, Math.floor(boardWidth / CARD_WIDTH));
  const [colScrollOffset, setColScrollOffset] = useState(0);

  // Vertical: how many cards fit?
  const boardHeight      = Math.max(3, termHeight - 9); // header + col header + hints + statusbar
  const visibleCardCount = Math.max(1, Math.floor(boardHeight / CARD_ROWS));
  const [activeColCardOffset, setActiveColCardOffset] = useState(0);

  // Keep horizontal cursor visible
  useEffect(() => {
    if (effectiveColIdx < colScrollOffset) {
      setColScrollOffset(effectiveColIdx);
    } else if (effectiveColIdx >= colScrollOffset + visibleColCount) {
      setColScrollOffset(effectiveColIdx - visibleColCount + 1);
    }
  }, [effectiveColIdx, colScrollOffset, visibleColCount]);

  // Keep vertical cursor visible in active column
  useEffect(() => {
    if (effectiveRowIdx < activeColCardOffset) {
      setActiveColCardOffset(effectiveRowIdx);
    } else if (effectiveRowIdx >= activeColCardOffset + visibleCardCount) {
      setActiveColCardOffset(effectiveRowIdx - visibleCardCount + 1);
    }
  }, [effectiveRowIdx, activeColCardOffset, visibleCardCount]);

  // Reset vertical scroll when switching columns
  useEffect(() => {
    setActiveColCardOffset(0);
    // Clamp rowIdx to new column's length
    setRowIdx(r => {
      const newColItems = groups[effectiveColIdx]?.items ?? [];
      return Math.min(r, Math.max(0, newColItems.length - 1));
    });
  }, [effectiveColIdx, groups]);

  // Sync selectedItem to global state
  useEffect(() => {
    if (selectedItem) dispatch({ type: 'SET_ITEM', item: selectedItem });
  }, [selectedItem?.id, dispatch]);

  // ── Overlay state ──────────────────────────────────────────────────────────
  const [activePicker, setActivePicker]       = useState<ActivePicker>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [editDraft, setEditDraft]             = useState('');

  const overlayOpen     = state.commandPaletteOpen || state.helpOpen;
  const pickerOpen      = activePicker !== null;
  const confirming      = confirmDeleteId !== null;
  const editing         = editingId !== null;
  const mainInputActive = !overlayOpen && !pickerOpen && !confirming && !editing;

  // ── Main input ─────────────────────────────────────────────────────────────
  useInput(
    (input, key) => {
      const lower = input.toLowerCase();

      // Column navigation: ←/→ or h/l (case-insensitive)
      if (key.leftArrow || lower === 'h') {
        setColIdx(c => Math.max(0, c - 1));
        return;
      }
      if (key.rightArrow || lower === 'l') {
        setColIdx(c => Math.min(groups.length - 1, c + 1));
        return;
      }

      // Row navigation: ↑/↓ or j/k
      if (key.upArrow || lower === 'k') {
        setRowIdx(r => Math.max(0, r - 1));
        return;
      }
      if (key.downArrow || lower === 'j') {
        setRowIdx(r => Math.min(colItems.length - 1, r + 1));
        return;
      }

      // Open detail
      if (key.return && selectedItem) {
        dispatch({ type: 'NAVIGATE', view: 'ITEM_DETAIL' });
        return;
      }

      // Go back
      if (key.escape) {
        dispatch({ type: 'NAVIGATE', view: 'PROJECT_LIST' });
        return;
      }

      if (!selectedItem) return;

      switch (lower) {
        case 'n':
          // Pre-select the current column's status so the form defaults to it
          dispatch({
            type: 'SET_FORM_DEFAULTS',
            defaults: activeGroup?.option ? { statusId: activeGroup.option.id } : null,
          });
          dispatch({ type: 'NAVIGATE', view: 'ITEM_FORM' });
          break;
        case 'm':
          if (statusField) setActivePicker('move');
          break;
        case 'p':
          if (priorityField) setActivePicker('priority');
          break;
        case 'e':
          setEditDraft(selectedItem.title);
          setEditingId(selectedItem.id);
          break;
        case 'd':
          setConfirmDeleteId(selectedItem.id);
          break;
        case 'o': {
          const url = selectedItem.content?.url ?? state.activeProject?.url;
          if (url) void client.openInBrowser(url).catch(() => null);
          break;
        }
        case 'r':
          if (key.ctrl) void refresh();
          break;

        case 'f':
          dispatch({ type: 'TOGGLE_FILTER_OVERLAY' });
          break;

        case 'c':
          if (hasActiveFilters(state.filters)) dispatch({ type: 'CLEAR_FILTERS' });
          break;
      }
    },
    { isActive: mainInputActive },
  );

  // ── Confirm delete ─────────────────────────────────────────────────────────
  useInput(
    (input, key) => {
      if (input.toLowerCase() === 'y' && confirmDeleteId) {
        void deleteItem(confirmDeleteId).then(() => {
          setConfirmDeleteId(null);
          setRowIdx(r => Math.max(0, r - 1));
        });
      }
      if (input.toLowerCase() === 'n' || key.escape) setConfirmDeleteId(null);
    },
    { isActive: confirming },
  );

  // ── Picker handlers ────────────────────────────────────────────────────────
  const handleMoveSelect = useCallback(
    async (opt: { id: string; name: string }) => {
      setActivePicker(null);
      if (!selectedItem || !statusField) return;
      const value: FieldValue = { type: 'singleSelect', optionId: opt.id };
      await editField(selectedItem, statusField.id, value);
    },
    [selectedItem, statusField, editField],
  );

  const handlePrioritySelect = useCallback(
    async (opt: { id: string; name: string }) => {
      setActivePicker(null);
      if (!selectedItem || !priorityField) return;
      const value: FieldValue = { type: 'singleSelect', optionId: opt.id };
      await editField(selectedItem, priorityField.id, value);
    },
    [selectedItem, priorityField, editField],
  );

  // ── Inline edit submit ─────────────────────────────────────────────────────
  const handleEditSubmit = useCallback(
    async (val: string) => {
      setEditingId(null);
      if (val.trim() && editingId) {
        const item = colItems.find(i => i.id === editingId);
        if (item && val.trim() !== item.title) await editTitle(item, val.trim());
      }
    },
    [editingId, colItems, editTitle],
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
        <Spinner label="Loading board…" />
      </Box>
    );
  }

  if (groups.length === 0) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column" gap={1}>
        <Text color={colors.textSecondary}>No items in this project</Text>
        <Text color={colors.textMuted}><Text color={colors.textSecondary}>N</Text> to create one</Text>
      </Box>
    );
  }

  const visibleGroups = groups.slice(colScrollOffset, colScrollOffset + visibleColCount);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box flexGrow={1} flexDirection="column">
      {/* Column headers */}
      <Box flexDirection="row">
        {visibleGroups.map((group, visIdx) => {
          const absIdx    = visIdx + colScrollOffset;
          const isActive  = absIdx === effectiveColIdx;
          const colColor  = normalizeColor(group.option?.color) ?? colors.textMuted;
          const label     = group.option?.name ?? 'No Status';

          return (
            <Box
              key={group.option?.id ?? '__none__'}
              width={CARD_WIDTH}
              paddingX={1}
              borderStyle="single"
              borderTop={false}
              borderLeft={false}
              borderRight={false}
              borderColor={isActive ? colors.borderFocus : colors.border}
            >
              <Text color={isActive ? colors.textPrimary : colors.textSecondary} bold={isActive}>
                <Text color={colColor}>● </Text>
                {truncate(label, CARD_WIDTH - 6)}
              </Text>
              <Text color={colors.textMuted}> {group.items.length}</Text>
            </Box>
          );
        })}
        {/* Fill remaining width */}
        <Box flexGrow={1} />
      </Box>

      {/* Cards area */}
      <Box flexDirection="row" flexGrow={1}>
        {visibleGroups.map((group, visIdx) => {
          const absIdx   = visIdx + colScrollOffset;
          const isActive = absIdx === effectiveColIdx;

          // For the active column, use vertical scroll; others show from top
          const cardOffset  = isActive ? activeColCardOffset : 0;
          const visibleCards = group.items.slice(cardOffset, cardOffset + visibleCardCount);
          const hasMore     = group.items.length > cardOffset + visibleCardCount;

          return (
            <Box
              key={group.option?.id ?? '__none__'}
              width={CARD_WIDTH}
              flexDirection="column"
              borderStyle="single"
              borderTop={false}
              borderBottom={false}
              borderLeft={false}
              borderColor={isActive ? colors.borderFocus : colors.border}
              paddingLeft={1}
            >
              {visibleCards.map((item, cardVisIdx) => {
                const cardAbsIdx  = cardOffset + cardVisIdx;
                const isSelected  = isActive && cardAbsIdx === effectiveRowIdx;
                const isInlineEdit = item.id === editingId;

                return (
                  <KanbanCard
                    key={item.id}
                    item={item}
                    isSelected={isSelected}
                    isActiveCol={isActive}
                    cardWidth={CARD_WIDTH - 3}
                    priorityField={priorityField}
                    icons={icons}
                    isEditing={isInlineEdit}
                    editDraft={editDraft}
                    onEditChange={setEditDraft}
                    onEditSubmit={handleEditSubmit}
                    onEditCancel={() => setEditingId(null)}
                  />
                );
              })}

              {/* Scroll indicators */}
              {cardOffset > 0 && (
                <Text color={colors.textMuted}>  ↑ {cardOffset} above</Text>
              )}
              {hasMore && (
                <Text color={colors.textMuted}>
                  ↓ {group.items.length - cardOffset - visibleCardCount} more
                </Text>
              )}
            </Box>
          );
        })}

        {/* Fill remaining width if fewer columns than visible */}
        <Box flexGrow={1} />
      </Box>

      {/* Delete confirm */}
      {confirmDeleteId && (
        <Box borderStyle="round" borderColor={colors.priorityUrgent} paddingX={1} marginX={1}>
          <Text color={colors.priorityUrgent}>Delete card? </Text>
          <Text color={colors.textPrimary} bold>Y</Text>
          <Text color={colors.textSecondary}> yes  </Text>
          <Text color={colors.textPrimary} bold>N</Text>
          <Text color={colors.textSecondary}> no</Text>
        </Box>
      )}

      {/* Move picker */}
      {activePicker === 'move' && statusField && (
        <SelectPicker
          title="Move to column"
          options={statusField.options}
          currentId={selectedItem ? getItemOptionId(selectedItem, statusField) : undefined}
          onSelect={handleMoveSelect}
          onCancel={() => setActivePicker(null)}
        />
      )}

      {/* Priority picker */}
      {activePicker === 'priority' && priorityField && (
        <SelectPicker
          title="Set priority"
          options={priorityField.options}
          currentId={selectedItem ? getItemOptionId(selectedItem, priorityField) : undefined}
          onSelect={handlePrioritySelect}
          onCancel={() => setActivePicker(null)}
        />
      )}

      {/* Scroll hint + key hints */}
      <Box paddingX={1} gap={1} flexWrap="wrap">
        {colScrollOffset > 0 && (
          <Text color={colors.textMuted}>← {colScrollOffset} col{colScrollOffset > 1 ? 's' : ''}</Text>
        )}
        {groups.length > colScrollOffset + visibleColCount && (
          <Text color={colors.textMuted}>
            {groups.length - colScrollOffset - visibleColCount} col{groups.length - colScrollOffset - visibleColCount > 1 ? 's' : ''} →
          </Text>
        )}
        {hasActiveFilters(state.filters) && (
          <Text color={colors.accentPurpleLight}>Filters active  </Text>
        )}
        <Hint k="H/L←→" label="columns" />
        <Hint k="↑↓" label="cards" />
        <Hint k="Enter" label="detail" />
        <Hint k="M" label="move" />
        <Hint k="N" label="new" />
        <Hint k="E" label="edit" />
        <Hint k="D" label="delete" />
        <Hint k="P" label="priority" />
        <Hint k="F" label="filter" />
      </Box>
    </Box>
  );
}

// ── KanbanCard ────────────────────────────────────────────────────────────────

interface KanbanCardProps {
  item: Item;
  isSelected: boolean;
  isActiveCol: boolean;
  cardWidth: number;
  priorityField: Field | undefined;
  icons: ReturnType<typeof getIcons>;
  isEditing: boolean;
  editDraft: string;
  onEditChange: (v: string) => void;
  onEditSubmit: (v: string) => Promise<void>;
  onEditCancel: () => void;
}

function KanbanCard({
  item,
  isSelected,
  isActiveCol,
  cardWidth,
  priorityField,
  icons,
  isEditing,
  editDraft,
  onEditChange,
  onEditSubmit,
  onEditCancel,
}: KanbanCardProps) {
  const priorityOption = priorityField ? getItemOption(item, priorityField) : undefined;
  const priorityIcon   = getPriorityIcon(priorityOption?.name, icons);
  const priorityColor  = priorityColors[priorityOption?.name?.toLowerCase() ?? ''] ?? colors.textMuted;

  const assignee    = item.assignees[0]?.login ?? '';
  const firstLabel  = item.labels[0];
  const titleWidth  = cardWidth - 5; // cursor(1) + priority(2) + id(5) + spaces

  const cursorChar  = isSelected && isActiveCol ? '▶' : ' ';
  const titleColor  = isSelected && isActiveCol ? colors.textPrimary : colors.textSecondary;
  const idStr       = item.content ? `#${item.content.number}` : '';

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Title row */}
      <Box gap={1}>
        <Text color={isSelected && isActiveCol ? colors.accentPurpleLight : colors.textMuted}>
          {cursorChar}
        </Text>
        <Text color={priorityColor}>{priorityIcon}</Text>
        <Text color={colors.textMuted}>{idStr}</Text>
        {isEditing ? (
          <InlineTextInput
            value={editDraft}
            onChange={onEditChange}
            onSubmit={onEditSubmit}
            onCancel={onEditCancel}
          />
        ) : (
          <Text color={titleColor} bold={isSelected && isActiveCol}>
            {truncate(item.title, titleWidth)}
          </Text>
        )}
      </Box>

      {/* Meta row */}
      <Box paddingLeft={2} gap={1}>
        {assignee && (
          <Text color={colors.textMuted}>@{truncate(assignee, 8)}</Text>
        )}
        {firstLabel && (
          <Text color={normalizeColor(firstLabel.color) ?? colors.textSecondary}>
            {truncate(firstLabel.name, 8)}
          </Text>
        )}
      </Box>
    </Box>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
