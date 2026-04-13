import React, { useEffect, useRef } from 'react';
import { useEditor } from './context/EditorContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Toolbar from './components/toolbar/Toolbar';
import EditorCanvas from './components/canvas/EditorCanvas';
import SidePanel from './components/panels/SidePanel';
import ExportModal from './components/export/ExportModal';
import ToastStack from './components/shared/ToastStack';

const SESSION_KEY = 'hyperion_session';

export default function App() {
  const { state, dispatch, showToast } = useEditor();

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useKeyboardShortcuts();

  // ── Auto-save to localStorage (debounced — don't stringify on every slider tick) ──
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!state.images.length) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const session = {
          adjustments: state.adjustments,
          history: state.history,
          historyIndex: state.historyIndex,
          activeImageId: state.activeImageId,
          imageMeta: state.images.map(img => ({ id: img.id, name: img.name, width: img.width, height: img.height })),
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch {
        // localStorage may be unavailable in some contexts
      }
    }, 1000); // Only save after 1s of inactivity
    return () => clearTimeout(saveTimerRef.current);
  }, [state.adjustments, state.history, state.historyIndex, state.activeImageId]);

  // ── Restore session on first load ─────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (session?.imageMeta?.length) {
        showToast(
          `Session restored (${session.imageMeta.length} image${session.imageMeta.length > 1 ? 's' : ''} — please re-upload to continue editing)`,
          'info',
          5000
        );
      }
    } catch {
      // Ignore corrupt session data
    }
  }, []); // eslint-disable-line

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
