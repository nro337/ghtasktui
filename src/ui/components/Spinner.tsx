import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { SPINNER_FRAMES } from '../theme/icons.js';
import { colors } from '../theme/theme.js';

interface Props {
  label?: string;
}

export default function Spinner({ label }: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame(f => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(id);
  }, []);

  const char = SPINNER_FRAMES[frame] ?? SPINNER_FRAMES[0];

  return (
    <Text color={colors.accentPurple}>
      {char}{label ? ` ${label}` : ''}
    </Text>
  );
}
