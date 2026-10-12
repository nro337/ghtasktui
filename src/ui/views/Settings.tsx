import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppContext, useAppState } from '../hooks/useAppState.js';
import { saveConfig, type Config } from '../../config/config.js';
import {
  colors,
  focus,
  THEME_NAMES,
  THEME_LABELS,
  FOCUS_HIGHLIGHT_PRESETS,
  DEFAULT_FOCUS_HIGHLIGHT_COLOR,
  parseHexColor,
  readableTextOn,
  type ThemeName,
} from '../theme/theme.js';
import SelectPicker from '../components/SelectPicker.js';
import InlineTextInput from '../components/InlineTextInput.js';

type SettingsField = 'theme' | 'highContrast' | 'focusHighlight' | 'focusColor' | 'grid';
const FOCUSABLE_FIELDS: SettingsField[] = ['theme', 'highContrast', 'focusHighlight', 'focusColor', 'grid'];

const CUSTOM_COLOR_ID = 'custom';

export default function Settings() {
  const state = useAppState();
  const { dispatch } = useAppContext();

  const [focused, setFocused] = useState<SettingsField>('theme');
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [themeBeforePicker, setThemeBeforePicker] = useState<ThemeName>(
    state.config.appearance.theme,
  );

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorBeforePicker, setColorBeforePicker] = useState(
    state.config.appearance.focusHighlightColor,
  );
  const [customColorDraft, setCustomColorDraft] = useState<string | null>(null);

  const focusColor =
    parseHexColor(state.config.appearance.focusHighlightColor) ?? DEFAULT_FOCUS_HIGHLIGHT_COLOR;
  const focusPreset = FOCUS_HIGHLIGHT_PRESETS.find(p => p.color === focusColor);

  const closeCustomColor = () => {
    setCustomColorDraft(null);
    dispatch({ type: 'SET_SEARCH_MODE', active: false });
  };

  const overlayOpen = state.commandPaletteOpen || state.helpOpen;
  const pickerOpen = themePickerOpen || colorPickerOpen;
  const editingRow = pickerOpen || customColorDraft !== null;

  // The shell has a fixed height, and Ink squashes rows on top of each other
  // when content doesn't fit — so budget lines and drop the least important
  // parts on short terminals. Shell chrome: header (2) + status bar (2), plus
  // a toast (3) after each save; this view adds padding, title and a spacer (3).
  const termRows = process.stdout.rows || 24;
  const rowBudget = termRows - 10;
  const showHints = rowBudget >= FOCUSABLE_FIELDS.length + 3;
  const showReadOnly = rowBudget >= FOCUSABLE_FIELDS.length + 3 + 6;
  // A picker replaces the rows (and no toast is up while it is open).
  const pickerMaxVisible = Math.max(3, termRows - 13);

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
        } else if (focused === 'focusHighlight') {
          const next = !state.config.appearance.focusHighlight;
          persist({ focusHighlight: next }, `Focus highlight ${next ? 'on' : 'off'} — saved`);
        } else if (focused === 'focusColor') {
          setColorBeforePicker(state.config.appearance.focusHighlightColor);
          setColorPickerOpen(true);
        } else if (focused === 'grid') {
          const next = !state.config.appearance.showGrid;
          persist({ showGrid: next }, `Grid lines ${next ? 'on' : 'off'} — saved`);
        }
      }
    },
    { isActive: !overlayOpen && !editingRow },
  );

  return (
    <Box flexGrow={1} flexDirection="column" paddingX={2} paddingTop={1}>
      <Box flexShrink={0}>
        <Text color={colors.textSecondary} bold>Settings</Text>
      </Box>

      <Box marginTop={1} flexDirection="column" flexShrink={0}>
        {themePickerOpen ? (
          <SelectPicker
            title="Select Theme"
            maxVisible={pickerMaxVisible}
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
        ) : !pickerOpen && (
          <FocusRow label="Theme" focused={focused === 'theme'}>
            <Text color={colors.textPrimary}>{THEME_LABELS[state.config.appearance.theme]}</Text>
          </FocusRow>
        )}

        {!pickerOpen && (
          <>
            <FocusRow label="High contrast" focused={focused === 'highContrast'}>
              <Text color={colors.textPrimary}>
                {state.config.appearance.highContrastText ? 'On' : 'Off'}
              </Text>
            </FocusRow>

            <FocusRow label="Focus highlight" focused={focused === 'focusHighlight'}>
              <Text color={colors.textPrimary}>
                {state.config.appearance.focusHighlight ? 'On' : 'Off'}
              </Text>
            </FocusRow>
          </>
        )}

        {colorPickerOpen ? (
          <SelectPicker
            title="Select Highlight Color"
            maxVisible={pickerMaxVisible}
            options={[
              ...FOCUS_HIGHLIGHT_PRESETS.map(p => ({ id: p.id, name: p.name, color: p.color.slice(1) })),
              { id: CUSTOM_COLOR_ID, name: 'Custom hex…' },
            ]}
            currentId={
              FOCUS_HIGHLIGHT_PRESETS.find(p => p.color === parseHexColor(colorBeforePicker))?.id ??
              CUSTOM_COLOR_ID
            }
            onHighlight={opt => {
              const preset = FOCUS_HIGHLIGHT_PRESETS.find(p => p.id === opt.id);
              dispatch({
                type: 'SET_APPEARANCE',
                appearance: { focusHighlightColor: preset?.color ?? colorBeforePicker },
              });
            }}
            onSelect={opt => {
              setColorPickerOpen(false);
              const preset = FOCUS_HIGHLIGHT_PRESETS.find(p => p.id === opt.id);
              // Choosing a colour also turns the highlight on, so the choice is visible.
              if (preset) {
                persist(
                  { focusHighlightColor: preset.color, focusHighlight: true },
                  `Highlight color set to ${preset.name} — saved`,
                );
              } else {
                dispatch({ type: 'SET_APPEARANCE', appearance: { focusHighlightColor: colorBeforePicker } });
                dispatch({ type: 'SET_SEARCH_MODE', active: true });
                setCustomColorDraft(focusPreset ? '#' : focusColor);
              }
            }}
            onCancel={() => {
              dispatch({ type: 'SET_APPEARANCE', appearance: { focusHighlightColor: colorBeforePicker } });
              setColorPickerOpen(false);
            }}
          />
        ) : !pickerOpen && (
          <FocusRow label="Highlight color" focused={focused === 'focusColor'}>
            {customColorDraft !== null ? (
              <Box gap={2}>
                <InlineTextInput
                  value={customColorDraft}
                  placeholder="#RRGGBB"
                  onChange={setCustomColorDraft}
                  onSubmit={value => {
                    const hex = parseHexColor(value);
                    if (!hex) {
                      dispatch({ type: 'SHOW_TOAST', message: 'Enter a hex color like #1E90FF', kind: 'error' });
                      return;
                    }
                    closeCustomColor();
                    persist(
                      { focusHighlightColor: hex, focusHighlight: true },
                      `Highlight color set to ${hex} — saved`,
                    );
                  }}
                  onCancel={closeCustomColor}
                />
                <Text color={colors.textMuted}>Enter save  Esc cancel</Text>
              </Box>
            ) : (
              <Box gap={2}>
                <Text color={readableTextOn(focusColor)} backgroundColor={focusColor} bold>
                  {` ${focusPreset?.name ?? 'Custom'} `}
                </Text>
                <Text color={colors.textMuted}>{focusColor}</Text>
              </Box>
            )}
          </FocusRow>
        )}

        {!pickerOpen && (
          <FocusRow label="Show grid" focused={focused === 'grid'}>
            <Text color={colors.textPrimary}>
              {state.config.appearance.showGrid ? 'On' : 'Off'}
            </Text>
          </FocusRow>
        )}

        {!pickerOpen && showReadOnly && (
          <>
            <Row label="Owner"            value={state.config.general.defaultOwner} />
            <Row label="Default view"     value={state.config.general.defaultView} />
            <Row label="Nerd fonts"       value={String(state.config.appearance.nerdFonts)} />
            <Row label="Sidebar width"    value={String(state.config.appearance.sidebarWidth)} />
            <Row label="Detail ratio"     value={String(state.config.appearance.detailPanelRatio)} />
            <Row label="Refresh interval" value={`${state.config.general.refreshInterval}s`} />
          </>
        )}
      </Box>

      {!editingRow && showHints && (
        <Box marginTop={1} flexDirection="column" flexShrink={0}>
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
    <Box gap={2} flexShrink={0}>
      <Box width={20}>
        {focused && focus.enabled ? (
          <Text color={focus.fg} backgroundColor={focus.bg} bold>
            {`› ${label}`.padEnd(20)}
          </Text>
        ) : (
          <Text color={focused ? colors.accentPurple : colors.textMuted} bold={focused}>
            {focused ? '› ' : '  '}{label}
          </Text>
        )}
      </Box>
      {children}
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box gap={2} flexShrink={0}>
      <Box width={20}>
        <Text color={colors.textMuted}>  {label}</Text>
      </Box>
      <Text color={colors.textPrimary}>{value}</Text>
    </Box>
  );
}
