import React, { useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { useAppContext, useAppState } from '../hooks/useAppState.js';
import { useFieldsLoader } from '../hooks/useGH.js';
import { colors } from '../theme/theme.js';
import ItemDetailPanel from '../components/ItemDetailPanel.js';
import Spinner from '../components/Spinner.js';

// Full-screen item detail — used when terminal is too narrow for split panel.
export default function ItemDetail() {
  const state = useAppState();
  const { dispatch } = useAppContext();
  const projectNumber = state.activeProject?.number ?? 0;

  const { fields, fieldsLoaded, loadFields } = useFieldsLoader(projectNumber);

  const loadFieldsRef = useRef(loadFields);
  loadFieldsRef.current = loadFields;
  useEffect(() => { void loadFieldsRef.current(); }, []);

  if (!state.selectedItem) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text color={colors.textMuted}>No item selected</Text>
      </Box>
    );
  }

  if (!fieldsLoaded) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Spinner label="Loading…" />
      </Box>
    );
  }

  return (
    <Box flexGrow={1} flexDirection="column">
      <ItemDetailPanel
        item={state.selectedItem}
        fields={fields}
        projectNumber={projectNumber}
        onClose={() => dispatch({ type: 'NAVIGATE', view: 'LIST' })}
      />
    </Box>
  );
}
