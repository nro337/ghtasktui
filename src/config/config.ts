import { cosmiconfig } from 'cosmiconfig';
import path from 'node:path';
import os from 'node:os';

export interface Config {
  general: {
    defaultOwner: string;
    defaultView: 'list' | 'board';
    refreshInterval: number;
  };
  appearance: {
    nerdFonts: boolean;
    sidebarWidth: number;
    detailPanelRatio: number;
  };
  keybindings: Record<string, string>;
  projects: Record<string, { defaultView?: 'list' | 'board' }>;
}

export const defaultConfig: Config = {
  general: {
    defaultOwner: '@me',
    defaultView: 'list',
    refreshInterval: 0,
  },
  appearance: {
    nerdFonts: false,
    sidebarWidth: 22,
    detailPanelRatio: 0.4,
  },
  keybindings: {},
  projects: {},
};

function merge(base: Config, overrides: DeepPartial<Config>): Config {
  return {
    general: { ...base.general, ...(overrides.general ?? {}) },
    appearance: { ...base.appearance, ...(overrides.appearance ?? {}) },
    keybindings: { ...base.keybindings, ...(overrides.keybindings ?? {}) } as Record<string, string>,
    projects: { ...base.projects, ...(overrides.projects ?? {}) } as Config['projects'],
  };
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export async function loadConfig(): Promise<Config> {
  const explorer = cosmiconfig('ghtasktui', {
    searchPlaces: [
      'ghtasktui.config.json',
      '.ghtasktuirc.json',
      '.ghtasktuirc',
      path.join(os.homedir(), '.config', 'ghtasktui', 'config.json'),
      path.join(os.homedir(), '.ghtasktuirc.json'),
      'package.json',
    ],
    packageProp: 'ghtasktui',
  });

  const result = await explorer.search();
  if (!result || result.isEmpty) return defaultConfig;

  return merge(defaultConfig, result.config as DeepPartial<Config>);
}
