import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppContext, useAppState } from '../hooks/useAppState.js';
import { useProjectsLoader } from '../hooks/useGH.js';
import { colors } from '../theme/theme.js';
import { getIcons } from '../theme/icons.js';
import Spinner from './Spinner.js';

export default function Sidebar() {
  const state = useAppState();
  const { dispatch } = useAppContext();
  const icons = getIcons(state.config.appearance.nerdFonts);
  const width = state.config.appearance.sidebarWidth;

  const { projects, projectsLoaded, loadProjects } = useProjectsLoader();

  // Load projects lazily on mount
  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // [ / ] to cycle projects (only active when sidebar is open and no overlay is open)
  const overlayOpen = state.commandPaletteOpen || state.helpOpen;
  useInput(
    (_input, key) => {
      if (!state.activeProject || projects.length === 0) return;
      const idx = projects.findIndex(p => p.number === state.activeProject?.number);

      if (_input === '[') {
        const prev = projects[idx - 1];
        if (prev) {
          dispatch({ type: 'SET_PROJECT', project: prev });
          dispatch({ type: 'NAVIGATE', view: state.config.general.defaultView === 'board' ? 'BOARD' : 'LIST' });
        }
      }
      if (_input === ']') {
        const next = projects[idx + 1];
        if (next) {
          dispatch({ type: 'SET_PROJECT', project: next });
          dispatch({ type: 'NAVIGATE', view: state.config.general.defaultView === 'board' ? 'BOARD' : 'LIST' });
        }
      }
    },
    { isActive: !overlayOpen },
  );

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={colors.border}
      borderTop={false}
      borderBottom={false}
      borderLeft={false}
      paddingX={1}
    >
      {/* Projects section */}
      <Box marginBottom={1} marginTop={1}>
        <Text color={colors.textMuted} bold>PROJECTS</Text>
      </Box>

      {!projectsLoaded ? (
        <Box paddingLeft={1}>
          <Spinner label="Loading…" />
        </Box>
      ) : projects.length === 0 ? (
        <Box paddingLeft={1}>
          <Text color={colors.textMuted}>No projects found</Text>
        </Box>
      ) : (
        projects.map(project => {
          const isActive = state.activeProject?.number === project.number;
          const label = project.title.length > width - 4
            ? project.title.slice(0, width - 5) + '…'
            : project.title;

          return (
            <Box key={project.number} gap={1}>
              <Text color={isActive ? colors.accentPurple : colors.textMuted}>
                {isActive ? icons.arrowRight : ' '}
              </Text>
              <Text
                color={isActive ? colors.textPrimary : colors.textSecondary}
                bold={isActive}
              >
                {label}
              </Text>
            </Box>
          );
        })
      )}

      {/* Views section */}
      <Box marginTop={2} marginBottom={1}>
        <Text color={colors.textMuted} bold>VIEWS</Text>
      </Box>

      <Box gap={1}>
        <Text color={state.view === 'LIST' ? colors.accentPurple : colors.textMuted}>
          {icons.list}
        </Text>
        <Text
          color={state.view === 'LIST' ? colors.textPrimary : colors.textSecondary}
          bold={state.view === 'LIST'}
        >
          List
        </Text>
      </Box>

      <Box gap={1}>
        <Text color={state.view === 'BOARD' ? colors.accentPurple : colors.textMuted}>
          {icons.board}
        </Text>
        <Text
          color={state.view === 'BOARD' ? colors.textPrimary : colors.textSecondary}
          bold={state.view === 'BOARD'}
        >
          Board
        </Text>
      </Box>

      {/* Spacer + nav hint */}
      <Box flexGrow={1} />
      <Box marginBottom={1}>
        <Text color={colors.textMuted}>[ ] switch project</Text>
      </Box>
    </Box>
  );
}
