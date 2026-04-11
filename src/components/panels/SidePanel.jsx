import React from 'react';
import { useEditor } from '../../context/EditorContext';
import TonalPanel from './TonalPanel';
import ColourPanel from './ColourPanel';
import MaskPanel from './MaskPanel';
import DimensionPanel from './DimensionPanel';
import HistoryPanel from './HistoryPanel';

const TABS = [
  { id: 'tonal',     label: 'Light' },
  { id: 'colour',    label: 'Colour' }, 
  { id: 'mask',      label: 'Mask' }, 
  { id: 'dimension', label: 'Crop' },
  { id: 'history',   label: 'History' },
];

export default function SidePanel() {
  const { state, dispatch } = useEditor();
  const { activePanelTab, sidePanelOpen } = state.ui;

  // --- NEW: Automatically clean up canvas modes when switching tabs ---
  const handleTabChange = (tabId) => {
    dispatch({ type: 'SET_PANEL_TAB', payload: tabId });
    
    // Auto-cancel crop if we navigate away from the Crop tab
    if (tabId !== 'dimension' && state.activeImageId) {
      dispatch({ type: 'CANCEL_CROP', payload: { imageId: state.activeImageId } });
    }
    
    // Auto-exit mask drawing mode if we navigate away from the Mask tab
    if (tabId !== 'mask') {
      dispatch({ type: 'SET_MASK_MODE', payload: false });
    }
  };

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
                onClick={() => handleTabChange(tab.id)}
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
            {activePanelTab === 'colour'    && <ColourPanel />}
            {activePanelTab === 'mask'      && <MaskPanel />}
            {activePanelTab === 'dimension' && <DimensionPanel />}
            {activePanelTab === 'history'   && <HistoryPanel />}
          </div>
        </>
      )}
    </aside>
  );
}