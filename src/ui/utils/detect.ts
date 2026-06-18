import chalk from 'chalk';

/** Returns true when the terminal likely supports Nerd Font glyphs. */
export function detectNerdFonts(): boolean {
  return (
    process.env['GHTASKTUI_NERD_FONTS'] === '1' ||
    process.env['TERM_PROGRAM'] === 'iTerm.app' ||
    /nerd/i.test(process.env['TERM_PROGRAM'] ?? '') ||
    /nerd/i.test(process.env['TERM'] ?? '')
  );
}

/** Returns true when the terminal supports 24-bit TrueColor. */
export function detectTrueColor(): boolean {
  return chalk.level >= 3;
}
