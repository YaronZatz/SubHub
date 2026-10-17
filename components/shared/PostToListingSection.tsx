'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { homeCopy } from '@/lib/homeCopy';

interface PostToListingSectionProps {
  /** Overrides the small label above the title (defaults to "How it works"). */
  eyebrow?: string;
}

/** Dark band showing a raw Facebook post next to the structured listing we make from it. */
export default function PostToListingSection({ eyebrow }: PostToListingSectionProps) {
  const { language } = useLanguage();
  const copy = homeCopy(language);
  return (
    <section className="bg-brand-900 text-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-10 px-6 py-16">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-brand-200 rtl:tracking-normal">{eyebrow ?? copy.howItWorksEyebrow}</p>
          <h2 className="font-display text-[40px] font-extrabold leading-[1.08] tracking-[-0.025em]">{copy.howItWorksTitle}</h2>
          <p className="text-[17px] text-white/80">{copy.howItWorksBody}</p>
        </div>
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5 rounded-2xl border border-white/15 bg-white/[0.07] p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-white/70">{copy.sampleSource}</span>
          <p className="text-[15px] leading-relaxed">{copy.samplePost}</p>
        </div>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true" className="mx-auto shrink-0 rotate-90 text-accent-500 xl:mx-0 xl:rotate-0 xl:rtl:rotate-180">
          <path d="M4 12h15" /><path d="M13 6l6 6-6 6" />
        </svg>
        <dl className="grid min-w-0 flex-[1_1_260px] grid-cols-2 gap-3.5 rounded-2xl bg-white p-5 text-ink">
          <div><dt className="text-[11px] font-medium uppercase text-muted">{copy.samplePrice}</dt><dd className="text-[17px] font-bold tabular-nums">{copy.samplePriceValue}</dd></div>
          <div><dt className="text-[11px] font-medium uppercase text-muted">{copy.sampleType}</dt><dd><span className="rounded-md bg-brand-100 px-2 py-0.5 text-sm font-semibold text-brand-700">{copy.sampleTypeValue}</span></dd></div>
          <div><dt className="text-[11px] font-medium uppercase text-muted">{copy.sampleDates}</dt><dd className="text-[15px] font-medium">{copy.sampleDatesValue}</dd></div>
          <div><dt className="text-[11px] font-medium uppercase text-muted">{copy.sampleWhere}</dt><dd className="font-semibold">{copy.sampleWhereValue}</dd></div>
        </dl>
      </div>
    </section>
  );
}
