import React, { useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../theme/theme.js';
import { relativeTime } from '../utils/time.js';
import { useComments } from '../hooks/useGH.js';
import { useExternalEditor } from '../hooks/useExternalEditor.js';
import Spinner from './Spinner.js';
import type { Item } from '../../gh/types.js';

interface Props {
  item: Item;
  onClose: () => void;
}

export default function CommentsOverlay({ item, onClose }: Props) {
  const { comments, commentsLoaded, commentsLoading, loadComments, addComment } = useComments(item);
  const { openEditor } = useExternalEditor();
  const composingRef = useRef(false);

  const loadRef = useRef(loadComments);
  loadRef.current = loadComments;
  useEffect(() => { void loadRef.current(); }, []);

  const compose = async () => {
    if (composingRef.current) return;
    composingRef.current = true;
    try {
      const body = await openEditor('', 'ghtasktui-comment.md');
      if (body && body.trim()) await addComment(body.trim());
    } finally {
      composingRef.current = false;
    }
  };

  useInput((input, key) => {
    if (composingRef.current) return;
    if (key.escape) { onClose(); return; }
    switch (input.toLowerCase()) {
      case 'n': void compose(); break;
      case 'r': void loadComments(); break;
    }
  });

  return (
    <Box flexDirection="column" height={process.stdout.rows} paddingX={2} paddingY={1}>
      <Box marginBottom={1} gap={1}>
        <Text color={colors.accentPurple} bold>Comments</Text>
        <Text color={colors.textMuted}>— {item.title}</Text>
      </Box>

      {!commentsLoaded && commentsLoading && (
        <Spinner label="Loading comments…" />
      )}

      {commentsLoaded && comments.length === 0 && (
        <Text color={colors.textMuted}>No comments yet.</Text>
      )}

      {commentsLoaded && comments.length > 0 && (
        <Box flexDirection="column" gap={1}>
          {comments.map(c => (
            <Box key={c.id} flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={1}>
              <Box gap={1}>
                <Text color={colors.accentPurpleLight} bold>@{c.author}</Text>
                <Text color={colors.textMuted}>{relativeTime(c.createdAt)}</Text>
              </Box>
              <Text color={colors.textSecondary} wrap="wrap">{c.body}</Text>
            </Box>
          ))}
        </Box>
      )}

      <Box flexGrow={1} />

      <Box marginTop={1} gap={2}>
        <Text color={colors.textMuted}>
          <Text color={colors.textSecondary}>N</Text> new comment
        </Text>
        <Text color={colors.textMuted}>
          <Text color={colors.textSecondary}>R</Text> refresh
        </Text>
        <Text color={colors.textMuted}>
          <Text color={colors.textSecondary}>Esc</Text> close
        </Text>
      </Box>
    </Box>
  );
}
