import React, { useState, useRef, useCallback } from 'react';
import Tooltip from './Tooltip';

/**
 * Slider — labeled range input with:
 *   - Label on left, numeric value on right (accent colored when non-zero)
 *   - Double-click resets to 0
 *   - Click on value → inline numeric input
 *   - Tooltip on hover with description
 *
 * Props:
 *   label       {string}
 *   value       {number}
 *   min         {number}  default -100
 *   max         {number}  default 100
 *   step        {number}  default 1
 *   onChange    {(v: number) => void}
 *   tooltip     {string}  hover description
 *   disabled    {boolean}
 */
export default function Slider({
  label,
  value = 0,
  min = -100,
  max = 100,
  step = 1,
  onChange,
  tooltip,
  disabled = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputEditRef = useRef(null);
  const isNonZero = value !== 0;

  // ── Numeric inline edit ────────────────────────────────────────────────
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

  // ── Slider change ──────────────────────────────────────────────────────
  const handleSliderChange = useCallback((e) => {
    onChange?.(Number(e.target.value));
  }, [onChange]);

  // ── Double-click reset ─────────────────────────────────────────────────
  const handleDoubleClick = useCallback(() => {
    if (!disabled) onChange?.(0);
  }, [disabled, onChange]);

  // Filled-track gradient (shows how far from center or 0)
  const pct = ((value - min) / (max - min)) * 100;
  const zeroPct = ((-min) / (max - min)) * 100;
  const left  = Math.min(pct, zeroPct);
  const right = 100 - Math.max(pct, zeroPct);
  const trackFill = isNonZero
    ? `linear-gradient(to right, #3a3a3a ${left}%, #3b82f6 ${left}%, #3b82f6 ${100 - right}%, #3a3a3a ${100 - right}%)`
    : 'linear-gradient(to right, #3a3a3a 0%, #3a3a3a 100%)';

  return (
    <div className={`flex flex-col gap-1 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Label row */}
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

      {/* Track */}
      <div onDoubleClick={handleDoubleClick} className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          disabled={disabled}
          style={{ '--track-fill': trackFill }}
          className="slider-filled w-full"
        />
      </div>
    </div>
  );
}
