import { useState, useRef } from 'react';

/**
 * Underlines a term and shows a tooltip on hover.
 * Usage: <DocsTooltip tip="Modified Total Direct Costs — the basis for F&A calculations">MTDC</DocsTooltip>
 */
export default function DocsTooltip({ tip, children }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const handleMouseEnter = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
    }
    setVisible(true);
  };

  return (
    <span className="relative inline-block">
      <span
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setVisible(false)}
        className="border-b border-dashed border-gray-500 cursor-help"
      >
        {children}
      </span>
      {visible && (
        <span
          className="fixed z-50 bg-gray-900 text-white text-xs rounded px-2 py-1.5 max-w-xs shadow-lg pointer-events-none"
          style={{ left: pos.x, top: pos.y, transform: 'translateX(-50%)' }}
        >
          {tip}
        </span>
      )}
    </span>
  );
}
