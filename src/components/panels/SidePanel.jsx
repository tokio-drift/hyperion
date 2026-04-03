import React from 'react';
import { useEditor } from '../../context/EditorContext';
import TonalPanel from './TonalPanel';
import DimensionPanel from './DimensionPanel';
import HistoryPanel from './HistoryPanel';

const TABS = [
  { id: 'tonal',     label: 'Light' },
  { id: 'dimension', label: 'Crop' },
  { id: 'history',   label: 'History' },
];

export default function SidePanel() {
  const { state, dispatch } = useEditor();
  const { activePanelTab, sidePanelOpen } = state.ui;

  return (
    <aside
      className="flex-shrink-0 flex flex-col border-l border-gray-800 overflow-hidden transition-all duration-200"
      style={{
        width: sidePanelOpen ? 280 : 0,
        background: '#242424',
        minWidth: sidePanelOpen ? 280 : 0,
      }}
    >
      {sidePanelOpen && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-gray-800 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => dispatch({ type: 'SET_PANEL_TAB', payload: tab.id })}
                className={`
                  flex-1 py-2.5 text-xs font-medium transition-colors
                  ${activePanelTab === tab.id
                    ? 'text-white border-b-2 border-blue-500 bg-white/[0.03]'
                    : 'text-gray-500 hover:text-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activePanelTab === 'tonal'     && <TonalPanel />}
            {activePanelTab === 'dimension' && <DimensionPanel />}
            {activePanelTab === 'history'   && <HistoryPanel />}
          </div>
        </>
      )}
    </aside>
  );
}
