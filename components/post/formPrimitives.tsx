import React from 'react';

export const ic = 'w-full px-3.5 py-3 bg-white border border-line rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-brand-600  transition-all';
export const icErr = 'w-full px-3.5 py-3 bg-white border border-red-500 rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-red-500  transition-all';

export function FL({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted uppercase tracking-[0.06em]">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 font-medium mt-0.5">{error}</p>}
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-muted uppercase tracking-[0.06em] border-b border-line pb-2 mb-3">{children}</h3>;
}
