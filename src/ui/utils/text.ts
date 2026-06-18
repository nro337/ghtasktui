/** Truncate string to maxLen, appending … if cut. */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/** Left-pad a string to a fixed width. */
export function padStart(str: string, len: number): string {
  if (str.length >= len) return str;
  return ' '.repeat(len - str.length) + str;
}

/** Right-pad a string to a fixed width. */
export function padEnd(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + ' '.repeat(len - str.length);
}

/** Strip leading # from a hex color and normalise to 6-char hex. */
export function normalizeColor(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const stripped = raw.startsWith('#') ? raw.slice(1) : raw;
  // 3-char shorthand → expand
  if (stripped.length === 3) {
    return `#${stripped[0]}${stripped[0]}${stripped[1]}${stripped[1]}${stripped[2]}${stripped[2]}`;
  }
  return `#${stripped}`;
}
