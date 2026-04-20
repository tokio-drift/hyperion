import React, { useRef, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useHistory } from '../../hooks/useHistory';
import ConfirmDialog from '../shared/ConfirmDialog';
import { useState } from 'react';

function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 5000)  return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

// Icon by action label keyword
function ActionIcon({ label }) {
  const l = label.toLowerCase();
  let icon = '✦';
  if (l.includes('exposure'))   icon = '☀️';
  if (l.includes('brightness')) icon = '💡';
  if (l.includes('contrast'))   icon = '◑';
  if (l.includes('highlight'))  icon = '▲';
  if (l.includes('shadow'))     icon = '▼';
  if (l.includes('white'))      icon = '□';
  if (l.includes('black'))      icon = '■';
  if (l.includes('crop'))       icon = '⬚';
  if (l.includes('rotate'))     icon = '↻';
  if (l.includes('resize'))     icon = '⤡';
  if (l.includes('reset'))      icon = '↺';
  if (l.includes('mask'))       icon = '🎭';
  if (l.includes('vignette'))   icon = '⊚';
  if (l.includes('amount'))     icon = '⊚';
  return <span className="text-xs w-4 text-center flex-shrink-0 opacity-70">{icon}</span>;
}

export default function HistoryPanel() {
  const { activeImage } = useEditor();
  const { entries, currentIndex, jump, clear } = useHistory();
  const [confirmClear, setConfirmClear] = useState(false);
  const listRef = useRef(null);

  // Scroll current entry into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentIndex]);

  if (!activeImage) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <p className="text-gray-600 text-sm">No image loaded</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-gray-500 text-sm">No history yet</p>
          <p className="text-gray-700 text-xs mt-1">Adjustments will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-section flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          History
        </span>
        <span className="text-xs text-gray-600">{entries.length} steps</span>
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto py-1">
        {[...entries].reverse().map((entry, reversedIdx) => {
          const realIdx = entries.length - 1 - reversedIdx;
          const isActive = realIdx === currentIndex;
          const isFuture = realIdx > currentIndex;

          return (
            <button
              key={`${entry.timestamp}-${realIdx}`}
              data-active={isActive}
              onClick={() => jump(realIdx)}
              className={`
                w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors text-xs
                ${isActive
                  ? 'bg-blue-600/20 text-white'
                  : isFuture
                    ? 'text-gray-600 hover:bg-gray-800/50'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }
              `}
            >
              <ActionIcon label={entry.label} />
              <span className="flex-1 truncate">{entry.label}</span>
              {isActive && (
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
              <span className={`flex-shrink-0 font-mono ${isActive ? 'text-blue-400' : 'text-gray-700'}`}>
                {relativeTime(entry.timestamp)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clear */}
      <div className="panel-section">
        <button
          onClick={() => setConfirmClear(true)}
          className="w-full py-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors rounded border border-gray-800 hover:border-red-900"
        >
          Clear History
        </button>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear History"
        message="This will permanently delete all history entries for this image. This action cannot be undone."
        confirmLabel="Clear History"
        onConfirm={() => { clear(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
