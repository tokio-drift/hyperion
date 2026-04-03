import React, { useEffect, useRef } from 'react';

/**
 * ConfirmDialog — modal for destructive actions.
 * Props:
 *   open       {boolean}
 *   title      {string}
 *   message    {string}
 *   confirmLabel {string}  default "Confirm"
 *   cancelLabel  {string}  default "Cancel"
 *   onConfirm  {() => void}
 *   onCancel   {() => void}
 *   danger     {boolean}   styles confirm button red
 */
export default function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  onConfirm, onCancel, danger = true,
}) {
  const confirmRef = useRef(null);

  // Auto-focus confirm button, trap Escape → cancel
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter')  onConfirm?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)' }}
      onClick={onCancel}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`
              px-4 py-2 text-sm rounded-lg font-medium transition-colors
              ${danger
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
              }
            `}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
