import { useState } from 'react';
import HelpModal from './HelpModal';

export function HelpButton({ title, content }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold flex items-center justify-center cursor-pointer flex-shrink-0"
        aria-label={`Help: ${title}`}
        title={`Help: ${title}`}
      >
        ?
      </button>
      {open && (
        <HelpModal title={title} onClose={() => setOpen(false)}>
          {content}
        </HelpModal>
      )}
    </>
  );
}
