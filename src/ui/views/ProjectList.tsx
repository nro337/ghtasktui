import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppContext, useAppState } from '../hooks/useAppState.js';
import { useProjectsLoader } from '../hooks/useGH.js';
import { colors } from '../theme/theme.js';
import { getIcons } from '../theme/icons.js';
import Spinner from '../components/Spinner.js';

export default function ProjectList() {
  const state = useAppState();
  const { dispatch } = useAppContext();
  const icons = getIcons(state.config.appearance.nerdFonts);
  const { projects, projectsLoaded, loadProjects } = useProjectsLoader();

  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const overlayOpen = state.commandPaletteOpen || state.helpOpen;

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useInput(
    (input, key) => {
      if (key.upArrow)   setSelectedIdx(i => Math.max(0, i - 1));
      if (key.downArrow) setSelectedIdx(i => Math.min(projects.length - 1, i + 1));

      if (key.return && projects.length > 0) {
        const project = projects[selectedIdx];
        if (project) {
          dispatch({ type: 'SET_PROJECT', project });
          dispatch({
            type: 'NAVIGATE',
            view: state.config.general.defaultView === 'board' ? 'BOARD' : 'LIST',
          });
        }
      }
    },
    { isActive: !overlayOpen },
  );

  if (!projectsLoaded) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Spinner label="Loading projects…" />
      </Box>
    );
  }

  if (projects.length === 0) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column" gap={1}>
        <Text color={colors.textSecondary}>No projects found for {state.owner}</Text>
        <Text color={colors.textMuted}>Create one at github.com or change --owner</Text>
      </Box>
    );
  }

  return (
    <Box flexGrow={1} flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1} gap={3}>
        <Box width={6}><Text color={colors.textMuted}>#</Text></Box>
        <Box flexGrow={1}><Text color={colors.textMuted}>TITLE</Text></Box>
        <Box width={40}><Text color={colors.textMuted}>DESCRIPTION</Text></Box>
        <Box width={8}><Text color={colors.textMuted}>STATUS</Text></Box>
      </Box>

      {projects.map((project, idx) => {
        const isSelected = idx === selectedIdx;
        return (
          <Box
            key={project.number}
            gap={3}
            paddingX={isSelected ? 1 : 0}
          >
            <Box width={6}>
              <Text color={isSelected ? colors.accentPurple : colors.textMuted}>
                {isSelected ? icons.chevronRight : ' '} {project.number}
              </Text>
            </Box>
            <Box flexGrow={1}>
              <Text color={isSelected ? colors.textPrimary : colors.textSecondary} bold={isSelected}>
                {project.title}
              </Text>
            </Box>
            <Box width={40}>
              <Text color={colors.textMuted}>
                {project.shortDescription
                  ? project.shortDescription.slice(0, 38)
                  : '—'}
              </Text>
            </Box>
            <Box width={8}>
              <Text color={project.closed ? colors.statusCanceled : colors.statusDone}>
                {project.closed ? 'closed' : 'open'}
              </Text>
            </Box>
          </Box>
        );
      })}

      <Box marginTop={2}>
        <Text color={colors.textMuted}>
          <Text color={colors.textSecondary}>↑↓</Text> navigate  <Text color={colors.textSecondary}>Enter</Text> open
        </Text>
      </Box>
    </Box>
  );
}
