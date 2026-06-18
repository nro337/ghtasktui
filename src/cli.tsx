import { createRequire } from 'module';
import { program } from 'commander';
import { render } from 'ink';
import React from 'react';
import { checkGHInstalled, checkAuth, enableDebug } from './gh/client.js';
import { loadConfig } from './config/config.js';
import App from './ui/App.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

program
  .name('ghtasktui')
  .description('A Linear-inspired TUI for GitHub Projects')
  .version(version)
  .option('--owner <owner>', 'GitHub owner (user or org)', '@me')
  .option('--debug', 'Log gh subprocess calls to ~/.config/ghtasktui/debug.log')
  .action(async (opts: { owner: string; debug: boolean }) => {
    if (opts.debug) enableDebug();

    try {
      await checkGHInstalled();
      await checkAuth();
    } catch (err) {
      console.error(String(err));
      process.exit(1);
    }

    const config = await loadConfig();
    if (opts.owner) {
      config.general.defaultOwner = opts.owner;
    }
    // Allow env-var override for Nerd Fonts
    if (process.env['GHTASKTUI_NERD_FONTS'] === '1') {
      config.appearance.nerdFonts = true;
    } else if (process.env['GHTASKTUI_NERD_FONTS'] === '0') {
      config.appearance.nerdFonts = false;
    }

    const { unmount } = render(
      <App config={config} debug={opts.debug ?? false} />,
      { exitOnCtrlC: false },
    );

    process.on('SIGINT', () => {
      unmount();
      process.exit(0);
    });
  });

program.parse();
