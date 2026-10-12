import React from 'react';
import { Box, Text } from 'ink';
import { focus } from '../theme/theme.js';

interface Props {
  text?: string;
  /** Fixed cell width. Omit to fill the remaining width of the parent row. */
  width?: number;
  /** Text colour for this cell (e.g. a status colour). Defaults to the contrast colour. */
  color?: string | undefined;
  /** Used instead of `text` to mix colours in one cell via nested <Text color>. */
  children?: React.ReactNode;
}

/**
 * One cell of a focus-highlighted row. Ink's Box cannot paint a background, so
 * the cell renders over-padded text and clips it to the cell's bounds — that
 * way the solid colour covers the whole cell regardless of the text's length.
 * Place cells side by side (no `gap`) inside a row Box for a continuous bar.
 */
export default function FocusFill({ text = '', width, color, children }: Props) {
  const overflowWidth = process.stdout.columns || 200;
  return (
    <Box
      height={1}
      overflow="hidden"
      {...(width === undefined ? { flexGrow: 1, flexBasis: 0 } : { width, flexShrink: 0 })}
    >
      <Box width={overflowWidth} flexShrink={0}>
        <Text color={color ?? focus.fg} backgroundColor={focus.bg} bold wrap="truncate">
          {children ?? text}
          {' '.repeat(overflowWidth)}
        </Text>
      </Box>
    </Box>
  );
}

/** A full-width focus-highlighted line; nest <Text color> to colour parts of it. */
export function FocusLine({ children }: { children: React.ReactNode }) {
  return (
    <Box>
      <FocusFill>{children}</FocusFill>
    </Box>
  );
}
