import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, focus } from '../theme/theme.js';
import { FocusLine } from './FocusFill.js';

export interface PickerOption {
  id: string;
  name: string;
  color?: string | undefined;
}

interface Props {
  title: string;
  options: PickerOption[];
  currentId?: string | undefined;
  onSelect: (option: PickerOption) => void;
  onCancel: () => void;
  onHighlight?: (option: PickerOption) => void;
  isActive?: boolean;
  /** Show at most this many options at once, scrolling to follow the cursor. */
  maxVisible?: number;
}

export default function SelectPicker({
  title,
  options,
  currentId,
  onSelect,
  onCancel,
  onHighlight,
  isActive = true,
  maxVisible,
}: Props) {
  const [idx, setIdx] = useState(() => {
    const i = options.findIndex(o => o.id === currentId);
    return i >= 0 ? i : 0;
  });

  useInput(
    (input, key) => {
      if (key.upArrow) {
        const next = Math.max(0, idx - 1);
        setIdx(next);
        const opt = options[next];
        if (opt) onHighlight?.(opt);
      }
      if (key.downArrow) {
        const next = Math.min(options.length - 1, idx + 1);
        setIdx(next);
        const opt = options[next];
        if (opt) onHighlight?.(opt);
      }
      if (key.return) {
        const opt = options[idx];
        if (opt) onSelect(opt);
      }
      if (key.escape || input === 'q') onCancel();
    },
    { isActive },
  );

  if (options.length === 0) {
    return (
      <Box borderStyle="round" borderColor={colors.border} paddingX={1}>
        <Text color={colors.textMuted}>No options available</Text>
      </Box>
    );
  }

  // Window the list around the cursor when it is taller than maxVisible.
  const visibleCount = Math.max(1, Math.min(maxVisible ?? options.length, options.length));
  const windowed = visibleCount < options.length;
  const start = Math.max(0, Math.min(idx - Math.floor(visibleCount / 2), options.length - visibleCount));

  return (
    <Box
      flexDirection="column"
      flexShrink={0}
      borderStyle="round"
      borderColor={colors.borderFocus}
      paddingX={1}
    >
      <Box marginBottom={1} flexShrink={0}>
        <Text color={colors.textMuted}>{title}</Text>
      </Box>
      {options.slice(start, start + visibleCount).map((opt, visIdx) => {
        const i = start + visIdx;
        const isSelected = i === idx;
        if (isSelected && focus.enabled) {
          return (
            <FocusLine key={opt.id}>
              {'› '}
              {opt.color !== undefined && <Text color={`#${opt.color}`}>{'● '}</Text>}
              {opt.name}
              {opt.id === currentId ? '  ✓' : ''}
            </FocusLine>
          );
        }
        return (
          <Box key={opt.id} gap={1} flexShrink={0}>
            <Text color={isSelected ? colors.accentPurple : colors.textMuted}>
              {isSelected ? '›' : ' '}
            </Text>
            {opt.color !== undefined && (
              <Text color={`#${opt.color}`}>●</Text>
            )}
            <Text color={isSelected ? colors.textPrimary : colors.textSecondary} bold={isSelected}>
              {opt.name}
            </Text>
            {opt.id === currentId && (
              <Text color={colors.textMuted}> ✓</Text>
            )}
          </Box>
        );
      })}
      <Box marginTop={1} flexShrink={0}>
        <Text color={colors.textMuted}>
          ↑↓ navigate  Enter select  Esc cancel{windowed ? `  (${idx + 1}/${options.length})` : ''}
        </Text>
      </Box>
    </Box>
  );
}
