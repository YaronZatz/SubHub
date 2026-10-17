'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Map as MapIcon, ArrowRight, ChevronDown, Info } from 'lucide-react';
import HeroMapCard from '@/components/shared/HeroMapCard';
import PostToListingSection from '@/components/shared/PostToListingSection';
import SiteFooter from '@/components/shared/SiteFooter';
import { PostToPinSpot, HomePinSpot } from '@/components/illustrations/MapSpots';
import { SearchPreview, FilterPreview, ListingPreview, ContactPreview } from '@/components/howItWorks/StepPreviews';
import { useLanguage } from '@/contexts/LanguageContext';
import { howItWorksCopy } from '@/lib/howItWorksCopy';
import { homeCopy } from '@/lib/homeCopy';
import type { CityBrowseResponse } from '@/lib/areas/browse';

const PREVIEWS = [SearchPreview, FilterPreview, ListingPreview, ContactPreview];

const primaryBtn = 'inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700';

/** Live count of available Tel Aviv-Yafo sublets (same source as the city page). */
function useAvailableCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/cities/tel-aviv/browse')
      .then(r => (r.ok ? r.json() : null))
      .then((data: CityBrowseResponse | null) => { if (!cancelled && data?.total) setCount(data.total); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return count;
}

export default function HowItWorksPage() {
  const { language } = useLanguage();
  const copy = howItWorksCopy(language);
  const home = homeCopy(language);
  const available = useAvailableCount();

  const liveCount = available !== null && (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-muted">
      <span className="h-2 w-2 rounded-full bg-accent-500" aria-hidden="true" />
      {home.cityAvailableNow(available)}
    </span>
  );

  return (
    // pb-24 on mobile keeps the footer clear of the fixed bottom tab bar
    <div className="bg-white pb-24 font-sans text-ink md:pb-0">
      {/* Hero */}
      <header className="bg-brand-50">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-8 px-4 py-10 md:gap-12 md:px-6 md:py-16">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
            <h1 className="font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[54px]">{copy.title}</h1>
            <p className="max-w-[520px] text-[17px] leading-relaxed text-muted md:text-lg">{copy.subtitle}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/map" className={primaryBtn}>
                <MapIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                {copy.ctaMap}
              </Link>
              <a href="#post" className="text-[15px] font-semibold text-brand-700 underline-offset-4 hover:underline">
                {copy.posterLink}
              </a>
            </div>
            {liveCount}
          </div>
          <HeroMapCard label={copy.ctaMap} className="h-[220px] w-full flex-[1_1_360px] md:h-[320px]" />
        </div>
      </header>

      {/* Four steps, each shown with a replica of the real UI */}
      <section className="mx-auto flex max-w-[1200px] flex-col px-4 md:px-6">
        {copy.steps.map((step, i) => {
          const Preview = PREVIEWS[i];
          return (
            <div
              key={step.title}
              className={`grid items-center gap-8 py-12 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16 md:py-20 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-brand-600">{copy.stepLabel(i + 1)}</span>
                <h2 className="font-display text-[28px] font-extrabold leading-[1.12] tracking-[-0.02em] md:text-[34px]">{step.title}</h2>
                <p className="max-w-[440px] text-[17px] leading-relaxed text-muted">{step.body}</p>
              </div>
              <div className="rounded-3xl bg-brand-50 px-4 py-8 md:px-10 md:py-12" aria-hidden="true">
                <div className="pointer-events-none mx-auto max-w-[420px] select-none">
                  <Preview language={language} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <PostToListingSection eyebrow={null} title={copy.sourceTitle} body={copy.sourceBody} />

      {/* Posting — one compact band, not another list of steps */}
      <section id="post" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-4 py-12 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:gap-16 md:px-6 md:py-16">
          <div className="flex flex-col items-start gap-5">
            <div className="flex max-w-[560px] flex-col gap-2">
              <h2 className="font-display text-[26px] font-extrabold tracking-[-0.02em] md:text-[30px]">{copy.postTitle}</h2>
              <p className="text-[17px] leading-relaxed text-muted">{copy.postBody}</p>
            </div>
            <Link
              href="/post"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-accent-500 px-5 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-600"
            >
              {copy.ctaPost}
              <ArrowRight className="h-[18px] w-[18px] rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
          <PostToPinSpot className="mx-auto w-full max-w-[380px]" />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] md:gap-16 md:px-6 md:py-20">
        <div className="flex flex-col gap-5">
          <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em] md:text-[34px]">{copy.faqTitle}</h2>
          <p className="flex gap-2.5 text-[15px] leading-relaxed text-muted">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
            <span><strong className="font-semibold text-ink">{copy.safetyTitle} </strong>{copy.safetyBody}</span>
          </p>
        </div>
        <div className="border-t border-line">
          {copy.faq.map(item => (
            <details key={item.q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" strokeWidth={2.2} aria-hidden="true" />
              </summary>
              <p className="max-w-[620px] pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="bg-brand-50">
        <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-4 py-12 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:gap-16 md:px-6 md:py-16">
          <div className="flex flex-col items-start gap-5">
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em] md:text-[34px]">{copy.closingTitle}</h2>
              <p className="text-[17px] text-muted">{copy.closingBody}</p>
              {liveCount}
            </div>
            <Link href="/map" className={primaryBtn}>
              <MapIcon className="h-[18px] w-[18px]" aria-hidden="true" />
              {copy.ctaMap}
            </Link>
          </div>
          <Link href="/map" aria-label={copy.ctaMap} tabIndex={-1} className="mx-auto block w-full max-w-[380px] transition-transform hover:-translate-y-0.5">
            <HomePinSpot className="w-full" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
