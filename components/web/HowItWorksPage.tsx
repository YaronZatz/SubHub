'use client';

import React from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Images, MessageCircle, Inbox, Sparkles, Link2,
  ClipboardPaste, BadgeCheck, Map as MapIcon, ArrowDown, ArrowRight, ChevronDown, Info, Zap,
} from 'lucide-react';
import SectionHeader from '@/components/shared/SectionHeader';
import PostToListingSection from '@/components/shared/PostToListingSection';
import SiteFooter from '@/components/shared/SiteFooter';
import { useLanguage } from '@/contexts/LanguageContext';
import { howItWorksCopy } from '@/lib/howItWorksCopy';

const SOURCE_ICONS = [Inbox, Sparkles, Link2];
const FIND_ICONS = [Search, SlidersHorizontal, Images, MessageCircle];
const POST_ICONS = [ClipboardPaste, Sparkles, BadgeCheck];

const primaryBtn = 'inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700';

export default function HowItWorksPage() {
  const { language } = useLanguage();
  const copy = howItWorksCopy(language);
  const isLast = (i: number, arr: unknown[]) => i === arr.length - 1;

  return (
    // pb-24 on mobile keeps the footer clear of the fixed bottom tab bar
    <div className="bg-white pb-24 font-sans text-ink md:pb-0">
      {/* Hero + two doors */}
      <header className="bg-brand-50">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-12 md:px-6 md:py-16">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-brand-700 rtl:tracking-normal">{copy.eyebrow}</p>
          <h1 className="max-w-[780px] font-display text-[34px] font-extrabold leading-[1.08] tracking-[-0.025em] md:text-[56px]">
            {copy.title}
          </h1>
          <p className="max-w-[620px] text-[17px] leading-relaxed text-muted md:text-lg">{copy.subtitle}</p>
          <div className="mt-3 grid gap-3 md:max-w-[820px] md:grid-cols-[3fr_2fr] md:gap-4">
            <a href="#find" className="group flex flex-col gap-2 rounded-2xl bg-brand-600 p-5 text-white transition-colors hover:bg-brand-700 md:p-6">
              <Search className="h-6 w-6 text-brand-200" aria-hidden="true" />
              <span className="font-display text-[22px] font-extrabold">{copy.doorSeekerTitle}</span>
              <span className="text-[15px] text-white/80">{copy.doorSeekerBody}</span>
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
                {copy.doorSeekerLink}
                <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
              </span>
            </a>
            <a href="#post" className="group flex flex-col gap-2 rounded-2xl border border-line bg-white p-5 transition-colors hover:border-brand-200 md:p-6">
              <ClipboardPaste className="h-6 w-6 text-accent-600" aria-hidden="true" />
              <span className="font-display text-[22px] font-extrabold">{copy.doorPosterTitle}</span>
              <span className="text-[15px] text-muted">{copy.doorPosterBody}</span>
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                {copy.doorPosterLink}
                <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
              </span>
            </a>
          </div>
        </div>
      </header>

      {/* Where the listings come from */}
      <section className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-14 md:px-6 md:py-20">
        <SectionHeader title={copy.sourceTitle} />
        <ol className="grid gap-6 md:grid-cols-3">
          {copy.sourceSteps.map((step, i) => {
            const Icon = SOURCE_ICONS[i];
            return (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="text-[15px] leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <PostToListingSection eyebrow={copy.exampleEyebrow} />

      {/* Finding a sublet */}
      <section id="find" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-8 px-4 py-14 md:px-6 md:py-20">
        <SectionHeader title={copy.findTitle} subtitle={copy.findSubtitle} />
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {copy.findSteps.map((step, i) => {
            const Icon = FIND_ICONS[i];
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
                {step.chips.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {step.chips.map((chip) => (
                      <span key={chip} dir="auto" className="rounded-full border border-line bg-brand-50 px-2.5 py-1 text-[13px] font-semibold text-brand-700">
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-brand-50 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <p className="flex gap-3 text-[15px] leading-relaxed">
            <Zap className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
            <span><strong className="font-semibold">{copy.tipTitle}: </strong>{copy.tipBody}</span>
          </p>
          <Link href="/map" className={`${primaryBtn} shrink-0`}>
            <MapIcon className="h-[18px] w-[18px]" aria-hidden="true" />
            {copy.ctaMap}
          </Link>
        </div>
      </section>

      {/* Posting a sublet */}
      <section id="post" className="scroll-mt-20 bg-accent-50">
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
              const Icon = POST_ICONS[i];
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

      {/* FAQ */}
      <section className="mx-auto flex max-w-[880px] flex-col gap-8 px-4 py-14 md:px-6 md:py-20">
        <SectionHeader title={copy.faqTitle} />
        <div className="overflow-hidden rounded-2xl border border-line">
          {copy.faq.map((item, i) => (
            <details key={item.q} className={`group ${isLast(i, copy.faq) ? '' : 'border-b border-line'}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold hover:bg-brand-50 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" strokeWidth={2.2} aria-hidden="true" />
              </summary>
              <p className="px-5 pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="flex gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" aria-hidden="true" />
          <p className="text-[15px] leading-relaxed text-accent-ink">
            <strong className="font-semibold">{copy.safetyTitle} </strong>
            {copy.safetyBody}
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
