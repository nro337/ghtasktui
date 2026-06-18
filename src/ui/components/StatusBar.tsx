import React from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../hooks/useAppState.js';
import { colors } from '../theme/theme.js';
import Spinner from './Spinner.js';

const VIEW_LABEL: Record<string, string> = {
  PROJECT_LIST: 'PROJECTS',
  LIST:         'LIST',
  BOARD:        'BOARD',
  ITEM_DETAIL:  'DETAIL',
  ITEM_FORM:    'FORM',
  SETTINGS:     'SETTINGS',
};

const Sep = () => <Text color={colors.textMuted}> · </Text>;

export default function StatusBar() {
  const state = useAppState();
  const viewLabel = VIEW_LABEL[state.view] ?? state.view;
  const cache = state.activeProject
    ? state.projectCache[state.activeProject.number]
    : undefined;
  const itemCount = cache?.items.length ?? 0;

  return (
    <Box
      borderStyle="single"
      borderColor={colors.border}
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
      justifyContent="space-between"
    >
      {/* Left: view mode + project */}
      <Box gap={0}>
        <Box paddingX={1} marginRight={1}>
          <Text color={colors.accentPurple} bold> {viewLabel} </Text>
        </Box>

        {state.activeProject && (
          <>
            <Text color={colors.textSecondary}>{state.activeProject.title}</Text>
            <Sep />
            <Text color={colors.textMuted}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
          </>
        )}

        {state.loading && (
          <>
            <Sep />
            <Spinner />
          </>
        )}
      </Box>

      {/* Right: key hints */}
      <Box gap={0}>
        <Text color={colors.textMuted}>
          <Text color={colors.textSecondary}>↑↓</Text> navigate
        </Text>
        <Sep />
        <Text color={colors.textMuted}>
          <Text color={colors.textSecondary}>?</Text> help
        </Text>
        <Sep />
        <Text color={colors.textMuted}>
          <Text color={colors.textSecondary}>q</Text> quit
        </Text>
      </Box>
    </Box>
  );
}
