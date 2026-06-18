import React from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../hooks/useAppState.js';
import { colors } from '../theme/theme.js';

export default function Settings() {
  const state = useAppState();

  return (
    <Box flexGrow={1} flexDirection="column" paddingX={2} paddingY={1} gap={1}>
      <Text color={colors.textSecondary} bold>Settings</Text>

      <Box marginTop={1} flexDirection="column" gap={0}>
        <Row label="Owner"           value={state.config.general.defaultOwner} />
        <Row label="Default view"    value={state.config.general.defaultView} />
        <Row label="Nerd fonts"      value={String(state.config.appearance.nerdFonts)} />
        <Row label="Sidebar width"   value={String(state.config.appearance.sidebarWidth)} />
        <Row label="Detail ratio"    value={String(state.config.appearance.detailPanelRatio)} />
        <Row label="Refresh interval" value={`${state.config.general.refreshInterval}s`} />
      </Box>

      <Box marginTop={2}>
        <Text color={colors.textMuted}>
          Edit config at <Text color={colors.textSecondary}>~/.config/ghtasktui/config.json</Text>
        </Text>
      </Box>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box gap={2}>
      <Box width={20}>
        <Text color={colors.textMuted}>{label}</Text>
      </Box>
      <Text color={colors.textPrimary}>{value}</Text>
    </Box>
  );
}
