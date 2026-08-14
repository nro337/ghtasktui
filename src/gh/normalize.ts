import type {
  Project,
  Item,
  Field,
  FieldValue,
  RawItem,
  RawProject,
  RawField,
  Comment,
  RawComment,
} from './types.js';

export function normalizeProject(raw: RawProject): Project {
  return {
    number: raw.number,
    id: raw.id,
    title: raw.title,
    shortDescription: raw.shortDescription ?? '',
    url: raw.url,
    closed: raw.closed,
    fields: [],
    items: [],
  };
}

export function normalizeField(raw: RawField): Field {
  const typeMap: Record<string, Field['type']> = {
    ProjectV2SingleSelectField: 'SINGLE_SELECT',
    ProjectV2IterationField: 'ITERATION',
    ProjectV2NumberField: 'NUMBER',
    ProjectV2DateField: 'DATE',
  };

  return {
    id: raw.id,
    name: raw.name,
    type: typeMap[raw.type] ?? 'TEXT',
    options: raw.options ?? [],
  };
}

export function normalizeItem(raw: RawItem): Item {
  const fieldValues: Record<string, FieldValue> = {};

  for (const node of raw.fieldValues?.nodes ?? []) {
    if (!node.field) continue;
    const fieldId = node.field.id;

    if (node.text !== undefined) {
      fieldValues[fieldId] = { type: 'text', value: node.text };
    } else if (node.number !== undefined) {
      fieldValues[fieldId] = { type: 'number', value: node.number };
    } else if (node.date !== undefined) {
      fieldValues[fieldId] = { type: 'date', value: node.date };
    } else if (node.optionId !== undefined) {
      fieldValues[fieldId] = { type: 'singleSelect', optionId: node.optionId };
    } else if (node.iterationId !== undefined) {
      fieldValues[fieldId] = { type: 'iteration', iterationId: node.iterationId };
    }
  }

  const assignees = Array.isArray(raw.assignees)
    ? raw.assignees
    : (raw.assignees?.nodes ?? []);
  const labels = Array.isArray(raw.labels)
    ? raw.labels
    : (raw.labels?.nodes ?? []);

  // `gh project item-list` doesn't populate the top-level `type` field in
  // current versions of the CLI — it's only ever present on `content`. Derive
  // the item type from content when `raw.type` is absent, so real issues/PRs
  // aren't misclassified as drafts.
  const contentType: string | undefined = raw.content?.__typename ?? raw.content?.type;
  const derivedType: Item['type'] =
    raw.type ??
    (contentType === 'PullRequest' ? 'PULL_REQUEST'
      : contentType === 'Issue' ? 'ISSUE'
      : 'DRAFT_ISSUE');

  const base: Item = {
    id: raw.id,
    title: raw.title,
    type: derivedType,
    // gh CLI returns option names as flat strings; resolved to option IDs in the UI
    status: raw.status ?? '',
    priority: raw.priority ?? '',
    assignees,
    labels,
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
    body: raw.body ?? '',
    fieldValues,
  };

  if (raw.content && contentType && contentType !== 'DraftIssue') {
    const repo = raw.content.repository;
    const repoName = typeof repo === 'string'
      ? repo
      : (repo?.nameWithOwner ?? '');
    base.content = {
      type: contentType as 'Issue' | 'PullRequest',
      number: raw.content.number ?? 0,
      url: raw.content.url ?? '',
      state: raw.content.state ?? '',
      repository: repoName,
    };
  }

  return base;
}

export function normalizeComment(raw: RawComment): Comment {
  return {
    id: raw.id,
    author: raw.author?.login ?? 'unknown',
    body: raw.body,
    createdAt: raw.createdAt,
  };
}
