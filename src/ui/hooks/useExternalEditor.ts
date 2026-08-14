import { useCallback } from 'react';
import { useStdin } from 'ink';
import { editInExternalEditor } from '../utils/editor.js';

type Listener = (...args: unknown[]) => void;

/**
 * Suspends Ink's raw-mode stdin capture, hands the terminal to the user's
 * $EDITOR for multi-line editing, then restores raw mode on return.
 *
 * Ink's own `setRawMode` (from useStdin) is reference-counted across every
 * mounted `useInput` hook in the tree, so calling it once here is a no-op
 * while any other hook elsewhere is still active — the terminal never
 * actually leaves raw mode, and Ink keeps reading stdin in parallel with
 * the spawned editor, splitting keystrokes between the two processes at
 * random. We bypass Ink's bookkeeping entirely and touch the stream
 * directly: detach its 'readable' listener, drop out of raw mode, and
 * pause the stream, then restore all three exactly on return.
 */
export function useExternalEditor() {
  const { stdin, isRawModeSupported } = useStdin();

  const openEditor = useCallback(
    async (initialText: string, fileName?: string): Promise<string | null> => {
      const readableListeners = stdin.listeners('readable') as Listener[];
      for (const listener of readableListeners) {
        stdin.removeListener('readable', listener);
      }
      if (isRawModeSupported) stdin.setRawMode(false);
      stdin.pause();

      try {
        return await editInExternalEditor(initialText, fileName);
      } finally {
        stdin.resume();
        // Discard any stray bytes buffered while the editor owned the terminal
        // (e.g. a trailing keystroke) so Ink doesn't replay them as app input.
        while (stdin.read() !== null) { /* drain */ }
        if (isRawModeSupported) stdin.setRawMode(true);
        for (const listener of readableListeners) {
          stdin.on('readable', listener);
        }
      }
    },
    [stdin, isRawModeSupported],
  );

  return { openEditor };
}
