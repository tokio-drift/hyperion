import { useCallback } from 'react';
import { useEditor } from '../context/EditorContext';

/**
 * useHistory — convenience hook wrapping UNDO/REDO/PUSH_HISTORY actions.
 */
export function useHistory() {
  const { dispatch, activeImage, canUndo, canRedo, activeHistory, activeHistoryIndex } = useEditor();

  const push = useCallback((label) => {
    if (!activeImage) return;
    dispatch({ type: 'PUSH_HISTORY', payload: { imageId: activeImage.id, label } });
  }, [dispatch, activeImage]);

  const undo = useCallback(() => {
    if (!activeImage || !canUndo) return;
    dispatch({ type: 'UNDO', payload: { imageId: activeImage.id } });
  }, [dispatch, activeImage, canUndo]);

  const redo = useCallback(() => {
    if (!activeImage || !canRedo) return;
    dispatch({ type: 'REDO', payload: { imageId: activeImage.id } });
  }, [dispatch, activeImage, canRedo]);

  const jump = useCallback((index) => {
    if (!activeImage) return;
    dispatch({ type: 'JUMP_HISTORY', payload: { imageId: activeImage.id, index } });
  }, [dispatch, activeImage]);

  const clear = useCallback(() => {
    if (!activeImage) return;
    dispatch({ type: 'CLEAR_HISTORY', payload: { imageId: activeImage.id } });
  }, [dispatch, activeImage]);

  return { push, undo, redo, jump, clear, canUndo, canRedo, entries: activeHistory, currentIndex: activeHistoryIndex };
}
