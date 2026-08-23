import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cosmiconfig before importing config so loadConfig gets the mock
vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(),
}));

// Mock the filesystem and homedir so saveConfig never touches the real
// machine — assertions below inspect what *would* have been written.
vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('node:os', () => ({
  default: { homedir: () => '/fake/home' },
}));

import { cosmiconfig } from 'cosmiconfig';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, saveConfig, defaultConfig, type Config } from '../config.js';

const mockCosmiconfig = vi.mocked(cosmiconfig);
const mockMkdir = vi.mocked(fs.mkdir);
const mockWriteFile = vi.mocked(fs.writeFile);
const EXPECTED_CONFIG_PATH = path.join('/fake/home', '.config', 'ghtasktui', 'config.json');

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a mock cosmiconfig explorer. */
function mockExplorer(result: { config: unknown; isEmpty?: boolean } | null) {
  return { search: vi.fn().mockResolvedValue(result) };
}

beforeEach(() => {
  mockCosmiconfig.mockReset();
  mockMkdir.mockClear();
  mockWriteFile.mockClear();
});

// ─── defaultConfig ────────────────────────────────────────────────────────────

describe('defaultConfig', () => {
  it('has expected general defaults', () => {
    expect(defaultConfig.general.defaultOwner).toBe('@me');
    expect(defaultConfig.general.defaultView).toBe('list');
    expect(defaultConfig.general.refreshInterval).toBe(0);
  });

  it('has expected appearance defaults', () => {
    expect(defaultConfig.appearance.theme).toBe('dark');
    expect(defaultConfig.appearance.highContrastText).toBe(false);
    expect(defaultConfig.appearance.nerdFonts).toBe(false);
    expect(defaultConfig.appearance.sidebarWidth).toBe(22);
    expect(defaultConfig.appearance.detailPanelRatio).toBe(0.4);
  });

  it('has empty keybindings and projects', () => {
    expect(defaultConfig.keybindings).toEqual({});
    expect(defaultConfig.projects).toEqual({});
  });
});

// ─── loadConfig — no config file ─────────────────────────────────────────────

describe('loadConfig — no config file found', () => {
  it('returns defaultConfig when search() returns null', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer(null) as unknown as ReturnType<typeof cosmiconfig>);
    const config = await loadConfig();
    expect(config).toEqual(defaultConfig);
  });

  it('returns defaultConfig when search() returns an empty result', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({ config: {}, isEmpty: true }) as unknown as ReturnType<typeof cosmiconfig>);
    const config = await loadConfig();
    expect(config).toEqual(defaultConfig);
  });
});

// ─── loadConfig — partial overrides ──────────────────────────────────────────

describe('loadConfig — partial config file', () => {
  it('merges a partial general section, preserving other defaults', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: { general: { defaultOwner: 'my-org' } },
    }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config.general.defaultOwner).toBe('my-org');
    expect(config.general.defaultView).toBe('list');
    expect(config.general.refreshInterval).toBe(0);
    expect(config.appearance).toEqual(defaultConfig.appearance);
  });

  it('merges a partial appearance section', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: { appearance: { theme: 'midnight' as const } },
    }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config.appearance.theme).toBe('midnight');
    expect(config.appearance.highContrastText).toBe(false);
    expect(config.appearance.nerdFonts).toBe(false);
    expect(config.appearance.sidebarWidth).toBe(defaultConfig.appearance.sidebarWidth);
    expect(config.general).toEqual(defaultConfig.general);
  });

  it('merges keybindings from config', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: { keybindings: { quit: 'x' } },
    }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config.keybindings).toEqual({ quit: 'x' });
  });

  it('merges projects from config', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: { projects: { 'acme/web': { defaultView: 'board' } } },
    }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config.projects['acme/web']).toEqual({ defaultView: 'board' });
  });

  it('treats missing sections as defaults', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: {},
    }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config).toEqual(defaultConfig);
  });
});

// ─── loadConfig — full override ───────────────────────────────────────────────

describe('loadConfig — full config file', () => {
  it('replaces all fields when all sections are provided', async () => {
    const full = {
      general: { defaultOwner: 'acme', defaultView: 'board' as const, refreshInterval: 60000 },
      appearance: { theme: 'midnight' as const, highContrastText: true, nerdFonts: true, sidebarWidth: 30, detailPanelRatio: 0.6 },
      keybindings: { quit: 'x', help: 'h' },
      projects: { 'acme/api': { defaultView: 'list' as const } },
    };
    mockCosmiconfig.mockReturnValue(mockExplorer({ config: full }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config.general).toEqual(full.general);
    expect(config.appearance).toEqual(full.appearance);
    expect(config.keybindings).toEqual(full.keybindings);
    expect(config.projects).toEqual(full.projects);
  });
});

// ─── loadConfig — does not mutate defaultConfig ───────────────────────────────

describe('loadConfig — isolation', () => {
  it('does not mutate defaultConfig when merging', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: { general: { defaultOwner: 'acme' } },
    }) as unknown as ReturnType<typeof cosmiconfig>);

    await loadConfig();
    expect(defaultConfig.general.defaultOwner).toBe('@me');
  });
});

// ─── saveConfig ────────────────────────────────────────────────────────────

describe('saveConfig', () => {
  it('creates the config directory before writing', async () => {
    await saveConfig(defaultConfig);
    expect(mockMkdir).toHaveBeenCalledWith(
      path.dirname(EXPECTED_CONFIG_PATH),
      { recursive: true },
    );
  });

  it('writes to ~/.config/ghtasktui/config.json', async () => {
    await saveConfig(defaultConfig);
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    const [writtenPath] = mockWriteFile.mock.calls[0]!;
    expect(writtenPath).toBe(EXPECTED_CONFIG_PATH);
  });

  it('writes valid JSON containing the full config, including appearance changes', async () => {
    const withNewTheme: Config = {
      ...defaultConfig,
      appearance: { ...defaultConfig.appearance, theme: 'solarized', highContrastText: true },
    };
    await saveConfig(withNewTheme);

    const [, written] = mockWriteFile.mock.calls[0]!;
    const parsed = JSON.parse(written as string);
    expect(parsed).toEqual(withNewTheme);
  });

  it('mkdir runs before writeFile (directory must exist first)', async () => {
    const order: string[] = [];
    mockMkdir.mockImplementationOnce(async () => { order.push('mkdir'); return undefined; });
    mockWriteFile.mockImplementationOnce(async () => { order.push('writeFile'); return undefined; });

    await saveConfig(defaultConfig);
    expect(order).toEqual(['mkdir', 'writeFile']);
  });

  it('propagates a write failure instead of silently swallowing it', async () => {
    mockWriteFile.mockRejectedValueOnce(new Error('EACCES: permission denied'));
    await expect(saveConfig(defaultConfig)).rejects.toThrow('EACCES');
  });
});

// ─── saveConfig → loadConfig round trip (persistence across sessions) ───────

describe('saveConfig then loadConfig — persists across a simulated restart', () => {
  it('a saved theme/high-contrast choice is what the next loadConfig() returns', async () => {
    const changed: Config = {
      ...defaultConfig,
      appearance: { ...defaultConfig.appearance, theme: 'solarized', highContrastText: true },
    };

    // "Save" during this session.
    await saveConfig(changed);
    const [, written] = mockWriteFile.mock.calls[0]!;

    // Simulate the next launch: cosmiconfig reads back exactly what was
    // written to disk.
    mockCosmiconfig.mockReturnValue(
      mockExplorer({ config: JSON.parse(written as string) }) as unknown as ReturnType<typeof cosmiconfig>,
    );
    const reloaded = await loadConfig();

    expect(reloaded.appearance.theme).toBe('solarized');
    expect(reloaded.appearance.highContrastText).toBe(true);
    expect(reloaded).toEqual(changed);
  });
});
