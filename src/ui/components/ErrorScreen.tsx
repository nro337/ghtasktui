import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme/theme.js';

interface Props {
  title?: string;
  message: string;
}

export default function ErrorScreen({ title = 'Fatal Error', message }: Props) {
  return (
    <Box flexDirection="column" padding={2}>
      <Text color={colors.error} bold>{title}</Text>
      <Box marginTop={1}>
        <Text color={colors.textSecondary}>{message}</Text>
      </Box>
      <Box marginTop={2}>
        <Text color={colors.textMuted}>
          Check <Text color={colors.textSecondary}>~/.config/ghtasktui/debug.log</Text> for details, or run with <Text color={colors.textSecondary}>--debug</Text>.
        </Text>
      </Box>
    </Box>
  );
}
