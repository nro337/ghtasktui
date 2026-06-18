import { execa } from 'execa';
import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type {
  Project,
  Item,
  Field,
  FieldValue,
  RawItem,
  RawProject,
  RawField,
} from './types.js';
import { normalizeItem, normalizeProject, normalizeField } from './normalize.js';

// ── Debug logging ─────────────────────────────────────────────────────────────

let _debugEnabled = false;
const DEBUG_LOG = join(homedir(), '.config', 'ghtasktui', 'debug.log');

export function enableDebug(): void {
  _debugEnabled = true;
  try {
    mkdirSync(join(homedir(), '.config', 'ghtasktui'), { recursive: true });
  } catch { /* ignore */ }
}

function debugLog(message: string): void {
  if (!_debugEnabled) return;
  try {
    appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${message}\n`);
  } catch { /* ignore */ }
}

// ── GHError ───────────────────────────────────────────────────────────────────

export class GHError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly exitCode: number,
  ) {
    super(message);
    this.name = 'GHError';
  }
}

// ── Core gh runner with retry ─────────────────────────────────────────────────

const RETRY_DELAY_MS = 500;
const MAX_ATTEMPTS = 2;

async function gh(args: string[]): Promise<unknown> {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    debugLog(`gh ${args.join(' ')} (attempt ${attempt})`);
    try {
      const result = await execa('gh', args);
      const out = result.stdout.trim();
      debugLog(`  → ok (${out.length} bytes)`);
      if (!out) return null;
      try {
        return JSON.parse(out);
      } catch {
        return out;
      }
    } catch (err: unknown) {
      if (
        err != null &&
        typeof err === 'object' &&
        'stderr' in err &&
        'exitCode' in err
      ) {
        const e = err as { stderr: string; exitCode: number; message: string };
        debugLog(`  → error exitCode=${e.exitCode} stderr=${e.stderr}`);
        // Don't retry auth/not-found errors
        if (e.exitCode === 4 || e.exitCode === 1) {
          throw new GHError(e.message, e.stderr, e.exitCode);
        }
        lastErr = new GHError(e.message, e.stderr, e.exitCode);
      } else {
        lastErr = err;
      }
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  throw lastErr;
}

export async function checkAuth(): Promise<void> {
  try {
    await execa('gh', ['auth', 'status']);
  } catch (err: unknown) {
    if (
      err != null &&
      typeof err === 'object' &&
      'exitCode' in err &&
      (err as { exitCode: number }).exitCode !== 0
    ) {
      throw new GHError(
        'Not authenticated. Run: gh auth login',
        '',
        (err as { exitCode: number }).exitCode,
      );
    }
    throw err;
  }
}

export async function checkGHInstalled(): Promise<void> {
  try {
    await execa('gh', ['--version']);
  } catch {
    throw new Error(
      'gh CLI not found. Install it from https://cli.github.com',
    );
  }
}

export async function listProjects(owner: string): Promise<Project[]> {
  const raw = await gh([
    'project', 'list',
    '--owner', owner,
    '--format', 'json',
    '--limit', '100',
  ]);
  const data = raw as { projects: RawProject[] };
  return data.projects.map(normalizeProject);
}

export async function getProject(
  owner: string,
  number: number,
): Promise<Project> {
  const raw = await gh([
    'project', 'view', String(number),
    '--owner', owner,
    '--format', 'json',
  ]);
  return normalizeProject(raw as RawProject);
}

export async function listItems(
  owner: string,
  projectNumber: number,
  limit = 25,
  after?: string,
): Promise<{ items: Item[]; hasNextPage: boolean; endCursor: string | null }> {
  const args = [
    'project', 'item-list', String(projectNumber),
    '--owner', owner,
    '--format', 'json',
    '--limit', String(limit),
  ];
  if (after) args.push('--after', after);

  const raw = await gh(args);
  const data = raw as { items: RawItem[]; pageInfo?: { hasNextPage: boolean; endCursor: string | null } };

  return {
    items: data.items.map(normalizeItem),
    hasNextPage: data.pageInfo?.hasNextPage ?? false,
    endCursor: data.pageInfo?.endCursor ?? null,
  };
}

export async function createItem(
  owner: string,
  projectNumber: number,
  title: string,
): Promise<Item> {
  const raw = await gh([
    'project', 'item-create', String(projectNumber),
    '--owner', owner,
    '--title', title,
    '--format', 'json',
  ]);
  return normalizeItem(raw as RawItem);
}

export async function editItemField(
  itemId: string,
  projectId: string,
  fieldId: string,
  value: FieldValue,
): Promise<void> {
  const args = [
    'project', 'item-edit',
    '--id', itemId,
    '--project-id', projectId,
    '--field-id', fieldId,
  ];

  switch (value.type) {
    case 'text':
      args.push('--text', value.value);
      break;
    case 'number':
      args.push('--number', String(value.value));
      break;
    case 'date':
      args.push('--date', value.value);
      break;
    case 'singleSelect':
      args.push('--single-select-option-id', value.optionId);
      break;
    case 'iteration':
      args.push('--iteration-id', value.iterationId);
      break;
  }

  await gh(args);
}

export async function deleteItem(itemId: string): Promise<void> {
  await gh(['project', 'item-delete', '--id', itemId]);
}

export async function listFields(
  owner: string,
  projectNumber: number,
): Promise<Field[]> {
  const raw = await gh([
    'project', 'field-list', String(projectNumber),
    '--owner', owner,
    '--format', 'json',
  ]);
  const data = raw as { fields: RawField[] };
  return data.fields.map(normalizeField);
}

export async function createField(
  projectId: string,
  name: string,
  dataType: string,
): Promise<Field> {
  const raw = await gh([
    'project', 'field-create', projectId,
    '--name', name,
    '--data-type', dataType,
    '--format', 'json',
  ]);
  return normalizeField(raw as RawField);
}

export async function deleteField(fieldId: string): Promise<void> {
  await gh(['project', 'field-delete', '--id', fieldId]);
}

export async function createProject(
  owner: string,
  title: string,
): Promise<Project> {
  const raw = await gh([
    'project', 'create',
    '--owner', owner,
    '--title', title,
    '--format', 'json',
  ]);
  return normalizeProject(raw as RawProject);
}

export async function editProject(
  number: number,
  owner: string,
  title: string,
): Promise<void> {
  await gh([
    'project', 'edit', String(number),
    '--owner', owner,
    '--title', title,
  ]);
}

export async function deleteProject(
  number: number,
  owner: string,
): Promise<void> {
  await gh(['project', 'delete', String(number), '--owner', owner]);
}

export async function editItemTitle(
  itemId: string,
  projectId: string,
  title: string,
): Promise<void> {
  await gh([
    'project', 'item-edit',
    '--id', itemId,
    '--project-id', projectId,
    '--title', title,
  ]);
}

export async function openInBrowser(url: string): Promise<void> {
  const platform = process.platform;
  if (platform === 'darwin') {
    await execa('open', [url]);
  } else if (platform === 'win32') {
    await execa('cmd', ['/c', 'start', '', url]);
  } else {
    await execa('xdg-open', [url]);
  }
}
