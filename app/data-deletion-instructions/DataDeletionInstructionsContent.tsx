'use client';

import { useEffect } from 'react';
import Logo from '@/components/shared/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { LEGAL_LAST_UPDATED, formatMonthYear, legalCopy, mailtoHref } from '@/lib/legalCopy';

export default function DataDeletionInstructionsContent() {
  const { language } = useLanguage();
  const copy = legalCopy(language);
  const t = copy.instructions;

  useEffect(() => {
    document.title = t.documentTitle;
  }, [t.documentTitle]);

  return (
    <div className="min-h-screen bg-brand-50">

      {/* Header */}
      <div className="border-b border-line bg-white px-6 py-10 text-center">
        <a href="/" className="mb-4 inline-flex" aria-label={copy.homeAriaLabel}><Logo /></a>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          {t.title}
        </h1>
        <p className="text-muted text-sm mt-2 max-w-md mx-auto">
          {t.subtitle}
        </p>
        {copy.translationNotice && (
          <p className="text-muted text-xs mt-3 max-w-md mx-auto">{copy.translationNotice}</p>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">

        {/* Step-by-step */}
        <section>
          <h2 className="text-xs font-bold text-muted uppercase tracking-widest rtl:tracking-normal mb-5">
            {t.stepsTitle}
          </h2>
          <div className="space-y-3">
            {t.steps.map((step, i) => (
              <div key={step.title} className="bg-white rounded-2xl border border-line shadow-sm p-5 flex gap-4">
                <span className="text-2xl font-bold text-brand-200 shrink-0 leading-none mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="font-bold text-ink text-sm">{step.title}</p>
                  <p className="text-muted text-sm mt-0.5 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Manual email request */}
        <section className="bg-brand-50 rounded-2xl border border-brand-100 p-6 space-y-3">
          <h2 className="text-xs font-semibold text-brand-700 uppercase tracking-[0.06em] rtl:tracking-normal">
            {t.contactTitle}
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            {t.contactBodyBefore}{' '}
            <strong className="text-ink">&quot;{t.mailSubject}&quot;</strong>{' '}
            {t.contactBodyAfter}
          </p>
          <a
            href={mailtoHref(t.mailSubject)}
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:underline"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@subhub.app
          </a>
        </section>

        {/* What gets deleted */}
        <section>
          <h2 className="text-xs font-bold text-muted uppercase tracking-widest rtl:tracking-normal mb-4">
            {t.deletedTitle}
          </h2>
          <div className="bg-white rounded-2xl border border-line shadow-sm divide-y divide-line">
            {t.deletedItems.map(item => (
              <div key={item} className="flex items-start gap-3 px-5 py-3.5">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-sm text-muted">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* What is retained */}
        <section>
          <h2 className="text-xs font-bold text-muted uppercase tracking-widest rtl:tracking-normal mb-4">
            {t.retainedTitle}
          </h2>
          <div className="bg-white rounded-2xl border border-line shadow-sm divide-y divide-line">
            {t.retainedItems.map(item => (
              <div key={item} className="flex items-start gap-3 px-5 py-3.5">
                <svg className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-muted">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="bg-white rounded-2xl border border-line shadow-sm p-6 flex items-start gap-4">
          <svg className="w-6 h-6 text-brand-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-bold text-ink text-sm">{t.processingTitle}</p>
            <p className="text-muted text-sm mt-0.5 leading-relaxed">
              {t.processingBodyBefore}<strong>{t.processingBodyStrong}</strong>{t.processingBodyAfter}
            </p>
          </div>
        </section>

        {/* Track status */}
        <section className="text-center space-y-2">
          <p className="text-sm text-muted">
            {t.trackQuestion}
          </p>
          <a
            href="/data-deletion"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:underline"
          >
            {t.trackLink}
            <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
          </a>
        </section>

        <p className="text-xs text-muted text-center pb-4">
          {t.footer(formatMonthYear(LEGAL_LAST_UPDATED, language))}
        </p>
      </div>
    </div>
  );
}
