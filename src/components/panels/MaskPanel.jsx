import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useHistory } from '../../hooks/useHistory';
import Slider from '../shared/Slider';
import ConfirmDialog from '../shared/ConfirmDialog';

const LOCAL_CONTROLS = [
  { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
  { key: 'whites', label: 'Whites', min: -100, max: 100 },
  { key: 'blacks', label: 'Blacks', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
  { key: 'tint', label: 'Tint', min: -100, max: 100 },
  { key: 'hue', label: 'Hue', min: -180, max: 180 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
];

export default function MaskPanel() {
  const { state, dispatch, activeImage } = useEditor();
  const { push } = useHistory();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!activeImage) {
    return <div className="p-6 text-center text-sm text-gray-600">Open an image to use masks</div>;
  }

  const { masks, activeMaskId } = activeImage;
  const activeMask = masks.find(m => m.id === activeMaskId);
  const { maskMode, brushSettings, showMaskOverlay } = state;

  const handleAddMask = () => dispatch({ type: 'ADD_MASK', payload: { imageId: activeImage.id } });
  
  const handleBrushChange = (key, value) => dispatch({ type: 'UPDATE_BRUSH', payload: { [key]: value } });

  const handleAdjChange = (key, value) => {
    dispatch({ type: 'UPDATE_MASK_ADJUSTMENT', payload: { imageId: activeImage.id, maskId: activeMaskId, key, value } });
    push(`Mask: ${key} ${value}`); // Debounce in prod, simplified here
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* SECTION A: MASK LIST */}
      <div className="panel-section">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-gray-300 uppercase">Masks</span>
          <div className="flex gap-2">
            <button onClick={() => dispatch({ type: 'TOGGLE_MASK_OVERLAY' })} className={`text-xs ${showMaskOverlay ? 'text-blue-400' : 'text-gray-500'}`}>
              [Overlay {showMaskOverlay ? 'On' : 'Off'}]
            </button>
            <button onClick={handleAddMask} className="text-xs text-blue-400 hover:text-blue-300">+ New</button>
          </div>
        </div>

        <div className="space-y-1 mb-4">
          {masks.length === 0 && <p className="text-xs text-gray-500">No masks created.</p>}
          {masks.map(m => (
            <div key={m.id} className={`flex items-center justify-between p-2 rounded cursor-pointer ${activeMaskId === m.id ? 'bg-blue-900/30' : 'hover:bg-gray-800'}`}
                 onClick={() => dispatch({ type: 'SET_ACTIVE_MASK', payload: { imageId: activeImage.id, maskId: m.id } })}>
              <div className="flex items-center gap-2">
                <span className={activeMaskId === m.id ? 'text-blue-500' : 'text-gray-600'}>{activeMaskId === m.id ? '●' : '○'}</span>
                <span className="text-sm">{m.label} {m.inverted && '(Inv)'}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'INVERT_MASK', payload: { imageId: activeImage.id, maskId: m.id } }); }} className="text-xs text-gray-400 hover:text-white">Inv</button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(m.id); }} className="text-xs text-gray-400 hover:text-red-400">Del</button>
              </div>
            </div>
          ))}
        </div>

        {/* BRUSH SETTINGS */}
        <span className="text-xs font-semibold text-gray-300 uppercase block mb-3">Brush</span>
        <div className="space-y-3 mb-4">
          <Slider label="Size" value={brushSettings.size} min={2} max={300} onChange={v => handleBrushChange('size', v)} />
          <Slider label="Feather" value={brushSettings.feather} min={0} max={150} onChange={v => handleBrushChange('feather', v)} />
          <Slider label="Opacity" value={brushSettings.opacity} min={1} max={100} onChange={v => handleBrushChange('opacity', v)} />
          <div className="flex gap-2 pt-1">
            <button onClick={() => handleBrushChange('tool', 'paint')} className={`flex-1 py-1.5 text-xs rounded border ${brushSettings.tool === 'paint' ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-gray-700 text-gray-400'}`}>Paint</button>
            <button onClick={() => handleBrushChange('tool', 'erase')} className={`flex-1 py-1.5 text-xs rounded border ${brushSettings.tool === 'erase' ? 'border-red-500 bg-red-500/20 text-red-300' : 'border-gray-700 text-gray-400'}`}>Erase</button>
          </div>
        </div>

        <button 
          onClick={() => dispatch({ type: 'SET_MASK_MODE', payload: !maskMode })}
          disabled={!activeMaskId}
          className={`w-full py-2 text-xs rounded font-medium transition-colors ${maskMode ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'} disabled:opacity-50`}
        >
          {maskMode ? 'Exit Mask Mode' : 'Enter Mask Mode (B)'}
        </button>
      </div>

      {/* SECTION B: LOCAL ADJUSTMENTS */}
      {activeMask && (
        <div className="panel-section">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-gray-300 uppercase">Local Adjustments</span>
            <button onClick={() => setConfirmReset(true)} className="text-xs text-gray-500 hover:text-blue-400">Reset</button>
          </div>
          <div className="space-y-4">
            {LOCAL_CONTROLS.map(ctrl => (
              <Slider key={ctrl.key} label={ctrl.label} value={activeMask.adjustments[ctrl.key]} min={ctrl.min} max={ctrl.max} onChange={v => handleAdjChange(ctrl.key, v)} />
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmDelete} title="Delete Mask" message="Remove this mask entirely?" onConfirm={() => { dispatch({ type: 'DELETE_MASK', payload: { imageId: activeImage.id, maskId: confirmDelete } }); setConfirmDelete(null); }} onCancel={() => setConfirmDelete(null)} />
      <ConfirmDialog open={confirmReset} title="Reset Local Adjustments" message="Reset all sliders for this mask?" onConfirm={() => { dispatch({ type: 'RESET_MASK_ADJUSTMENTS', payload: { imageId: activeImage.id, maskId: activeMaskId } }); setConfirmReset(false); }} onCancel={() => setConfirmReset(false)} />
    </div>
  );
}