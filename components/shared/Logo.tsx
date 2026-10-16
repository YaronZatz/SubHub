import React from 'react';

/** SubHub wordmark: a map pin in brand blue + "subhub" in the display face. */
export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const mark = size === 'sm' ? 26 : 30;
  return (
    <span className="inline-flex items-center gap-2 text-ink" dir="ltr">
      <svg width={mark} height={mark} viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="12" r="10" className="fill-brand-600" />
        <circle cx="14" cy="12" r="3.5" fill="#fff" />
        <path d="M14 22 L14 27" className="stroke-brand-600" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className={`font-display font-extrabold tracking-tight ${size === 'sm' ? 'text-xl' : 'text-[23px]'}`}>
        subhub
      </span>
    </span>
  );
}
