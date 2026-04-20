import React, { useState, useRef, useCallback } from 'react';
import Tooltip from './Tooltip';

export default function Slider({
  label,
  value = 0,
  min = -100,
  max = 100,
  step = 1,
  onChange,
  tooltip,
  disabled = false,
  gradient,
  resetValue = 0,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputEditRef = useRef(null);
  const isNonZero = value !== resetValue;

  const startEdit = () => {
    if (disabled) return;
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputEditRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed)) {
      onChange?.(Math.max(min, Math.min(max, parsed)));
    }
    setEditing(false);
  };

  const handleEditKey = (e) => {
    if (e.key === 'Enter')  commitEdit();
    if (e.key === 'Escape') setEditing(false);
  };

  const handleSliderChange = useCallback((e) => {
    onChange?.(Number(e.target.value));
  }, [onChange]);

  const handleDoubleClick = useCallback(() => {
    if (!disabled) onChange?.(resetValue);
  }, [disabled, onChange, resetValue]);

  // Calculate fill percentages for Standard Sliders
  const pct = ((value - min) / (max - min)) * 100;
  const zeroPct = ((resetValue - min) / (max - min)) * 100;
  const left  = Math.min(pct, zeroPct);
  const right = Math.max(pct, zeroPct);

  const emptyColor = '#404040'; // Dark gray background line
  const fillColor = '#a3a3a3';  // Light gray filled line

  // Build the inline background fill
  let trackBackground;
  if (gradient) {
    trackBackground = gradient; // Uses the full gradient passed from ColourPanel
  } else if (isNonZero) {
    // Fill from the center/0 to the current thumb position
    trackBackground = `linear-gradient(to right, ${emptyColor} ${left}%, ${fillColor} ${left}%, ${fillColor} ${right}%, ${emptyColor} ${right}%)`;
  } else {
    trackBackground = emptyColor;
  }

  return (
    <div className={`flex flex-col gap-1 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between">
        <Tooltip content={tooltip} side="left">
          <span className="text-gray-400 text-xs select-none cursor-default">{label}</span>
        </Tooltip>

        {editing ? (
          <input
            ref={inputEditRef}
            type="number"
            value={draft}
            min={min}
            max={max}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKey}
            className={`
              w-12 text-right text-xs bg-gray-800 border rounded px-1 py-0.5 outline-none
              ${isNonZero ? 'border-blue-500 text-blue-400' : 'border-gray-600 text-gray-300'}
            `}
            style={{ fontFamily: 'DM Mono, monospace' }}
          />
        ) : (
          <Tooltip content="Click to type a value" side="right" delay={800}>
            <button
              onClick={startEdit}
              onDoubleClick={handleDoubleClick}
              className={`
                text-xs font-mono px-1 py-0.5 rounded transition-colors hover:bg-gray-800
                ${isNonZero ? 'text-blue-400' : 'text-gray-500'}
              `}
              title="Double-click to reset"
            >
              {value > 0 ? `+${value}` : value}
            </button>
          </Tooltip>
        )}
      </div>

      <div onDoubleClick={handleDoubleClick} className="relative flex items-center h-5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          disabled={disabled}
          style={{ background: trackBackground }}
          className="w-full"
        />
      </div>
    </div>
  );
}