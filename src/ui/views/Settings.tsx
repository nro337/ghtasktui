import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppContext, useAppState } from '../hooks/useAppState.js';
import { saveConfig, type Config } from '../../config/config.js';
import { colors, THEME_NAMES, THEME_LABELS, type ThemeName } from '../theme/theme.js';
import SelectPicker from '../components/SelectPicker.js';

type SettingsField = 'theme' | 'highContrast';
const FOCUSABLE_FIELDS: SettingsField[] = ['theme', 'highContrast'];

export default function Settings() {
  const state = useAppState();
  const { dispatch } = useAppContext();

  const [focused, setFocused] = useState<SettingsField>('theme');
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [themeBeforePicker, setThemeBeforePicker] = useState<ThemeName>(
    state.config.appearance.theme,
  );

  const overlayOpen = state.commandPaletteOpen || state.helpOpen;

  const persist = (appearance: Partial<Config['appearance']>, savedMessage: string) => {
    const next: Config = {
      ...state.config,
      appearance: { ...state.config.appearance, ...appearance },
    };
    dispatch({ type: 'SET_APPEARANCE', appearance });
    void saveConfig(next)
      .then(() => dispatch({ type: 'SHOW_TOAST', message: savedMessage, kind: 'success' }))
      .catch(() => {
        dispatch({ type: 'SHOW_TOAST', message: 'Failed to save settings', kind: 'error' });
      });
  };

  useInput(
    (input, key) => {
      if (key.escape) {
        dispatch({ type: 'NAVIGATE', view: state.activeProject ? 'LIST' : 'PROJECT_LIST' });
        return;
      }
      if (key.upArrow || key.downArrow) {
        const idx = FOCUSABLE_FIELDS.indexOf(focused);
        const dir = key.upArrow ? -1 : 1;
        const next = FOCUSABLE_FIELDS[(idx + dir + FOCUSABLE_FIELDS.length) % FOCUSABLE_FIELDS.length];
        if (next) setFocused(next);
        return;
      }
      if (key.return || input === ' ') {
        if (focused === 'theme') {
          setThemeBeforePicker(state.config.appearance.theme);
          setThemePickerOpen(true);
        } else if (focused === 'highContrast') {
          const next = !state.config.appearance.highContrastText;
          persist({ highContrastText: next }, `High contrast ${next ? 'on' : 'off'} — saved`);
        }
      }
    },
    { isActive: !overlayOpen && !themePickerOpen },
  );

  return (
    <Box flexGrow={1} flexDirection="column" paddingX={2} paddingY={1} gap={1}>
      <Text color={colors.textSecondary} bold>Settings</Text>

      <Box marginTop={1} flexDirection="column" gap={0}>
        {themePickerOpen ? (
          <SelectPicker
            title="Select Theme"
            options={THEME_NAMES.map(name => ({ id: name, name: THEME_LABELS[name] }))}
            currentId={state.config.appearance.theme}
            onHighlight={opt =>
              dispatch({ type: 'SET_APPEARANCE', appearance: { theme: opt.id as ThemeName } })
            }
            onSelect={opt => {
              persist({ theme: opt.id as ThemeName }, `Theme set to ${THEME_LABELS[opt.id as ThemeName]} — saved`);
              setThemePickerOpen(false);
            }}
            onCancel={() => {
              dispatch({ type: 'SET_APPEARANCE', appearance: { theme: themeBeforePicker } });
              setThemePickerOpen(false);
            }}
          />
        ) : (
          <FocusRow label="Theme" focused={focused === 'theme'}>
            <Text color={colors.textPrimary}>{THEME_LABELS[state.config.appearance.theme]}</Text>
          </FocusRow>
        )}

        <FocusRow label="High contrast" focused={focused === 'highContrast'}>
          <Text color={colors.textPrimary}>
            {state.config.appearance.highContrastText ? 'On' : 'Off'}
          </Text>
        </FocusRow>

        <Row label="Owner"            value={state.config.general.defaultOwner} />
        <Row label="Default view"     value={state.config.general.defaultView} />
        <Row label="Nerd fonts"       value={String(state.config.appearance.nerdFonts)} />
        <Row label="Sidebar width"    value={String(state.config.appearance.sidebarWidth)} />
        <Row label="Detail ratio"     value={String(state.config.appearance.detailPanelRatio)} />
        <Row label="Refresh interval" value={`${state.config.general.refreshInterval}s`} />
      </Box>

      {!themePickerOpen && (
        <Box marginTop={2} flexDirection="column">
          <Text color={colors.textMuted}>
            ↑↓ select a row   Enter/Space change (saves immediately)   Esc back
          </Text>
          <Text color={colors.textMuted}>
            Other settings: edit <Text color={colors.textSecondary}>~/.config/ghtasktui/config.json</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}

function FocusRow({
  label,
  focused,
  children,
}: {
  label: string;
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box gap={2}>
      <Box width={20}>
        <Text color={focused ? colors.accentPurple : colors.textMuted} bold={focused}>
          {focused ? '› ' : '  '}{label}
        </Text>
      </Box>
      {children}
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box gap={2}>
      <Box width={20}>
        <Text color={colors.textMuted}>  {label}</Text>
      </Box>
      <Text color={colors.textPrimary}>{value}</Text>
    </Box>
  );
}
