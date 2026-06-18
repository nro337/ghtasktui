import Fuse from 'fuse.js';
import type { Item, Field } from '../../gh/types.js';
import type { ItemFilters } from '../hooks/useAppState.js';
import { findField, getItemOptionId, getItemOption } from './fields.js';

export function filterItems(
  items: Item[],
  filters: ItemFilters,
  fields: Field[],
): Item[] {
  // Fast path: no filters active
  if (
    filters.statusIds.length === 0 &&
    filters.priorityNames.length === 0 &&
    filters.types.length === 0 &&
    !filters.searchQuery
  ) {
    return items;
  }

  let result = items;

  if (filters.statusIds.length > 0) {
    const sf = findField(fields, 'Status');
    if (sf) {
      result = result.filter(item => {
        const optId = getItemOptionId(item, sf);
        return optId !== undefined && filters.statusIds.includes(optId);
      });
    }
  }

  if (filters.priorityNames.length > 0) {
    const pf = findField(fields, 'Priority');
    if (pf) {
      result = result.filter(item => {
        const opt = getItemOption(item, pf);
        return opt !== undefined && filters.priorityNames.includes(opt.name.toLowerCase());
      });
    }
  }

  if (filters.types.length > 0) {
    result = result.filter(item =>
      (filters.types as string[]).includes(item.type),
    );
  }

  if (filters.searchQuery) {
    const fuse = new Fuse(result, {
      keys: ['title', 'body'],
      threshold: 0.5,
    });
    result = fuse.search(filters.searchQuery).map(r => r.item);
  }

  return result;
}
