import { execa } from 'execa';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function defaultEditor(): string {
  if (process.env['EDITOR']) return process.env['EDITOR'];
  if (process.env['VISUAL']) return process.env['VISUAL'];
  return process.platform === 'win32' ? 'notepad' : 'vi';
}

/**
 * Opens $EDITOR (or $VISUAL, falling back to vi/notepad) on a temp file
 * seeded with `initialText`. Returns the edited content, or null if the
 * file was left unchanged (treated as a cancel).
 */
export async function editInExternalEditor(
  initialText: string,
  fileName = 'ghtasktui-edit.md',
): Promise<string | null> {
  const dir = await mkdtemp(join(tmpdir(), 'ghtasktui-'));
  const filePath = join(dir, fileName);
  try {
    await writeFile(filePath, initialText, 'utf8');

    const editor = defaultEditor();
    // Editors like `code` need --wait; users can set EDITOR="code --wait" to opt in.
    const [cmd, ...args] = editor.split(' ');
    if (!cmd) return null;
    await execa(cmd, [...args, filePath], { stdio: 'inherit' });

    const result = await readFile(filePath, 'utf8');
    const trimmed = result.replace(/\n+$/, '');
    return trimmed === initialText.replace(/\n+$/, '') ? null : trimmed;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
