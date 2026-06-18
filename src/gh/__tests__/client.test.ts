import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GHError } from '../client.js';

// Mock execa before any imports that pull in client.ts
vi.mock('execa', () => ({ execa: vi.fn() }));

// Import after mock registration so client.ts gets the mocked execa
import { execa } from 'execa';
import {
  listProjects,
  listItems,
  editItemField,
  deleteItem,
  editItemTitle,
  openInBrowser,
} from '../client.js';

const mockExeca = vi.mocked(execa);

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build an execa-style success result. */
function execaOk(stdout: string) {
  return { stdout, stderr: '', exitCode: 0 } as any;
}

/** Build an execa-style error (what execa throws on non-zero exit). */
function execaFail(exitCode: number, stderr = 'error') {
  return Object.assign(new Error('gh failed'), { exitCode, stderr });
}

/** Capture the args passed to the most recent execa('gh', ...) call. */
function lastGHArgs(): string[] {
  const call = mockExeca.mock.calls.find(c => c[0] === 'gh');
  if (!call) throw new Error('no gh call found');
  return call[1] as string[];
}

// ─── GHError ─────────────────────────────────────────────────────────────────

describe('GHError', () => {
  it('sets name, message, stderr, exitCode', () => {
    const err = new GHError('fail', 'some stderr', 42);
    expect(err.name).toBe('GHError');
    expect(err.message).toBe('fail');
    expect(err.stderr).toBe('some stderr');
    expect(err.exitCode).toBe(42);
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── gh() core — via listProjects ─────────────────────────────────────────────

describe('gh() — JSON parsing', () => {
  beforeEach(() => mockExeca.mockReset());

  it('parses JSON stdout and returns the data', async () => {
    mockExeca.mockResolvedValue(execaOk(JSON.stringify({ projects: [] })));
    const result = await listProjects('acme');
    expect(result).toEqual([]);
  });

  it('returns non-JSON stdout as a raw string (via deleteItem)', async () => {
    // deleteItem doesn't use the return value so a raw string result is safe to observe
    mockExeca.mockResolvedValue(execaOk('Deleted.'));
    await expect(deleteItem('I1')).resolves.toBeUndefined();
  });
});

describe('gh() — empty stdout', () => {
  beforeEach(() => mockExeca.mockReset());

  it('resolves without throwing for empty stdout (void-return functions)', async () => {
    mockExeca.mockResolvedValue(execaOk(''));
    await expect(deleteItem('I1')).resolves.toBeUndefined();
  });
});

describe('gh() — retry logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockExeca.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('retries once on a transient error and succeeds on second attempt', async () => {
    mockExeca
      .mockRejectedValueOnce(execaFail(2, 'rate limit'))
      .mockResolvedValue(execaOk(JSON.stringify({ projects: [] })));

    const promise = listProjects('acme');
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual([]);
    expect(mockExeca).toHaveBeenCalledTimes(2);
  });

  it('throws after all attempts fail', async () => {
    mockExeca
      .mockRejectedValueOnce(execaFail(2, 'err1'))
      .mockRejectedValueOnce(execaFail(2, 'err2'));

    // Run the rejection and the timer advance concurrently to avoid
    // an unhandled-rejection warning between promise creation and timer flush
    await Promise.all([
      expect(listProjects('acme')).rejects.toBeInstanceOf(GHError),
      vi.runAllTimersAsync(),
    ]);
  });
});

describe('gh() — non-retryable errors', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockExeca.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('throws immediately on exitCode 4 (auth error) without retrying', async () => {
    mockExeca.mockRejectedValue(execaFail(4, 'auth required'));
    await Promise.all([
      expect(listProjects('acme')).rejects.toMatchObject({ exitCode: 4 }),
      vi.runAllTimersAsync(),
    ]);
    expect(mockExeca).toHaveBeenCalledTimes(1);
  });

  it('throws immediately on exitCode 1 (not found) without retrying', async () => {
    mockExeca.mockRejectedValue(execaFail(1, 'not found'));
    await Promise.all([
      expect(listProjects('acme')).rejects.toMatchObject({ exitCode: 1 }),
      vi.runAllTimersAsync(),
    ]);
    expect(mockExeca).toHaveBeenCalledTimes(1);
  });
});

// ─── listItems — pagination ───────────────────────────────────────────────────

describe('listItems', () => {
  beforeEach(() => mockExeca.mockReset());

  it('does not include --after when no cursor provided', async () => {
    mockExeca.mockResolvedValue(execaOk(JSON.stringify({ items: [], pageInfo: { hasNextPage: false, endCursor: null } })));
    await listItems('acme', 1);
    expect(lastGHArgs()).not.toContain('--after');
  });

  it('includes --after <cursor> when cursor is provided', async () => {
    mockExeca.mockResolvedValue(execaOk(JSON.stringify({ items: [], pageInfo: { hasNextPage: false, endCursor: null } })));
    await listItems('acme', 1, 25, 'cursor_abc');
    const args = lastGHArgs();
    expect(args).toContain('--after');
    expect(args[args.indexOf('--after') + 1]).toBe('cursor_abc');
  });

  it('returns hasNextPage and endCursor from pageInfo', async () => {
    mockExeca.mockResolvedValue(execaOk(JSON.stringify({
      items: [],
      pageInfo: { hasNextPage: true, endCursor: 'next_cursor' },
    })));
    const result = await listItems('acme', 1);
    expect(result.hasNextPage).toBe(true);
    expect(result.endCursor).toBe('next_cursor');
  });

  it('defaults hasNextPage=false and endCursor=null when pageInfo absent', async () => {
    mockExeca.mockResolvedValue(execaOk(JSON.stringify({ items: [] })));
    const result = await listItems('acme', 1);
    expect(result.hasNextPage).toBe(false);
    expect(result.endCursor).toBeNull();
  });

  it('passes custom limit as --limit flag', async () => {
    mockExeca.mockResolvedValue(execaOk(JSON.stringify({ items: [], pageInfo: null })));
    await listItems('acme', 1, 50);
    const args = lastGHArgs();
    expect(args[args.indexOf('--limit') + 1]).toBe('50');
  });
});

// ─── editItemField — value type branching ────────────────────────────────────

describe('editItemField — CLI flag per value type', () => {
  beforeEach(() => mockExeca.mockReset());

  it('passes --text for text value', async () => {
    mockExeca.mockResolvedValue(execaOk(''));
    await editItemField('ITEM', 'PROJ', 'FIELD', { type: 'text', value: 'hello' });
    expect(lastGHArgs()).toContain('--text');
    expect(lastGHArgs()[lastGHArgs().indexOf('--text') + 1]).toBe('hello');
  });

  it('passes --number for number value', async () => {
    mockExeca.mockResolvedValue(execaOk(''));
    await editItemField('ITEM', 'PROJ', 'FIELD', { type: 'number', value: 42 });
    expect(lastGHArgs()).toContain('--number');
    expect(lastGHArgs()[lastGHArgs().indexOf('--number') + 1]).toBe('42');
  });

  it('passes --date for date value', async () => {
    mockExeca.mockResolvedValue(execaOk(''));
    await editItemField('ITEM', 'PROJ', 'FIELD', { type: 'date', value: '2025-01-31' });
    expect(lastGHArgs()).toContain('--date');
    expect(lastGHArgs()[lastGHArgs().indexOf('--date') + 1]).toBe('2025-01-31');
  });

  it('passes --single-select-option-id for singleSelect value', async () => {
    mockExeca.mockResolvedValue(execaOk(''));
    await editItemField('ITEM', 'PROJ', 'FIELD', { type: 'singleSelect', optionId: 'OPT_1' });
    expect(lastGHArgs()).toContain('--single-select-option-id');
    expect(lastGHArgs()[lastGHArgs().indexOf('--single-select-option-id') + 1]).toBe('OPT_1');
  });

  it('passes --iteration-id for iteration value', async () => {
    mockExeca.mockResolvedValue(execaOk(''));
    await editItemField('ITEM', 'PROJ', 'FIELD', { type: 'iteration', iterationId: 'ITER_1' });
    expect(lastGHArgs()).toContain('--iteration-id');
    expect(lastGHArgs()[lastGHArgs().indexOf('--iteration-id') + 1]).toBe('ITER_1');
  });

  it('always passes --id, --project-id, --field-id', async () => {
    mockExeca.mockResolvedValue(execaOk(''));
    await editItemField('ITEM_X', 'PROJ_X', 'FIELD_X', { type: 'text', value: '' });
    const args = lastGHArgs();
    expect(args[args.indexOf('--id') + 1]).toBe('ITEM_X');
    expect(args[args.indexOf('--project-id') + 1]).toBe('PROJ_X');
    expect(args[args.indexOf('--field-id') + 1]).toBe('FIELD_X');
  });
});

// ─── editItemTitle ────────────────────────────────────────────────────────────

describe('editItemTitle', () => {
  beforeEach(() => mockExeca.mockReset());

  it('passes --title to item-edit', async () => {
    mockExeca.mockResolvedValue(execaOk(''));
    await editItemTitle('ITEM', 'PROJ', 'New Title');
    const args = lastGHArgs();
    expect(args).toContain('--title');
    expect(args[args.indexOf('--title') + 1]).toBe('New Title');
  });
});

// ─── openInBrowser — platform branching ──────────────────────────────────────

describe('openInBrowser', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
    mockExeca.mockReset();
  });

  function setPlatform(p: string) {
    Object.defineProperty(process, 'platform', { value: p, writable: true });
  }

  it('uses "open" on darwin', async () => {
    setPlatform('darwin');
    mockExeca.mockResolvedValue(execaOk(''));
    await openInBrowser('https://example.com');
    expect(mockExeca).toHaveBeenCalledWith('open', ['https://example.com']);
  });

  it('uses "cmd /c start" on win32', async () => {
    setPlatform('win32');
    mockExeca.mockResolvedValue(execaOk(''));
    await openInBrowser('https://example.com');
    expect(mockExeca).toHaveBeenCalledWith('cmd', ['/c', 'start', '', 'https://example.com']);
  });

  it('uses "xdg-open" on linux', async () => {
    setPlatform('linux');
    mockExeca.mockResolvedValue(execaOk(''));
    await openInBrowser('https://example.com');
    expect(mockExeca).toHaveBeenCalledWith('xdg-open', ['https://example.com']);
  });
});
