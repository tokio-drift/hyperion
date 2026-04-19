import React, { useEffect, useRef } from 'react';
import { useEditor } from './context/EditorContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Toolbar from './components/toolbar/Toolbar';
import EditorCanvas from './components/canvas/EditorCanvas';
import SidePanel from './components/panels/SidePanel';
import ExportModal from './components/export/ExportModal';
import ToastStack from './components/shared/ToastStack';
import { saveSession, loadSession, clearSession } from './utils/sessionStorage';

const LEGACY_SESSION_KEY = 'hyperion_session';

export default function App() {
  const { state, dispatch, showToast } = useEditor();

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useKeyboardShortcuts();

  // ── Auto-save to IndexedDB (debounced to avoid heavy writes during drags) ──
  const saveTimerRef = useRef(null);
  const hydrationDoneRef = useRef(false);

  useEffect(() => {
    if (!hydrationDoneRef.current) return;

    clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      (async () => {
        try {
          if (!state.images.length) {
            await clearSession();
            return;
          }

          await saveSession(state);

          // Clean up old metadata-only localStorage session once IndexedDB persistence is active.
          try {
            localStorage.removeItem(LEGACY_SESSION_KEY);
          } catch {
            // Ignore storage access errors.
          }
        } catch (err) {
          console.warn('Failed to persist session to IndexedDB:', err);
        }
      })();
    }, 900);

    return () => clearTimeout(saveTimerRef.current);
  }, [
    state.images,
    state.activeImageId,
    state.adjustments,
    state.crop,
    state.brushSettings,
    state.showMaskOverlay,
    state.ui.sidePanelOpen,
    state.ui.activePanelTab,
  ]);

  // ── Restore full session on first load ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const restored = await loadSession();
        if (cancelled) return;

        if (restored?.images?.length) {
          dispatch({ type: 'LOAD_IMAGES', payload: restored.images });
          dispatch({
            type: 'RESTORE_SESSION',
            payload: {
              adjustments: restored.adjustments,
              crop: restored.crop,
              activeImageId: restored.activeImageId,
              brushSettings: restored.brushSettings,
              showMaskOverlay: restored.showMaskOverlay,
              ui: restored.ui,
            },
          });

          showToast(
            `Session restored (${restored.images.length} image${restored.images.length > 1 ? 's' : ''})`,
            'success',
            3800
          );
        }
      } catch (err) {
        console.warn('Failed to restore session from IndexedDB:', err);
      } finally {
        hydrationDoneRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, showToast]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#111' }}>
      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        <EditorCanvas />
        <SidePanel />
      </div>

      {state.images.length > 1 && <Filmstrip />}

      <ExportModal />
      <ToastStack />
    </div>
  );
}

// ── Filmstrip ─────────────────────────────────────────────────────────────────
function Filmstrip() {
  const { state, dispatch } = useEditor();

  return (
    <div
      className="flex-shrink-0 flex items-center gap-2 px-3 border-t border-gray-800 overflow-x-auto"
      style={{ height: 72, background: '#1a1a1a' }}
    >
      {state.images.map(img => (
        <FilmThumb
          key={img.id}
          image={img}
          isActive={img.id === state.activeImageId}
          onClick={() => dispatch({ type: 'SET_ACTIVE_IMAGE', payload: img.id })}
        />
      ))}
    </div>
  );
}

function FilmThumb({ image, isActive, onClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image.originalData) return;
    const src = image.originalData;
    const scale = Math.min(52 / src.width, 48 / src.height);
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));
    canvas.width = w;
    canvas.height = h;
    const temp = document.createElement('canvas');
    temp.width = src.width;
    temp.height = src.height;
    temp.getContext('2d').putImageData(src, 0, 0);
    canvas.getContext('2d').drawImage(temp, 0, 0, w, h);
  }, [image.originalData]);

  return (
    <button
      onClick={onClick}
      title={image.name}
      className={`
        flex-shrink-0 flex items-center justify-center rounded overflow-hidden transition-all duration-150
        ${isActive
          ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-black'
          : 'ring-1 ring-gray-700 hover:ring-gray-500'
        }
      `}
      style={{ width: 56, height: 56, background: '#2a2a2a' }}
    >
      <canvas
        ref={canvasRef}
        style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
      />
    </button>
  );
}
