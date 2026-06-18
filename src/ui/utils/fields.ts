import type { Field, FieldOption, Item } from '../../gh/types.js';

export function findField(fields: Field[], name: string): Field | undefined {
  return fields.find(f => f.name.toLowerCase() === name.toLowerCase());
}

export function getOptionById(field: Field, optionId: string): FieldOption | undefined {
  return field.options.find(o => o.id === optionId);
}

export function getItemOption(item: Item, field: Field): FieldOption | undefined {
  const fv = item.fieldValues[field.id];
  if (fv?.type === 'singleSelect') return getOptionById(field, fv.optionId);
  // gh CLI returns option names as flat strings on item.status / item.priority
  const rawName = field.name.toLowerCase() === 'status' ? item.status
    : field.name.toLowerCase() === 'priority' ? item.priority
    : undefined;
  if (rawName) return field.options.find(o => o.name === rawName);
  return undefined;
}

export function getItemOptionId(item: Item, field: Field): string | undefined {
  return getItemOption(item, field)?.id;
}

export function cycleOption(
  field: Field,
  currentOptionId: string | undefined,
): FieldOption | undefined {
  if (field.options.length === 0) return undefined;
  if (!currentOptionId) return field.options[0];
  const idx = field.options.findIndex(o => o.id === currentOptionId);
  return field.options[(idx + 1) % field.options.length];
}

export interface GroupedItems {
  option: FieldOption | null;
  items: Item[];
}

// Groups items in the order of the status field's options.
// Items with no matching status end up in a trailing "No Status" group.
export function groupItemsByStatus(
  items: Item[],
  statusField: Field | undefined,
): GroupedItems[] {
  if (!statusField) return items.length > 0 ? [{ option: null, items }] : [];

  const groupMap = new Map<string, GroupedItems>();
  for (const option of statusField.options) {
    groupMap.set(option.id, { option, items: [] });
  }

  const noStatus: Item[] = [];
  for (const item of items) {
    const opt = getItemOption(item, statusField);
    if (opt) {
      const group = groupMap.get(opt.id);
      if (group) { group.items.push(item); continue; }
    }
    noStatus.push(item);
  }

  const result: GroupedItems[] = [];
  for (const group of groupMap.values()) {
    if (group.items.length > 0) result.push(group);
  }
  if (noStatus.length > 0) result.push({ option: null, items: noStatus });
  return result;
}

export const NO_STATUS_KEY = '__none__';

export type FlatRow =
  | { kind: 'header'; key: string; label: string; count: number; color?: string | undefined }
  | { kind: 'item';   key: string; item: Item };

export function buildFlatRows(
  groups: GroupedItems[],
  collapsed: Set<string>,
): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const group of groups) {
    const key = group.option?.id ?? NO_STATUS_KEY;
    rows.push({
      kind: 'header',
      key,
      label: group.option?.name ?? 'No Status',
      count: group.items.length,
      color: group.option?.color,
    });
    if (!collapsed.has(key)) {
      for (const item of group.items) {
        rows.push({ kind: 'item', key: item.id, item });
      }
    }
  }
  return rows;
}

/** Returns the header key that owns a given item row index in the flat list. */
export function getGroupKeyForRow(rows: FlatRow[], rowIdx: number): string | null {
  for (let i = rowIdx; i >= 0; i--) {
    const r = rows[i];
    if (r?.kind === 'header') return r.key;
  }
  return null;
}
