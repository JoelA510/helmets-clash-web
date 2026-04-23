// @ts-nocheck
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

// Accessible modal: role="dialog", aria-modal, labeled title, focus trap,
// Escape-to-close, click-outside-to-close, and focus restoration on unmount.
export function Dialog({ open, onClose, title, children, maxWidth = 'max-w-lg', dismissable = true, labelledById }) {
  const ref = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissable) { e.stopPropagation(); onClose?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismissable, onClose]);

  if (!open) return null;

  const titleId = labelledById || 'dialog-title';

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-gradient-to-b from-amber-100 to-amber-50 border-2 border-amber-700 rounded-lg p-5 ${maxWidth} w-full m-4 shadow-2xl focus:outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h2 id={titleId} className="text-2xl font-bold">{title}</h2>
          {dismissable && (
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="text-stone-600 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-1 rounded p-1"
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
