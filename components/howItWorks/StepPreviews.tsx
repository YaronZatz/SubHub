'use client';

import React from 'react';
import { MapPin, Search, SlidersHorizontal, ChevronDown, ExternalLink } from 'lucide-react';
import { HeartIcon } from '@/components/Icons';
import AreaPlaceholder from '@/components/city/AreaPlaceholder';
import { translations } from '@/translations';
import { Language, SubletType } from '@/types';
import { homeCopy } from '@/lib/homeCopy';
import { howItWorksCopy } from '@/lib/howItWorksCopy';
import { formatDateRange, timelineWindow } from '@/lib/dateWindow';

/*
 * Static, non-interactive replicas of the real UI, one per "how it works" step.
 * Labels come from the same copy the live app uses (translations / homeCopy), and
 * the classes mirror the real components, so the previews stay in sync with the
 * product and always render in the page's language.
 */

const card = 'rounded-2xl border border-line bg-white shadow-[0_10px_30px_rgba(17,26,36,0.08)]';
const pill = (active: boolean) =>
  `h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium leading-[34px] ${
    active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink'
  }`;

interface PreviewProps { language: Language }

export function SearchPreview({ language }: PreviewProps) {
  const copy = howItWorksCopy(language);
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
        <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[17px] font-medium">
          {copy.searchQuery}
          <span className="ms-0.5 inline-block h-5 w-px translate-y-1 animate-pulse bg-brand-600" />
        </span>
      </div>
      <ul className="py-1.5">
        {copy.suggestions.map((s, i) => (
          <li key={s.name} className={`flex items-center gap-3 px-4 py-2.5 ${i === 0 ? 'bg-brand-50' : ''}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-line">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-semibold">{s.name}</span>
              <span className="truncate text-[13px] text-muted">{s.place}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FilterPreview({ language }: PreviewProps) {
  const copy = howItWorksCopy(language);
  const home = homeCopy(language);
  const t = translations[language];
  const chips = [
    { label: t.subletTypes[SubletType.ENTIRE], active: false },
    { label: t.subletTypes[SubletType.STUDIO], active: true },
    { label: home.quickPets, active: false },
    { label: home.quickToday, active: true },
  ];
  return (
    <div className={`${card} flex flex-col gap-5 p-5`}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-medium text-muted">{copy.budgetLabel}</span>
          <span className="text-[15px] font-semibold tabular-nums" dir="ltr">{copy.budgetRange}</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-brand-100" aria-hidden="true">
          <div className="absolute inset-y-0 rounded-full bg-brand-600" style={{ insetInlineStart: '10%', width: '20%' }} />
          <span className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-brand-600 bg-white" style={{ insetInlineStart: 'calc(10% - 10px)' }} />
          <span className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-brand-600 bg-white" style={{ insetInlineStart: 'calc(30% - 10px)' }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={`${pill(false)} inline-flex items-center gap-1.5`}>
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {t.filters}
        </span>
        {chips.map(c => <span key={c.label} className={pill(c.active)}>{c.label}</span>)}
      </div>
      <p className="border-t border-line pt-4 text-[15px] font-semibold">{home.resultsCount(24)}</p>
    </div>
  );
}

/** First day of the month `offset` months from now, as YYYY-MM-DD. */
function monthStart(offset: number, endOfMonth = false): string {
  const now = new Date();
  const d = endOfMonth
    ? new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
    : new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ListingPreview({ language }: PreviewProps) {
  const copy = howItWorksCopy(language);
  const home = homeCopy(language);
  const t = translations[language];
  const start = monthStart(1);
  const end = monthStart(3, true);
  const range = formatDateRange(start, end, language);
  const timeline = timelineWindow(start, end, language);
  return (
    <div className={`${card} mx-auto w-full max-w-[320px] overflow-hidden`}>
      <div className="relative aspect-[16/10]">
        <AreaPlaceholder slug="florentin" />
        <span className="absolute start-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-accent-700">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          {t.addedXhAgo.replace('{x}', '3')}
        </span>
        <span className="absolute end-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink">
          <HeartIcon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="flex flex-col gap-2.5 px-4 pb-4 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">{t.subletTypes[SubletType.STUDIO]}</span>
          <span className="font-bold tabular-nums text-lg">₪4,500<span className="ms-0.5 text-xs font-normal text-muted">{home.perMonth}</span></span>
        </div>
        <div>
          <h4 className="font-display text-[19px] font-bold tracking-tight">{copy.sampleArea}</h4>
          <p className="text-sm text-muted">{copy.sampleCity}</p>
        </div>
        {range && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">{range}</span>
            {timeline && (
              <>
                <div className="relative h-1.5 rounded-full bg-brand-100" aria-hidden="true">
                  <div className="absolute inset-y-0 rounded-full bg-brand-600" style={{ insetInlineStart: `${timeline.left}%`, width: `${timeline.width}%` }} />
                </div>
                <div className="flex justify-between text-[11px] uppercase text-muted" aria-hidden="true">
                  {timeline.months.map(m => <span key={m}>{m}</span>)}
                </div>
              </>
            )}
          </div>
        )}
        <div className="mt-1 flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm font-semibold">
          {home.showOriginal}
          <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export function ContactPreview({ language }: PreviewProps) {
  const copy = howItWorksCopy(language);
  const t = translations[language];
  return (
    <div className={`${card} mx-auto flex w-full max-w-[360px] flex-col gap-3 p-5`}>
      <span className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-[15px] font-semibold text-white">
        {t.contactLandlord}
      </span>
      <span className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-semibold text-ink">
        <HeartIcon className="h-4 w-4" />
        {t.saveListing}
      </span>
      <p className="flex items-center justify-center gap-1.5 pt-1 text-[13px] text-muted">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        {copy.opensOriginal}
      </p>
    </div>
  );
}
