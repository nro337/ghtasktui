import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useAppContext } from '../hooks/useAppState.js';
import { toastColor, colors } from '../theme/theme.js';

const TOAST_DURATION_MS = 3500;

export default function Toast() {
  const { state, dispatch } = useAppContext();
  const toast = state.toast;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'CLEAR_TOAST' });
    }, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast?.message, dispatch]);

  if (!toast) return null;

  const color = toastColor(toast.kind);
  const prefix =
    toast.kind === 'success' ? '✓' :
    toast.kind === 'error'   ? '✗' :
                               'i';

  return (
    <Box
      borderStyle="round"
      borderColor={color}
      paddingX={1}
      marginX={1}
    >
      <Text color={color}>{prefix} </Text>
      <Text color={colors.textPrimary}>{toast.message}</Text>
    </Box>
  );
}
