import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppContext } from '../hooks/useAppState.js';
import { useItemMutations } from '../hooks/useGH.js';
import { colors, priorityColor, statusColor } from '../theme/theme.js';
import { getIcons } from '../theme/icons.js';
import { findField, getItemOption, getItemOptionId, cycleOption } from '../utils/fields.js';
import { relativeTime } from '../utils/time.js';
import * as client from '../../gh/client.js';
import SelectPicker from './SelectPicker.js';
import InlineTextInput from './InlineTextInput.js';
import type { Item, Field, FieldValue } from '../../gh/types.js';

type ActivePicker = 'status' | 'priority' | null;

interface Props {
  item: Item;
  fields: Field[];
  projectNumber: number;
  onClose: () => void;
  isActive?: boolean;
}

export default function ItemDetailPanel({
  item,
  fields,
  projectNumber,
  onClose,
  isActive = true,
}: Props) {
  const { state, dispatch } = useAppContext();
  const icons = getIcons(state.config.appearance.nerdFonts);
  const { deleteItem, editField, editTitle } = useItemMutations(projectNumber);

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(item.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const statusField   = findField(fields, 'Status');
  const priorityField = findField(fields, 'Priority');
  const statusOption   = statusField   ? getItemOption(item, statusField)   : undefined;
  const priorityOption = priorityField ? getItemOption(item, priorityField) : undefined;

  const pickerOpen = activePicker !== null;
  const overlayOpen = state.commandPaletteOpen || state.helpOpen;
  const inputActive = isActive && !pickerOpen && !editingTitle && !confirmingDelete && !overlayOpen;

  useInput(
    (input, key) => {
      if (key.escape) { onClose(); return; }

      switch (input.toLowerCase()) {
        case 'e':
          setTitleDraft(item.title);
          setEditingTitle(true);
          break;
        case 's':
          if (statusField) setActivePicker('status');
          break;
        case 'p':
          if (priorityField) setActivePicker('priority');
          break;
        case 'o': {
          const url = item.content?.url ?? state.activeProject?.url;
          if (url) void client.openInBrowser(url).catch(() => null);
          break;
        }
        case 'd':
          setConfirmingDelete(true);
          break;
      }
    },
    { isActive: inputActive },
  );

  // Confirm delete input
  useInput(
    (input, key) => {
      if (input.toLowerCase() === 'y') {
        void deleteItem(item.id).then(ok => { if (ok) onClose(); });
        setConfirmingDelete(false);
      }
      if (input.toLowerCase() === 'n' || key.escape) {
        setConfirmingDelete(false);
      }
    },
    { isActive: isActive && confirmingDelete },
  );

  const handleTitleSubmit = async (val: string) => {
    setEditingTitle(false);
    if (val.trim() && val.trim() !== item.title) {
      await editTitle(item, val.trim());
    }
  };

  const handlePickerSelect = async (option: { id: string; name: string }) => {
    setActivePicker(null);
    if (!activePicker) return;

    const field = activePicker === 'status' ? statusField : priorityField;
    if (!field) return;

    const value: FieldValue = { type: 'singleSelect', optionId: option.id };
    await editField(item, field.id, value);
  };

  // Custom fields (excluding Status and Priority)
  const customFields = fields.filter(
    f => f.type !== 'ITERATION' &&
         f.name.toLowerCase() !== 'status' &&
         f.name.toLowerCase() !== 'priority',
  );

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
      {/* Title */}
      <Box marginBottom={1}>
        {editingTitle ? (
          <InlineTextInput
            value={titleDraft}
            onChange={setTitleDraft}
            onSubmit={handleTitleSubmit}
            onCancel={() => setEditingTitle(false)}
          />
        ) : (
          <Text color={colors.textPrimary} bold wrap="wrap">{item.title}</Text>
        )}
      </Box>

      {/* Type + linked info */}
      <Box gap={1} marginBottom={1}>
        <TypeBadge type={item.type} icons={{ issue: icons.issue, pullRequest: icons.pullRequest, draftIssue: icons.draftIssue }} />
        {item.content && (
          <Text color={colors.textMuted}>#{item.content.number}</Text>
        )}
      </Box>

      {/* Status */}
      {statusField && (
        <FieldRow label="Status">
          {statusOption ? (
            <Text color={getStatusColor(statusOption.name)}>{statusOption.name}</Text>
          ) : (
            <Text color={colors.textMuted}>—</Text>
          )}
        </FieldRow>
      )}

      {/* Priority */}
      {priorityField && (
        <FieldRow label="Priority">
          {priorityOption ? (
            <Text color={getPriorityColor(priorityOption.name)}>{priorityOption.name}</Text>
          ) : (
            <Text color={colors.textMuted}>—</Text>
          )}
        </FieldRow>
      )}

      {/* Assignees */}
      {item.assignees.length > 0 && (
        <FieldRow label="Assignees">
          <Text color={colors.textSecondary}>
            {item.assignees.map(a => `@${a.login}`).join(', ')}
          </Text>
        </FieldRow>
      )}

      {/* Labels */}
      {item.labels.length > 0 && (
        <FieldRow label="Labels">
          <Box gap={1} flexWrap="wrap">
            {item.labels.map(l => (
              <Text key={l.id} color={`#${l.color}`}>{l.name}</Text>
            ))}
          </Box>
        </FieldRow>
      )}

      {/* Dates */}
      <FieldRow label="Updated">
        <Text color={colors.textMuted}>{relativeTime(item.updatedAt)}</Text>
      </FieldRow>

      {/* Custom fields */}
      {customFields.map(field => {
        const fv = item.fieldValues[field.id];
        if (!fv) return null;
        const display = fieldValueDisplay(fv, field);
        return display ? (
          <FieldRow key={field.id} label={field.name}>
            <Text color={colors.textSecondary}>{display}</Text>
          </FieldRow>
        ) : null;
      })}

      {/* Body */}
      {item.body && (
        <Box marginTop={1} flexDirection="column">
          <Text color={colors.textMuted}>────</Text>
          <Text color={colors.textSecondary} wrap="wrap">{item.body}</Text>
        </Box>
      )}

      <Box flexGrow={1} />

      {/* Delete confirm */}
      {confirmingDelete && (
        <Box borderStyle="round" borderColor={colors.priorityUrgent} paddingX={1} marginTop={1}>
          <Text color={colors.priorityUrgent}>Delete this item? </Text>
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
          currentId={getItemOptionId(item, statusField)}
          onSelect={handlePickerSelect}
          onCancel={() => setActivePicker(null)}
        />
      )}
      {activePicker === 'priority' && priorityField && (
        <SelectPicker
          title="Set Priority"
          options={priorityField.options}
          currentId={getItemOptionId(item, priorityField)}
          onSelect={handlePickerSelect}
          onCancel={() => setActivePicker(null)}
        />
      )}

      {/* Key hints */}
      <Box marginTop={1} flexWrap="wrap" gap={1}>
        <Hint k="E" label="edit" />
        <Hint k="S" label="status" />
        <Hint k="P" label="priority" />
        <Hint k="O" label="browser" />
        <Hint k="D" label="delete" />
        <Hint k="Esc" label="close" />
      </Box>
    </Box>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box gap={1} marginBottom={0}>
      <Box width={12}>
        <Text color={colors.textMuted}>{label}</Text>
      </Box>
      {children}
    </Box>
  );
}

function TypeBadge({
  type,
  icons,
}: {
  type: Item['type'];
  icons: { issue: string; pullRequest: string; draftIssue: string };
}) {
  switch (type) {
    case 'ISSUE':        return <Text color={colors.statusInProgress}>{icons.issue} Issue</Text>;
    case 'PULL_REQUEST': return <Text color={colors.accentPurple}>{icons.pullRequest} PR</Text>;
    case 'DRAFT_ISSUE':  return <Text color={colors.textMuted}>{icons.draftIssue} Draft</Text>;
  }
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <Text color={colors.textMuted}>
      <Text color={colors.textSecondary}>{k}</Text> {label}
    </Text>
  );
}

function getStatusColor(name: string): string {
  return statusColor(name);
}

function getPriorityColor(name: string): string {
  return priorityColor(name);
}

function fieldValueDisplay(fv: FieldValue, field: Field): string | null {
  switch (fv.type) {
    case 'text':   return fv.value || null;
    case 'number': return String(fv.value);
    case 'date':   return fv.value;
    case 'singleSelect': {
      const opt = field.options.find(o => o.id === fv.optionId);
      return opt?.name ?? null;
    }
    case 'iteration': return fv.iterationId;
  }
}
