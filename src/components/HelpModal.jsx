import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function HelpSection({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">{title}</h3>
      <div className="text-sm text-gray-700 space-y-1">{children}</div>
    </div>
  );
}

export function DocLink({ to }) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
      <a href={`/admin/docs/user-guide/${to}`} className="text-blue-600 underline">
        View full documentation →
      </a>
    </div>
  );
}

export default function HelpModal({ title, onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-16">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 bg-blue-600 rounded-t-xl flex-shrink-0">
            <h2 className="text-base font-semibold text-white">{title} — Help</h2>
            <button
              onClick={onClose}
              className="text-blue-200 hover:text-white text-xl leading-none p-1 rounded"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="px-6 py-5 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
