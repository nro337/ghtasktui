import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../theme/theme.js';

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
  isActive?: boolean;
}

export default function SelectPicker({
  title,
  options,
  currentId,
  onSelect,
  onCancel,
  isActive = true,
}: Props) {
  const [idx, setIdx] = useState(() => {
    const i = options.findIndex(o => o.id === currentId);
    return i >= 0 ? i : 0;
  });

  useInput(
    (input, key) => {
      if (key.upArrow)   setIdx(i => Math.max(0, i - 1));
      if (key.downArrow) setIdx(i => Math.min(options.length - 1, i + 1));
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

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.borderFocus} paddingX={1}>
      <Box marginBottom={1}>
        <Text color={colors.textMuted}>{title}</Text>
      </Box>
      {options.map((opt, i) => {
        const isSelected = i === idx;
        return (
          <Box key={opt.id} gap={1}>
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
      <Box marginTop={1}>
        <Text color={colors.textMuted}>↑↓ navigate  Enter select  Esc cancel</Text>
      </Box>
    </Box>
  );
}
