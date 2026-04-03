import React, { useCallback, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useHistory } from '../../hooks/useHistory';
import Slider from '../shared/Slider';

const CONTROLS = [
  {
    key: 'exposure',
    label: 'Exposure',
    tooltip: 'Overall brightness multiplier — raises or lowers all tones proportionally',
  },
  {
    key: 'brightness',
    label: 'Brightness',
    tooltip: 'Adds a flat offset to all pixels — simpler than exposure',
  },
  {
    key: 'contrast',
    label: 'Contrast',
    tooltip: 'Pushes lights lighter and darks darker around the midpoint',
  },
  {
    key: 'highlights',
    label: 'Highlights',
    tooltip: 'Recovers bright areas (luma > 192) — drag left to pull back blown highlights',
  },
  {
    key: 'shadows',
    label: 'Shadows',
    tooltip: 'Lifts or crushes dark areas (luma < 64) — drag right to open up shadows',
  },
  {
    key: 'whites',
    label: 'Whites',
    tooltip: 'Clips the very brightest pixels (luma > 220) — fine-tune white point',
  },
  {
    key: 'blacks',
    label: 'Blacks',
    tooltip: 'Crushes or lifts near-black pixels (luma < 30) — set the black point',
  },
];

// Debounce helper for history push (don't spam entries while dragging)
function useDebouncedHistoryPush(push, delay = 600) {
  const timerRef = useRef(null);
  return useCallback((label) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => push(label), delay);
  }, [push, delay]);
}

export default function TonalPanel() {
  const { dispatch, activeImage, activeAdjustments } = useEditor();
  const { push } = useHistory();
  const debouncedPush = useDebouncedHistoryPush(push);

  const handleChange = useCallback((key, value) => {
    if (!activeImage) return;
    dispatch({
      type: 'UPDATE_ADJUSTMENT',
      payload: { imageId: activeImage.id, key, value },
    });

    // Push a history entry after a short pause (don't create one per px of drag)
    const ctrl = CONTROLS.find(c => c.key === key);
    const label = `${ctrl?.label || key} ${value > 0 ? '+' : ''}${value}`;
    debouncedPush(label);
  }, [dispatch, activeImage, debouncedPush]);

  const handleReset = useCallback(() => {
    if (!activeImage) return;
    dispatch({ type: 'RESET_ADJUSTMENTS', payload: { imageId: activeImage.id } });
    push('Reset all');
  }, [dispatch, activeImage, push]);

  const hasAdjustments = activeImage &&
    CONTROLS.some(c => activeAdjustments[c.key] !== 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Section header */}
      <div className="panel-section flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Light</span>
        {hasAdjustments && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
          >
            Reset all
          </button>
        )}
      </div>

      {!activeImage ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-gray-600 text-sm">Open an image to begin adjusting</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 p-4">
          {CONTROLS.map(ctrl => (
            <Slider
              key={ctrl.key}
              label={ctrl.label}
              value={activeAdjustments[ctrl.key] ?? 0}
              min={-100}
              max={100}
              onChange={(v) => handleChange(ctrl.key, v)}
              tooltip={ctrl.tooltip}
            />
          ))}
        </div>
      )}
    </div>
  );
}
