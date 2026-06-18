import React from 'react';
import { Text, useInput } from 'ink';
import { colors } from '../theme/theme.js';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  onCancel: () => void;
  placeholder?: string;
  isActive?: boolean;
}

export default function InlineTextInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = '',
  isActive = true,
}: Props) {
  useInput(
    (input, key) => {
      if (key.return) {
        onSubmit(value);
        return;
      }
      if (key.escape) {
        onCancel();
        return;
      }
      if (key.backspace || key.delete) {
        onChange(value.slice(0, -1));
        return;
      }
      if (!key.ctrl && !key.meta && input) {
        onChange(value + input);
      }
    },
    { isActive },
  );

  const isEmpty = value.length === 0;
  return (
    <Text>
      <Text color={isEmpty ? colors.textMuted : colors.textPrimary}>
        {isEmpty ? placeholder : value}
      </Text>
      <Text color={colors.accentPurple}>█</Text>
    </Text>
  );
}
