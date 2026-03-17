'use client';

import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  /** ms before auto-dismiss (default 2200) */
  duration?: number;
}

/**
 * Simple auto-dismissing toast notification.
 * Positioned above mobile tab bar (bottom-24) and above desktop fold (md:bottom-6).
 */
export default function Toast({ message, onDismiss, duration = 2200 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-none"
    >
      <div className="bg-slate-900 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-2xl whitespace-nowrap">
        {message}
      </div>
    </div>
  );
}
