import type {
  Project,
  Item,
  Field,
  FieldValue,
  RawItem,
  RawProject,
  RawField,
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

  const base: Item = {
    id: raw.id,
    title: raw.title,
    type: raw.type ?? 'DRAFT_ISSUE',
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

  if (raw.content) {
    const repo = raw.content.repository;
    const repoName = typeof repo === 'string'
      ? repo
      : (repo?.nameWithOwner ?? '');
    const contentType: string | undefined = raw.content.__typename ?? raw.content.type;
    if (contentType && contentType !== 'DraftIssue') {
      base.content = {
        type: contentType as 'Issue' | 'PullRequest',
        number: raw.content.number ?? 0,
        url: raw.content.url ?? '',
        state: raw.content.state ?? '',
        repository: repoName,
      };
    }
  }

  return base;
}
