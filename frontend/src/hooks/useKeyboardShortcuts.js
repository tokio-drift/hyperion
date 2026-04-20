import { useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import { useHistory } from './useHistory';

/**
 * useKeyboardShortcuts — wires all global keyboard shortcuts.
 * Mount once at the App level.
 */
export function useKeyboardShortcuts() {
  const { dispatch, state } = useEditor();
  const { undo, redo } = useHistory();

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Space → compare mode (hold)
      if (e.code === 'Space' && !isInput) {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_COMPARE', payload: true });
      }

      if (isInput) return; // skip rest for inputs

      // Ctrl+Z → undo
      if (e.ctrlKey && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y / Ctrl+Shift+Z → redo
      if ((e.ctrlKey && e.code === 'KeyY') || (e.ctrlKey && e.shiftKey && e.code === 'KeyZ')) {
        e.preventDefault();
        redo();
      }

      // Ctrl+O → open
      if (e.ctrlKey && e.code === 'KeyO') {
        e.preventDefault();
        window.__hyperionOpenFilePicker?.();
      }

      // Ctrl+E → export
      if (e.ctrlKey && e.code === 'KeyE') {
        e.preventDefault();
        dispatch({ type: 'OPEN_EXPORT_MODAL' });
      }

      // Ctrl+0 → fit to screen
      if (e.ctrlKey && e.code === 'Digit0') {
        e.preventDefault();
        window.__hyperionFitToScreen?.();
      }

      // C → crop mode
      if (e.code === 'KeyC' && state.activeImageId) {
        window.__hyperionStartCrop?.();
      }

      // Escape → cancel crop / close modal
      if (e.code === 'Escape') {
        if (state.ui.exportModalOpen) dispatch({ type: 'CLOSE_EXPORT_MODAL' });
        if (state.activeImageId) dispatch({ type: 'CANCEL_CROP', payload: { imageId: state.activeImageId } });
      }

      // Tab → toggle side panel
      if (e.code === 'Tab') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_SIDE_PANEL' });
      }
    }

    function onKeyUp(e) {
      if (e.code === 'Space') {
        dispatch({ type: 'TOGGLE_COMPARE', payload: false });
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [dispatch, undo, redo, state.activeImageId, state.ui.exportModalOpen]);
}
