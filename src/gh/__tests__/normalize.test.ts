import { describe, it, expect } from 'vitest';
import { normalizeProject, normalizeField, normalizeItem } from '../normalize.js';
import type { RawProject, RawField, RawItem } from '../types.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function rawProject(overrides: Partial<RawProject> = {}): RawProject {
  return {
    number: 1,
    id: 'PVT_1',
    title: 'My Project',
    url: 'https://github.com/orgs/acme/projects/1',
    closed: false,
    ...overrides,
  };
}

function rawField(overrides: Partial<RawField> = {}): RawField {
  return {
    id: 'PVTF_1',
    name: 'Status',
    type: 'ProjectV2SingleSelectField',
    ...overrides,
  };
}

function rawItem(overrides: Partial<RawItem> = {}): RawItem {
  return {
    id: 'PVTI_1',
    title: 'Fix the bug',
    ...overrides,
  };
}

// ─── normalizeProject ────────────────────────────────────────────────────────

describe('normalizeProject', () => {
  it('passes through required fields', () => {
    const result = normalizeProject(rawProject({ number: 42, id: 'PVT_X', title: 'Alpha', url: 'https://x', closed: true }));
    expect(result.number).toBe(42);
    expect(result.id).toBe('PVT_X');
    expect(result.title).toBe('Alpha');
    expect(result.url).toBe('https://x');
    expect(result.closed).toBe(true);
  });

  it('defaults shortDescription to empty string when absent', () => {
    const result = normalizeProject(rawProject());
    expect(result.shortDescription).toBe('');
  });

  it('uses shortDescription when present', () => {
    const result = normalizeProject(rawProject({ shortDescription: 'Hello' }));
    expect(result.shortDescription).toBe('Hello');
  });

  it('always initializes fields and items as empty arrays', () => {
    const result = normalizeProject(rawProject());
    expect(result.fields).toEqual([]);
    expect(result.items).toEqual([]);
  });
});

// ─── normalizeField ──────────────────────────────────────────────────────────

describe('normalizeField', () => {
  it.each([
    ['ProjectV2SingleSelectField', 'SINGLE_SELECT'],
    ['ProjectV2IterationField', 'ITERATION'],
    ['ProjectV2NumberField', 'NUMBER'],
    ['ProjectV2DateField', 'DATE'],
  ] as const)('maps %s → %s', (rawType, expected) => {
    const result = normalizeField(rawField({ type: rawType }));
    expect(result.type).toBe(expected);
  });

  it('defaults unknown type to TEXT', () => {
    const result = normalizeField(rawField({ type: 'ProjectV2TextField' }));
    expect(result.type).toBe('TEXT');
  });

  it('defaults completely unknown type string to TEXT', () => {
    const result = normalizeField(rawField({ type: 'SomethingNew' }));
    expect(result.type).toBe('TEXT');
  });

  it('passes through id and name', () => {
    const result = normalizeField(rawField({ id: 'F1', name: 'Priority' }));
    expect(result.id).toBe('F1');
    expect(result.name).toBe('Priority');
  });

  it('defaults options to empty array when absent', () => {
    const result = normalizeField(rawField({}));
    expect(result.options).toEqual([]);
  });

  it('passes through options when present', () => {
    const opts = [{ id: 'O1', name: 'Todo', color: 'RED' }];
    const result = normalizeField(rawField({ options: opts }));
    expect(result.options).toEqual(opts);
  });
});

// ─── normalizeItem ────────────────────────────────────────────────────────────

describe('normalizeItem', () => {
  // ── basic fields ──────────────────────────────────────────────────────────

  it('passes through id and title', () => {
    const result = normalizeItem(rawItem({ id: 'I1', title: 'Do thing' }));
    expect(result.id).toBe('I1');
    expect(result.title).toBe('Do thing');
  });

  it('defaults type to DRAFT_ISSUE when absent', () => {
    const result = normalizeItem(rawItem({}));
    expect(result.type).toBe('DRAFT_ISSUE');
  });

  it('uses type when present', () => {
    const result = normalizeItem(rawItem({ type: 'ISSUE' }));
    expect(result.type).toBe('ISSUE');
  });

  it('defaults optional string fields to empty string', () => {
    const result = normalizeItem(rawItem());
    expect(result.status).toBe('');
    expect(result.priority).toBe('');
    expect(result.createdAt).toBe('');
    expect(result.updatedAt).toBe('');
    expect(result.body).toBe('');
  });

  it('uses optional string fields when present', () => {
    const result = normalizeItem(rawItem({
      status: 'In Progress',
      priority: 'High',
      createdAt: '2024-01-01',
      updatedAt: '2024-06-01',
      body: 'Some body',
    }));
    expect(result.status).toBe('In Progress');
    expect(result.priority).toBe('High');
    expect(result.createdAt).toBe('2024-01-01');
    expect(result.updatedAt).toBe('2024-06-01');
    expect(result.body).toBe('Some body');
  });

  // ── fieldValues parsing ───────────────────────────────────────────────────

  it('returns empty fieldValues when fieldValues absent', () => {
    const result = normalizeItem(rawItem({}));
    expect(result.fieldValues).toEqual({});
  });

  it('parses text field value', () => {
    const result = normalizeItem(rawItem({
      fieldValues: { nodes: [{ field: { id: 'F1', name: 'Notes' }, text: 'hello' }] },
    }));
    expect(result.fieldValues['F1']).toEqual({ type: 'text', value: 'hello' });
  });

  it('parses number field value', () => {
    const result = normalizeItem(rawItem({
      fieldValues: { nodes: [{ field: { id: 'F2', name: 'Score' }, number: 42 }] },
    }));
    expect(result.fieldValues['F2']).toEqual({ type: 'number', value: 42 });
  });

  it('parses date field value', () => {
    const result = normalizeItem(rawItem({
      fieldValues: { nodes: [{ field: { id: 'F3', name: 'Due' }, date: '2025-12-31' }] },
    }));
    expect(result.fieldValues['F3']).toEqual({ type: 'date', value: '2025-12-31' });
  });

  it('parses singleSelect field value', () => {
    const result = normalizeItem(rawItem({
      fieldValues: { nodes: [{ field: { id: 'F4', name: 'Status' }, optionId: 'OPT_1' }] },
    }));
    expect(result.fieldValues['F4']).toEqual({ type: 'singleSelect', optionId: 'OPT_1' });
  });

  it('parses iteration field value', () => {
    const result = normalizeItem(rawItem({
      fieldValues: { nodes: [{ field: { id: 'F5', name: 'Sprint' }, iterationId: 'ITER_1' }] },
    }));
    expect(result.fieldValues['F5']).toEqual({ type: 'iteration', iterationId: 'ITER_1' });
  });

  it('skips nodes without a field', () => {
    const result = normalizeItem(rawItem({
      fieldValues: { nodes: [{ text: 'orphan' }] },
    }));
    expect(Object.keys(result.fieldValues)).toHaveLength(0);
  });

  it('skips nodes with no recognized value type', () => {
    const result = normalizeItem(rawItem({
      fieldValues: { nodes: [{ field: { id: 'F9', name: 'Unknown' } }] },
    }));
    expect(result.fieldValues['F9']).toBeUndefined();
  });

  it('parses multiple field values from a single item', () => {
    const result = normalizeItem(rawItem({
      fieldValues: {
        nodes: [
          { field: { id: 'F1', name: 'Status' }, optionId: 'OPT_A' },
          { field: { id: 'F2', name: 'Score' }, number: 7 },
        ],
      },
    }));
    expect(result.fieldValues['F1']).toEqual({ type: 'singleSelect', optionId: 'OPT_A' });
    expect(result.fieldValues['F2']).toEqual({ type: 'number', value: 7 });
  });

  // ── assignees / labels ────────────────────────────────────────────────────

  it('defaults assignees to empty array when absent', () => {
    const result = normalizeItem(rawItem());
    expect(result.assignees).toEqual([]);
  });

  it('handles assignees as flat array', () => {
    const users = [{ login: 'alice' }, { login: 'bob' }];
    const result = normalizeItem(rawItem({ assignees: users }));
    expect(result.assignees).toEqual(users);
  });

  it('handles assignees as nodes object', () => {
    const users = [{ login: 'alice' }];
    const result = normalizeItem(rawItem({ assignees: { nodes: users } }));
    expect(result.assignees).toEqual(users);
  });

  it('handles assignees nodes object with empty nodes', () => {
    const result = normalizeItem(rawItem({ assignees: { nodes: [] } }));
    expect(result.assignees).toEqual([]);
  });

  it('defaults labels to empty array when absent', () => {
    const result = normalizeItem(rawItem());
    expect(result.labels).toEqual([]);
  });

  it('handles labels as flat array', () => {
    const lbls = [{ id: 'L1', name: 'bug', color: 'red' }];
    const result = normalizeItem(rawItem({ labels: lbls }));
    expect(result.labels).toEqual(lbls);
  });

  it('handles labels as nodes object', () => {
    const lbls = [{ id: 'L1', name: 'bug', color: 'red' }];
    const result = normalizeItem(rawItem({ labels: { nodes: lbls } }));
    expect(result.labels).toEqual(lbls);
  });

  // ── content linking ───────────────────────────────────────────────────────

  it('sets no content when content absent', () => {
    const result = normalizeItem(rawItem());
    expect(result.content).toBeUndefined();
  });

  it('sets no content for DraftIssue __typename', () => {
    const result = normalizeItem(rawItem({
      content: { type: 'DraftIssue', number: 1, url: 'https://x', state: 'open' },
    }));
    expect(result.content).toBeUndefined();
  });

  it('sets no content when content type is DraftIssue via __typename', () => {
    // __typename takes precedence over type when present
    const result = normalizeItem(rawItem({
      content: { type: 'DraftIssue' },
    }));
    expect(result.content).toBeUndefined();
  });

  it('links Issue content via __typename', () => {
    const result = normalizeItem(rawItem({
      content: {
        __typename: 'Issue',
        number: 5,
        url: 'https://github.com/acme/repo/issues/5',
        state: 'open',
        repository: 'acme/repo',
      },
    }));
    expect(result.content).toEqual({
      type: 'Issue',
      number: 5,
      url: 'https://github.com/acme/repo/issues/5',
      state: 'open',
      repository: 'acme/repo',
    });
  });

  it('links PullRequest content via __typename', () => {
    const result = normalizeItem(rawItem({
      content: {
        __typename: 'PullRequest',
        number: 12,
        url: 'https://github.com/acme/repo/pull/12',
        state: 'merged',
        repository: 'acme/repo',
      },
    }));
    expect(result.content?.type).toBe('PullRequest');
    expect(result.content?.number).toBe(12);
  });

  it('links Issue content via type field (gh CLI format)', () => {
    const result = normalizeItem(rawItem({
      content: {
        type: 'Issue',
        number: 3,
        url: 'https://github.com/acme/repo/issues/3',
        state: 'closed',
        repository: { nameWithOwner: 'acme/repo' },
      },
    }));
    expect(result.content?.type).toBe('Issue');
    expect(result.content?.repository).toBe('acme/repo');
  });

  it('extracts repository name from string', () => {
    const result = normalizeItem(rawItem({
      content: { __typename: 'Issue', number: 1, url: '', state: '', repository: 'my-org/my-repo' },
    }));
    expect(result.content?.repository).toBe('my-org/my-repo');
  });

  it('extracts repository name from nameWithOwner object', () => {
    const result = normalizeItem(rawItem({
      content: {
        __typename: 'Issue',
        number: 1,
        url: '',
        state: '',
        repository: { nameWithOwner: 'my-org/my-repo' },
      },
    }));
    expect(result.content?.repository).toBe('my-org/my-repo');
  });

  it('defaults repository to empty string when absent', () => {
    const result = normalizeItem(rawItem({
      content: { __typename: 'Issue', number: 1, url: '', state: '' },
    }));
    expect(result.content?.repository).toBe('');
  });

  it('defaults content number to 0 when absent', () => {
    const result = normalizeItem(rawItem({
      content: { __typename: 'Issue', url: '', state: '', repository: '' },
    }));
    expect(result.content?.number).toBe(0);
  });
});
