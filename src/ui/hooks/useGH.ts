import { useCallback, useRef } from 'react';
import * as client from '../../gh/client.js';
import type { Item, Field, FieldValue } from '../../gh/types.js';
import { useAppContext, useProjectCache } from './useAppState.js';

const PAGE_SIZE = 25;

export function useProjectsLoader() {
  const { state, dispatch } = useAppContext();
  const inflightRef = useRef(false);

  const load = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (inflightRef.current) return;
      if (!opts.force && state.projectsLoaded) return;

      inflightRef.current = true;
      dispatch({ type: 'SET_LOADING', loading: true });
      try {
        const projects = await client.listProjects(state.owner);
        dispatch({ type: 'SET_PROJECTS', projects });
      } catch (err) {
        dispatch({ type: 'SHOW_TOAST', message: String(err), kind: 'error' });
      } finally {
        inflightRef.current = false;
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    },
    [state.owner, state.projectsLoaded, dispatch],
  );

  return {
    projects: state.projects,
    projectsLoaded: state.projectsLoaded,
    loadProjects: load,
    refreshProjects: () => load({ force: true }),
  };
}

export function useItemsLoader(projectNumber: number) {
  const { state, dispatch } = useAppContext();
  const cache = useProjectCache(projectNumber);
  const inflightRef = useRef(false);

  const load = useCallback(
    async (opts: { append?: boolean; force?: boolean } = {}) => {
      if (inflightRef.current) return;
      if (!opts.force && !opts.append && cache?.itemsLoaded) return;

      inflightRef.current = true;
      dispatch({ type: 'SET_LOADING', loading: true });
      try {
        const after = opts.append ? (cache?.endCursor ?? undefined) : undefined;
        const result = await client.listItems(
          state.owner,
          projectNumber,
          PAGE_SIZE,
          after,
        );
        dispatch({
          type: 'CACHE_ITEMS',
          projectNumber,
          items: result.items,
          hasNextPage: result.hasNextPage,
          endCursor: result.endCursor,
          append: opts.append ?? false,
        });
      } catch (err) {
        dispatch({
          type: 'SHOW_TOAST',
          message: String(err),
          kind: 'error',
        });
      } finally {
        inflightRef.current = false;
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    },
    [state.owner, projectNumber, cache, dispatch],
  );

  return {
    items: cache?.items ?? [],
    itemsLoaded: cache?.itemsLoaded ?? false,
    hasNextPage: cache?.hasNextPage ?? false,
    loadItems: load,
    loadMore: () => load({ append: true }),
    refresh: () => load({ force: true }),
  };
}

export function useFieldsLoader(projectNumber: number) {
  const { state, dispatch } = useAppContext();
  const cache = useProjectCache(projectNumber);
  const inflightRef = useRef(false);

  const load = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (inflightRef.current) return;
      if (!opts.force && cache?.fieldsLoaded) return;

      inflightRef.current = true;
      try {
        const fields = await client.listFields(state.owner, projectNumber);
        dispatch({ type: 'CACHE_FIELDS', projectNumber, fields });
      } catch (err) {
        dispatch({
          type: 'SHOW_TOAST',
          message: String(err),
          kind: 'error',
        });
      } finally {
        inflightRef.current = false;
      }
    },
    [state.owner, projectNumber, cache, dispatch],
  );

  return {
    fields: cache?.fields ?? [] as Field[],
    fieldsLoaded: cache?.fieldsLoaded ?? false,
    loadFields: load,
    refreshFields: () => load({ force: true }),
  };
}

export function useItemMutations(projectNumber: number) {
  const { state, dispatch } = useAppContext();

  const createItem = useCallback(
    async (title: string): Promise<Item | null> => {
      if (!state.activeProject) return null;
      dispatch({ type: 'SET_LOADING', loading: true });
      try {
        const item = await client.createItem(state.owner, state.activeProject.number, title);
        dispatch({ type: 'UPSERT_ITEM', projectNumber, item });
        dispatch({ type: 'SHOW_TOAST', message: `Created: ${title}`, kind: 'success' });
        return item;
      } catch (err) {
        dispatch({ type: 'SHOW_TOAST', message: String(err), kind: 'error' });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    },
    [state.activeProject, projectNumber, dispatch],
  );

  const deleteItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      dispatch({ type: 'SET_LOADING', loading: true });
      try {
        await client.deleteItem(itemId);
        dispatch({ type: 'REMOVE_ITEM', projectNumber, itemId });
        dispatch({ type: 'SHOW_TOAST', message: 'Item deleted', kind: 'info' });
        return true;
      } catch (err) {
        dispatch({ type: 'SHOW_TOAST', message: String(err), kind: 'error' });
        return false;
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    },
    [projectNumber, dispatch],
  );

  const editField = useCallback(
    async (
      item: Item,
      fieldId: string,
      value: FieldValue,
    ): Promise<boolean> => {
      if (!state.activeProject) return false;
      try {
        await client.editItemField(item.id, state.activeProject.id, fieldId, value);
        // Optimistically update the cached item
        const updated: Item = {
          ...item,
          fieldValues: { ...item.fieldValues, [fieldId]: value },
        };
        dispatch({ type: 'UPSERT_ITEM', projectNumber, item: updated });
        return true;
      } catch (err) {
        dispatch({ type: 'SHOW_TOAST', message: String(err), kind: 'error' });
        return false;
      }
    },
    [state.activeProject, projectNumber, dispatch],
  );

  const editTitle = useCallback(
    async (item: Item, title: string): Promise<boolean> => {
      if (!state.activeProject) return false;
      try {
        await client.editItemTitle(item.id, state.activeProject.id, title);
        const updated: Item = { ...item, title };
        dispatch({ type: 'UPSERT_ITEM', projectNumber, item: updated });
        return true;
      } catch (err) {
        dispatch({ type: 'SHOW_TOAST', message: String(err), kind: 'error' });
        return false;
      }
    },
    [state.activeProject, projectNumber, dispatch],
  );

  return { createItem, deleteItem, editField, editTitle };
}
