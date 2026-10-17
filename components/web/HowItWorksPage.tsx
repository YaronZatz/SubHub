'use client';

import React from 'react';
import Link from 'next/link';
import { Inbox, Sparkles, Map as MapIcon, ClipboardPaste, BadgeCheck, Info, ArrowRight } from 'lucide-react';
import SectionHeader from '@/components/shared/SectionHeader';
import PostToListingSection from '@/components/shared/PostToListingSection';
import SiteFooter from '@/components/shared/SiteFooter';
import { useLanguage } from '@/contexts/LanguageContext';
import { howItWorksCopy } from '@/lib/howItWorksCopy';

const STEP_ICONS = [Inbox, Sparkles, MapIcon];
const POST_STEP_ICONS = [ClipboardPaste, Sparkles, BadgeCheck];

export default function HowItWorksPage() {
  const { language } = useLanguage();
  const copy = howItWorksCopy(language);

  return (
    // pb-24 on mobile keeps the footer clear of the fixed bottom tab bar
    <div className="bg-white pb-24 font-sans text-ink md:pb-0">
      {/* Hero */}
      <header className="bg-brand-50">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-12 md:px-6 md:py-20">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-brand-700 rtl:tracking-normal">{copy.eyebrow}</p>
          <h1 className="max-w-[780px] font-display text-[34px] font-extrabold leading-[1.08] tracking-[-0.025em] md:text-[56px]">
            {copy.title}
          </h1>
          <p className="max-w-[620px] text-[17px] leading-relaxed text-muted md:text-lg">{copy.subtitle}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href="/map"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <MapIcon className="h-[18px] w-[18px]" aria-hidden="true" />
              {copy.ctaMap}
            </Link>
            <Link
              href="/post"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-white px-5 text-[15px] font-semibold text-ink transition-colors hover:border-brand-200 hover:text-brand-700"
            >
              {copy.ctaPost}
            </Link>
          </div>
        </div>
      </header>

      {/* Three steps */}
      <section className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-14 md:px-6 md:py-20">
        <SectionHeader title={copy.stepsTitle} />
        <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
          {copy.steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <li key={step.title} className="flex flex-col gap-3 rounded-2xl border border-line p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
                  </span>
                  <span className="font-display text-[28px] font-extrabold leading-none text-brand-200" aria-hidden="true">{i + 1}</span>
                </div>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <PostToListingSection eyebrow={copy.exampleEyebrow} />

      {/* Posting a sublet */}
      <section className="bg-accent-50">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12 md:px-6 md:py-20">
          <div className="flex flex-col items-start gap-5">
            <SectionHeader title={copy.postTitle} subtitle={copy.postSubtitle} />
            <Link
              href="/post"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent-500 px-5 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-600"
            >
              {copy.ctaPost}
              <ArrowRight className="h-[18px] w-[18px] rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
          <ol className="flex flex-col gap-3">
            {copy.postSteps.map((step, i) => {
              const Icon = POST_STEP_ICONS[i];
              return (
                <li key={step.title} className="flex gap-4 rounded-2xl bg-white p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="font-bold">{step.title}</h3>
                    <p className="text-[15px] leading-relaxed text-muted">{step.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto flex max-w-[880px] flex-col gap-8 px-4 py-14 md:px-6 md:py-20">
        <SectionHeader title={copy.compareTitle} />
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line text-[15px] md:grid-cols-[180px_1fr_1fr]">
          <div className="hidden md:block" />
          <div className="px-4 py-3 text-[13px] font-semibold text-muted">{copy.colFacebook}</div>
          <div className="px-4 py-3 text-[13px] font-semibold text-brand-700 md:bg-brand-50">{copy.colSubHub}</div>
          {copy.compareRows.map((row) => (
            <React.Fragment key={row.label}>
              <div className="col-span-2 border-t border-line px-4 pb-1 pt-4 text-[12px] font-semibold uppercase tracking-wide text-muted md:col-span-1 md:py-4 md:text-[15px] md:normal-case md:tracking-normal md:text-ink">
                {row.label}
              </div>
              <div className="px-4 pb-4 text-muted md:border-t md:border-line md:py-4">{row.fb}</div>
              <div className="px-4 pb-4 font-semibold text-brand-700 md:border-t md:bg-brand-50 md:border-line md:py-4">{row.sh}</div>
            </React.Fragment>
          ))}
        </div>
        <div className="flex gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" aria-hidden="true" />
          <p className="text-[15px] leading-relaxed text-accent-ink">
            <strong className="font-semibold">{copy.noteTitle}. </strong>
            {copy.noteBody}
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
