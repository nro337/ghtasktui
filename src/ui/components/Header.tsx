import React from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../hooks/useAppState.js';
import { colors } from '../theme/theme.js';
import { getIcons } from '../theme/icons.js';

export default function Header() {
  const state = useAppState();
  const icons = getIcons(state.config.appearance.nerdFonts);

  return (
    <Box
      borderStyle="single"
      borderColor={colors.border}
      borderTop={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
      justifyContent="space-between"
    >
      {/* Left: app name */}
      <Box gap={1}>
        <Text color={colors.accentPurple} bold>{icons.app}</Text>
        <Text color={colors.textPrimary} bold>GH Tasks TUI</Text>
        {state.activeProject && (
          <>
            <Text color={colors.textMuted}>{icons.chevronRight}</Text>
            <Text color={colors.textSecondary}>{state.activeProject.title}</Text>
          </>
        )}
      </Box>

      {/* Right: owner + key hints */}
      <Box gap={2}>
        <Text color={colors.textMuted}>{state.owner}</Text>
        <Text color={colors.textMuted}>
          <Text color={colors.textSecondary}>?</Text> help{' '}
          <Text color={colors.textSecondary}>Ctrl+K</Text> cmd
        </Text>
      </Box>
    </Box>
  );
}
