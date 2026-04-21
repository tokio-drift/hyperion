import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';

const SECTIONS = [
  { id: 'tonal', label: 'Light' },
  { id: 'colour', label: 'Colour' },
  { id: 'mask', label: 'Mask' },
  { id: 'dimension', label: 'Crop' },
  { id: 'history', label: 'History' }
];

export default function HelpManual() {
  const { state, dispatch } = useEditor();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('tonal');

  useEffect(() => {
    if (state.ui.helpModalOpen) {
      fetch("/manual.json")
        .then(res => res.json())
        .then(json => setData(json))
        .catch(() => console.error("Failed to load manual"));
    }
  }, [state.ui.helpModalOpen]);

  if (!state.ui.helpModalOpen) return null;

  const currentContent = data?.[activeTab];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-2xl h-[500px] flex overflow-hidden shadow-2xl">
        {/* Help Sidebar */}
        <div className="w-48 border-r border-gray-800 bg-[#111] p-3 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase px-2 mb-2">Sections</span>
          {SECTIONS.map(s => (
            <button 
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${activeTab === s.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            >
              {s.label}
            </button>
          ))}
          <button 
            onClick={() => dispatch({ type: 'CLOSE_HELP_MODAL' })}
            className="mt-auto w-full py-2 text-xs bg-gray-800 rounded-lg text-gray-300 hover:text-white"
          >
            Close
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">
          {currentContent ? (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-xl font-bold mb-2 text-white">{currentContent.title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">{currentContent.description}</p>
              <div className="space-y-4">
                {currentContent.steps?.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-blue-500 font-mono text-sm">{i + 1}.</span>
                    <p className="text-gray-300 text-xs leading-normal">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 text-xs">Loading documentation...</div>
          )}
        </div>
      </div>
    </div>
  );
}