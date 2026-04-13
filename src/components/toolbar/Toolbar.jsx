import React, { useRef, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import Tooltip from '../shared/Tooltip';

const ip = {
  width: 15, height: 15, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
};

function TBtn({ children, onClick, onMouseDown, onMouseUp, onMouseLeave, disabled, tooltip, active, accent, className = '' }) {
  return (
    <Tooltip content={tooltip} side="bottom">
      <button
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        disabled={disabled}
        className={`
          flex items-center justify-center gap-1.5 px-2.5 h-8 rounded text-sm
          transition-colors duration-150 select-none flex-shrink-0
          ${disabled
            ? 'text-gray-700 cursor-not-allowed'
            : accent
              ? 'bg-blue-600 hover:bg-blue-500 text-white font-medium'
              : active
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
          } ${className}
        `}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-800 mx-0.5 flex-shrink-0" />;
}

export default function Toolbar() {
  const { state, dispatch, canUndo, canRedo, activeImage } = useEditor();
  const { compareMode } = state;
  const isComparePressedRef = useRef(false);

  // Handle document-level mouse events for compare button
  useEffect(() => {
    const handleDocumentMouseUp = () => {
      if (isComparePressedRef.current) {
        isComparePressedRef.current = false;
        dispatch({ type: 'TOGGLE_COMPARE', payload: false });
      }
    };

    document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => document.removeEventListener('mouseup', handleDocumentMouseUp);
  }, [dispatch]);

  return (
    <header
      className="flex items-center gap-1 px-3 flex-shrink-0 border-b border-gray-800"
      style={{ height: 48, background: '#1a1a1a' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3 flex-shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#3b82f6" strokeWidth="1.5"/>
          <path d="M8 12h8M12 8v8" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="font-semibold text-white tracking-tight text-sm hidden sm:inline">Hyperion</span>
      </div>

      <Divider />

      {/* Open */}
      <TBtn onClick={() => window.__hyperionOpenFilePicker?.()} tooltip="Open Image (Ctrl+O)">
        <svg {...ip}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <span className="text-xs">Open</span>
      </TBtn>

      <Divider />

      {/* Undo / Redo */}
      <TBtn
        onClick={() => activeImage && dispatch({ type: 'UNDO', payload: { imageId: activeImage.id } })}
        disabled={!canUndo} tooltip="Undo (Ctrl+Z)"
      >
        <svg {...ip}><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
      </TBtn>
      <TBtn
        onClick={() => activeImage && dispatch({ type: 'REDO', payload: { imageId: activeImage.id } })}
        disabled={!canRedo} tooltip="Redo (Ctrl+Y)"
      >
        <svg {...ip}><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 0 4-4h12"/></svg>
      </TBtn>

      <Divider />

      {/* Compare (hold) */}
      <TBtn
        onMouseDown={() => {
          isComparePressedRef.current = true;
          dispatch({ type: 'TOGGLE_COMPARE', payload: true });
        }}
        onMouseUp={() => {
          isComparePressedRef.current = false;
          dispatch({ type: 'TOGGLE_COMPARE', payload: false });
        }}
        onMouseLeave={() => {
          if (isComparePressedRef.current) {
            isComparePressedRef.current = false;
            dispatch({ type: 'TOGGLE_COMPARE', payload: false });
          }
        }}
        tooltip="Hold to compare with original (Space)"
        active={compareMode}
      >
        <svg {...ip}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
        <span className="text-xs">Compare</span>
      </TBtn>

      {/* Fit to screen */}
      <TBtn onClick={() => window.__hyperionFitToScreen?.()} tooltip="Fit to screen (Ctrl+0)">
        <svg {...ip}><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
      </TBtn>

      <div className="flex-1" />

      {/* Export */}
      <TBtn
        onClick={() => dispatch({ type: 'OPEN_EXPORT_MODAL' })}
        tooltip="Export (Ctrl+E)"
        accent
      >
        <svg {...ip}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span className="text-xs">Export</span>
      </TBtn>

      {/* Toggle panel */}
      <TBtn
        onClick={() => dispatch({ type: 'TOGGLE_SIDE_PANEL' })}
        tooltip="Toggle panel (Tab)"
        active={state.ui.sidePanelOpen}
      >
        <svg {...ip}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
      </TBtn>
    </header>
  );
}
