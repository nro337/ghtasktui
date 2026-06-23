import React, { useReducer } from 'react';
import { Box, useInput } from 'ink';
import { AppContext, appReducer, initialState, type AppView } from './hooks/useAppState.js';
import { matchKey, DEFAULT_KEYMAP } from './hooks/useKeymap.js';
import type { Config } from '../config/config.js';
import { initTheme } from './theme/theme.js';

import Header     from './components/Header.js';
import Sidebar    from './components/Sidebar.js';
import StatusBar  from './components/StatusBar.js';
import Toast      from './components/Toast.js';
import Help            from './components/Help.js';
import CommandPalette  from './components/CommandPalette.js';
import FilterOverlay   from './components/FilterOverlay.js';

import ProjectList from './views/ProjectList.js';
import ListView    from './views/List.js';
import BoardView   from './views/Board.js';
import ItemDetail  from './views/ItemDetail.js';
import ItemForm    from './views/ItemForm.js';
import Settings    from './views/Settings.js';

interface Props {
  config: Config;
  debug: boolean;
}

function ActiveView({ view }: { view: AppView }) {
  switch (view) {
    case 'PROJECT_LIST': return <ProjectList />;
    case 'LIST':         return <ListView />;
    case 'BOARD':        return <BoardView />;
    case 'ITEM_DETAIL':  return <ItemDetail />;
    case 'ITEM_FORM':    return <ItemForm />;
    case 'SETTINGS':     return <Settings />;
  }
}

function AppShell() {
  // Access state/dispatch via context (provider is the parent)
  const { state, dispatch } = React.useContext(AppContext)!;

  const overlayOpen = state.commandPaletteOpen || state.helpOpen || state.filterOverlayOpen;

  useInput(
    (input, key) => {
      if (matchKey(input, key, DEFAULT_KEYMAP.commandPalette)) {
        dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
        return;
      }
      if (matchKey(input, key, DEFAULT_KEYMAP.help)) {
        dispatch({ type: 'TOGGLE_HELP' });
        return;
      }
      if (matchKey(input, key, DEFAULT_KEYMAP.toggleSidebar)) {
        dispatch({ type: 'TOGGLE_SIDEBAR' });
        return;
      }
      if (matchKey(input, key, DEFAULT_KEYMAP.toggleView)) {
        if (state.activeProject) {
          dispatch({
            type: 'NAVIGATE',
            view: state.view === 'LIST' ? 'BOARD' : 'LIST',
          });
        }
        return;
      }
      if (matchKey(input, key, DEFAULT_KEYMAP.refresh)) {
        // Views respond to this via their own useInput — broadcast via toast
        dispatch({ type: 'SHOW_TOAST', message: 'Refreshing…', kind: 'info' });
        return;
      }
      if (matchKey(input, key, DEFAULT_KEYMAP.quit)) {
        process.exit(0);
      }
    },
    { isActive: !overlayOpen && !state.searchMode },
  );

  // Full-screen overlays replace the main shell (Ink has no z-index)
  if (state.helpOpen)            return <Help />;
  if (state.commandPaletteOpen)  return <CommandPalette />;
  if (state.filterOverlayOpen)   return <FilterOverlay />;

  return (
    <Box flexDirection="column" height={process.stdout.rows}>
      <Header />

      <Box flexGrow={1}>
        {state.sidebarOpen && <Sidebar />}
        <Box flexGrow={1}>
          <ActiveView view={state.view} />
        </Box>
      </Box>

      {state.toast && <Toast />}
      <StatusBar />
    </Box>
  );
}

export default function App({ config, debug: _debug }: Props) {
  const themeInitializedRef = React.useRef(false);
  if (!themeInitializedRef.current) {
    initTheme({
      theme: config.appearance.theme,
      highContrastText: config.appearance.highContrastText,
    });
    themeInitializedRef.current = true;
  }

  const [state, dispatch] = useReducer(appReducer, config, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <AppShell />
    </AppContext.Provider>
  );
}
