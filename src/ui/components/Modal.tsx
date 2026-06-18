import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../theme/theme.js';

// ── Inline text input (avoids external dep) ──────────────────────────────────

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  placeholder?: string;
}

function TextInput({ value, onChange, onSubmit, placeholder = '' }: TextInputProps) {
  useInput((input, key) => {
    if (key.return) {
      onSubmit(value);
      return;
    }
    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }
    if (!key.ctrl && !key.meta && !key.escape && input) {
      onChange(value + input);
    }
  });

  const display = value || placeholder;
  const color = value ? colors.textPrimary : colors.textMuted;

  return <Text color={color}>{display}<Text color={colors.accentPurple}>█</Text></Text>;
}

// ── Confirm Modal ────────────────────────────────────────────────────────────

interface ConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ message, onConfirm, onCancel }: ConfirmProps) {
  useInput((input, key) => {
    if (input.toLowerCase() === 'y') onConfirm();
    if (input.toLowerCase() === 'n' || key.escape) onCancel();
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.borderFocus}
      paddingX={2}
      paddingY={1}
      width={50}
    >
      <Text color={colors.textPrimary}>{message}</Text>
      <Box marginTop={1} gap={1}>
        <Text color={colors.priorityUrgent} bold>Y</Text>
        <Text color={colors.textSecondary}>yes</Text>
        <Text color={colors.textMuted}>  </Text>
        <Text color={colors.textPrimary} bold>N</Text>
        <Text color={colors.textSecondary}>no / Esc cancel</Text>
      </Box>
    </Box>
  );
}

// ── Input Modal ──────────────────────────────────────────────────────────────

interface InputProps {
  prompt: string;
  placeholder?: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function InputModal({
  prompt,
  placeholder = '',
  initialValue = '',
  onSubmit,
  onCancel,
}: InputProps) {
  const [value, setValue] = useState(initialValue);

  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.borderFocus}
      paddingX={2}
      paddingY={1}
      width={60}
    >
      <Text color={colors.textSecondary}>{prompt}</Text>
      <Box marginTop={1} gap={1}>
        <Text color={colors.accentPurple}>›</Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={v => { if (v.trim()) onSubmit(v.trim()); }}
          placeholder={placeholder}
        />
      </Box>
      <Box marginTop={1}>
        <Text color={colors.textMuted}>Enter to confirm  Esc to cancel</Text>
      </Box>
    </Box>
  );
}
