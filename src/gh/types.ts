export interface Project {
  number: number;
  id: string;
  title: string;
  shortDescription: string;
  url: string;
  closed: boolean;
  fields: Field[];
  items: Item[];
}

export interface Item {
  id: string;
  title: string;
  type: 'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE';
  status: string;
  priority: string;
  assignees: User[];
  labels: Label[];
  createdAt: string;
  updatedAt: string;
  body: string;
  fieldValues: Record<string, FieldValue>;
  content?: LinkedContent;
}

export interface Field {
  id: string;
  name: string;
  type: 'TEXT' | 'SINGLE_SELECT' | 'NUMBER' | 'DATE' | 'ITERATION';
  options: FieldOption[];
}

export interface FieldOption {
  id: string;
  name: string;
  color?: string;
}

export type FieldValue =
  | { type: 'text'; value: string }
  | { type: 'number'; value: number }
  | { type: 'date'; value: string }
  | { type: 'singleSelect'; optionId: string }
  | { type: 'iteration'; iterationId: string };

export interface User {
  login: string;
  name?: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface LinkedContent {
  type: 'Issue' | 'PullRequest';
  number: number;
  url: string;
  state: string;
  repository: string;
}

// Raw shapes returned by `gh project item-list --format json`
export interface RawItem {
  id: string;
  title: string;
  type?: 'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE';
  // gh CLI returns status/priority as flat option-name strings at the item level
  status?: string;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
  body?: string;
  assignees?: { nodes: User[] } | User[];
  labels?: { nodes: Label[] } | Label[];
  // fieldValues may be present in some API responses but is absent from gh CLI output
  fieldValues?: {
    nodes: Array<{
      field?: { id: string; name: string };
      text?: string;
      number?: number;
      date?: string;
      optionId?: string;
      iterationId?: string;
    }>;
  };
  content?: {
    __typename?: 'Issue' | 'PullRequest';
    // gh CLI uses "Issue" / "PullRequest" / "DraftIssue" (not the GraphQL __typename)
    type?: string;
    number?: number;
    url?: string;
    state?: string;
    repository?: { nameWithOwner: string } | string;
  };
}

export interface RawProject {
  number: number;
  id: string;
  title: string;
  shortDescription?: string;
  url: string;
  closed: boolean;
}

export interface RawField {
  id: string;
  name: string;
  type: string;
  options?: FieldOption[];
}
