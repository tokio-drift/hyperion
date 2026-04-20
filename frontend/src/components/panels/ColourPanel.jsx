import React, { useCallback, useRef, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useHistory } from '../../hooks/useHistory';
import Slider from '../shared/Slider';
import ConfirmDialog from '../shared/ConfirmDialog';

function useDebouncedHistoryPush(push, delay = 600) {
  const timerRef = useRef(null);
  return useCallback((label) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => push(label), delay);
  }, [push, delay]);
}

const formatHistoryLabel = (key, value) => {
  const sign = value > 0 ? '+' : '';
  if (key === 'temperature') return `Temperature ${sign}${value} (${value > 0 ? 'Warm' : 'Cool'})`;
  if (key === 'tint') return `Tint ${sign}${value} (${value > 0 ? 'Magenta' : 'Green'})`;
  return `${key.charAt(0).toUpperCase() + key.slice(1)} ${sign}${value}`;
};

export default function ColourPanel() {
  const { dispatch, activeImage, activeAdjustments } = useEditor();
  const { push } = useHistory();
  const debouncedPush = useDebouncedHistoryPush(push);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleChange = useCallback((key, value) => {
    if (!activeImage) return;
    dispatch({
      type: 'UPDATE_ADJUSTMENT',
      payload: { imageId: activeImage.id, key, value },
    });
    debouncedPush(formatHistoryLabel(key, value));
  }, [dispatch, activeImage, debouncedPush]);

  const handleReset = useCallback(() => {
    if (!activeImage) return;
    dispatch({ type: 'RESET_COLOUR_ADJUSTMENTS', payload: { imageId: activeImage.id } });
    push('Reset colours');
    setConfirmReset(false);
  }, [dispatch, activeImage, push]);

  const hasAdjustments = activeImage && 
    (activeAdjustments.hue !== 0 || activeAdjustments.saturation !== 0 || 
     activeAdjustments.vibrance !== 0 || activeAdjustments.temperature !== 0 || 
     activeAdjustments.tint !== 0);

  if (!activeImage) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <p className="text-gray-600 text-sm">Open an image to adjust colour</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="panel-section flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Colour</span>
        {hasAdjustments && (
          <button
            onClick={() => setConfirmReset(true)}
            className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* White Balance Section */}
        <div>
          <span className="text-xs text-gray-500 mb-3 block font-medium">White Balance</span>
          <div className="flex flex-col gap-4">
            <Slider
              label="Temperature"
              value={activeAdjustments.temperature}
              min={-100} max={100}
              onChange={(v) => handleChange('temperature', v)}
              tooltip="Shifts colour balance warm (positive) or cool (negative)"
              gradient="linear-gradient(to right, #5b5ce6, #737373, #d9b838)"
            />
            <Slider
              label="Tint"
              value={activeAdjustments.tint}
              min={-100} max={100}
              onChange={(v) => handleChange('tint', v)}
              tooltip="Corrects green (negative) or magenta (positive) cast"
              gradient="linear-gradient(to right, #48b859, #737373, #b848b3)"
            />
          </div>
        </div>

        <div className="h-px bg-gray-800 w-full my-1" />

        {/* Colour Section */}
        <div>
          <span className="text-xs text-gray-500 mb-3 block font-medium">Colour</span>
          <div className="flex flex-col gap-4">
            <Slider
              label="Hue"
              value={activeAdjustments.hue}
              min={-180} max={180}
              onChange={(v) => handleChange('hue', v)}
              tooltip="Rotates all colours around the colour wheel"
              gradient="linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
            />
            <Slider
              label="Vibrance"
              value={activeAdjustments.vibrance}
              min={-100} max={100}
              onChange={(v) => handleChange('vibrance', v)}
              tooltip="Boosts muted colours more than vivid ones. Skin-tone safe."
              gradient="linear-gradient(to right, #525252, #a3a3a3, #eab308, #ef4444)"
            />
            <Slider
              label="Saturation"
              value={activeAdjustments.saturation}
              min={-100} max={100}
              onChange={(v) => handleChange('saturation', v)}
              tooltip="Controls overall colour intensity. -100 produces greyscale."
              gradient="linear-gradient(to right, #525252, #a3a3a3, #3b82f6, #ef4444)"
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset Colours"
        message="This will reset Hue, Saturation, Vibrance, Temperature, and Tint to 0. Light adjustments will be kept."
        confirmLabel="Reset"
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}