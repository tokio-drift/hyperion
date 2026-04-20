import React, { useEffect, useState } from 'react';
import { useEditor } from '../../context/EditorContext';

const ICONS = {
  info:    '💡',
  success: '✓',
  error:   '✕',
};

const COLORS = {
  info:    'border-gray-600 bg-gray-900',
  success: 'border-green-600 bg-green-950',
  error:   'border-red-600 bg-red-950',
};

const TEXT = {
  info:    'text-gray-200',
  success: 'text-green-300',
  error:   'text-red-300',
};

function Toast({ id, message, type }) {
  const { dispatch } = useEditor();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`
        flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm
        shadow-xl backdrop-blur-sm transition-all duration-200
        ${COLORS[type]} ${TEXT[type]}
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
    >
      <span className="text-base leading-none">{ICONS[type]}</span>
      <span className="flex-1 min-w-0">{message}</span>
      <button
        onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: id })}
        className="ml-1 text-current opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
      >
        ×
      </button>
    </div>
  );
}

export default function ToastStack() {
  const { state } = useEditor();
  const { toasts } = state;

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} />
        </div>
      ))}
    </div>
  );
}
