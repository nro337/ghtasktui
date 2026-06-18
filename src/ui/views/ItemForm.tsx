import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppContext, useAppState } from '../hooks/useAppState.js';
import { useFieldsLoader, useItemMutations } from '../hooks/useGH.js';
import { colors } from '../theme/theme.js';
import { findField, getItemOptionId } from '../utils/fields.js';
import InlineTextInput from '../components/InlineTextInput.js';
import SelectPicker from '../components/SelectPicker.js';
import Spinner from '../components/Spinner.js';
import type { FieldValue } from '../../gh/types.js';

type FormField = 'title' | 'status' | 'priority';

export default function ItemForm() {
  const state = useAppState();
  const { dispatch } = useAppContext();
  const projectNumber = state.activeProject?.number ?? 0;

  const { fields, fieldsLoaded, loadFields } = useFieldsLoader(projectNumber);
  const { createItem, editField } = useItemMutations(projectNumber);

  const loadFieldsRef = useRef(loadFields);
  loadFieldsRef.current = loadFields;
  useEffect(() => { void loadFieldsRef.current(); }, []);

  const statusField   = findField(fields, 'Status');
  const priorityField = findField(fields, 'Priority');

  const [title, setTitle]           = useState('');
  const [focused, setFocused]       = useState<FormField>('title');
  const [statusId, setStatusId]     = useState<string | undefined>(
    state.formDefaults?.statusId,
  );
  const [priorityId, setPriorityId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // Clear formDefaults from global state after consuming them
  useEffect(() => {
    if (state.formDefaults) {
      dispatch({ type: 'SET_FORM_DEFAULTS', defaults: null });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const overlayOpen = state.commandPaletteOpen || state.helpOpen;
  const pickerActive = focused === 'status' || focused === 'priority';

  const FIELDS: FormField[] = [
    'title',
    ...(statusField   ? ['status'   as const] : []),
    ...(priorityField ? ['priority' as const] : []),
  ];

  const focusNext = () => {
    const idx = FIELDS.indexOf(focused);
    const next = FIELDS[(idx + 1) % FIELDS.length];
    if (next) setFocused(next);
  };
  const focusPrev = () => {
    const idx = FIELDS.indexOf(focused);
    const prev = FIELDS[(idx - 1 + FIELDS.length) % FIELDS.length];
    if (prev) setFocused(prev);
  };

  const cancel = () => dispatch({ type: 'NAVIGATE', view: 'LIST' });

  const submit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const item = await createItem(title.trim());
      if (!item) { setSubmitting(false); return; }

      // Set status/priority if chosen
      if (statusId && statusField) {
        const v: FieldValue = { type: 'singleSelect', optionId: statusId };
        await editField(item, statusField.id, v);
      }
      if (priorityId && priorityField) {
        const v: FieldValue = { type: 'singleSelect', optionId: priorityId };
        await editField(item, priorityField.id, v);
      }

      dispatch({ type: 'SET_ITEM', item });
      dispatch({ type: 'NAVIGATE', view: 'LIST' });
    } finally {
      setSubmitting(false);
    }
  };

  // Global nav handler (tab, escape, enter on non-title fields)
  useInput(
    (_input, key) => {
      if (key.escape)            { cancel(); return; }
      if (key.tab && !key.shift) { focusNext(); return; }
      if (key.tab && key.shift)  { focusPrev(); return; }
      // Enter from title field with no status/priority = submit
      if (key.return && focused === 'title') {
        if (FIELDS.length === 1) {
          void submit();
        } else {
          focusNext();
        }
      }
    },
    { isActive: !overlayOpen && !pickerActive },
  );

  if (!state.activeProject) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text color={colors.textMuted}>No project selected</Text>
      </Box>
    );
  }

  if (!fieldsLoaded) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Spinner label="Loading fields…" />
      </Box>
    );
  }

  const statusOption   = statusField?.options.find(o => o.id === statusId);
  const priorityOption = priorityField?.options.find(o => o.id === priorityId);

  return (
    <Box flexGrow={1} alignItems="center" justifyContent="center">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.borderFocus}
        paddingX={2}
        paddingY={1}
        width={64}
      >
        {/* Header */}
        <Box marginBottom={1}>
          <Text color={colors.accentPurple} bold>New Item</Text>
          <Text color={colors.textMuted}> — {state.activeProject.title}</Text>
        </Box>

        {/* Title field */}
        <FormRow label="Title" focused={focused === 'title'}>
          {focused === 'title' ? (
            <InlineTextInput
              value={title}
              onChange={setTitle}
              onSubmit={v => { setTitle(v); if (FIELDS.length === 1) void submit(); else focusNext(); }}
              onCancel={cancel}
              placeholder="Item title…"
            />
          ) : (
            <Text color={title ? colors.textPrimary : colors.textMuted}>
              {title || 'Item title…'}
            </Text>
          )}
        </FormRow>

        {/* Status field */}
        {statusField && (
          <FormRow label="Status" focused={focused === 'status'}>
            <Text color={statusOption ? colors.textPrimary : colors.textMuted}>
              {statusOption?.name ?? 'No status'}
            </Text>
          </FormRow>
        )}

        {/* Priority field */}
        {priorityField && (
          <FormRow label="Priority" focused={focused === 'priority'}>
            <Text color={priorityOption ? colors.textPrimary : colors.textMuted}>
              {priorityOption?.name ?? 'No priority'}
            </Text>
          </FormRow>
        )}

        {/* Pickers (shown inline when field is focused) */}
        {focused === 'status' && statusField && (
          <SelectPicker
            title="Select Status"
            options={statusField.options}
            currentId={statusId}
            onSelect={opt => { setStatusId(opt.id); focusNext(); }}
            onCancel={() => setFocused('title')}
          />
        )}
        {focused === 'priority' && priorityField && (
          <SelectPicker
            title="Select Priority"
            options={priorityField.options}
            currentId={priorityId}
            onSelect={opt => { setPriorityId(opt.id); void submit(); }}
            onCancel={() => setFocused('title')}
          />
        )}

        {/* Footer hints */}
        <Box marginTop={1} gap={2}>
          <Text color={colors.textMuted}>
            <Text color={colors.textSecondary}>Tab</Text> next field
          </Text>
          <Text color={colors.textMuted}>
            <Text color={colors.textSecondary}>Enter</Text> {focused === 'title' ? 'next / create' : 'select'}
          </Text>
          <Text color={colors.textMuted}>
            <Text color={colors.textSecondary}>Esc</Text> cancel
          </Text>
        </Box>

        {submitting && (
          <Box marginTop={1}>
            <Spinner label="Creating…" />
          </Box>
        )}
      </Box>
    </Box>
  );
}

function FormRow({
  label,
  focused,
  children,
}: {
  label: string;
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box gap={1} marginBottom={1}>
      <Box width={10}>
        <Text color={focused ? colors.accentPurple : colors.textMuted} bold={focused}>
          {focused ? '› ' : '  '}{label}
        </Text>
      </Box>
      {children}
    </Box>
  );
}
