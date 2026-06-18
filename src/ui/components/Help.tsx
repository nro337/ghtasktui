import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppContext } from '../hooks/useAppState.js';
import { DEFAULT_KEYMAP, keyLabel, type KeyBinding } from '../hooks/useKeymap.js';
import { colors } from '../theme/theme.js';

const GROUPS: Array<{ id: KeyBinding['group']; label: string }> = [
  { id: 'global',     label: 'Global' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'view',       label: 'View' },
  { id: 'item',       label: 'Item Actions' },
];

export default function Help() {
  const { dispatch } = useAppContext();

  useInput((input, key) => {
    if (key.escape || input === '?' || input === 'q') {
      dispatch({ type: 'TOGGLE_HELP' });
    }
  });

  return (
    <Box
      flexDirection="column"
      height={process.stdout.rows}
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1} gap={1}>
        <Text color={colors.accentPurple} bold>GH Tasks TUI</Text>
        <Text color={colors.textMuted}>— Keyboard Shortcuts</Text>
      </Box>

      <Box gap={4}>
        {GROUPS.map(group => {
          const bindings = Object.entries(DEFAULT_KEYMAP).filter(
            ([, b]) => b.group === group.id,
          );

          return (
            <Box key={group.id} flexDirection="column" minWidth={30}>
              <Box marginBottom={1}>
                <Text color={colors.textMuted} bold>{group.label.toUpperCase()}</Text>
              </Box>
              {bindings.map(([, binding]) => (
                <Box key={binding.description} gap={1}>
                  <Box width={12}>
                    <Text color={colors.accentPurpleLight}>{keyLabel(binding)}</Text>
                  </Box>
                  <Text color={colors.textSecondary}>{binding.description}</Text>
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={2}>
        <Text color={colors.textMuted}>
          Press <Text color={colors.textSecondary}>?</Text>, <Text color={colors.textSecondary}>q</Text>, or <Text color={colors.textSecondary}>Esc</Text> to close
        </Text>
      </Box>
    </Box>
  );
}
