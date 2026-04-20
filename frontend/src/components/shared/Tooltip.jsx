import React, { useState, useRef } from 'react';

export default function Tooltip({ children, content, side = 'top', delay = 400 }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  const positions = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && content && (
        <div className={`
          absolute z-50 px-2.5 py-1.5 text-xs rounded
          bg-gray-900 text-gray-200 border border-gray-700
          whitespace-nowrap shadow-xl pointer-events-none
          ${positions[side]}
        `}>
          {content}
        </div>
      )}
    </div>
  );
}
