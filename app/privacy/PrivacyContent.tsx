'use client';

import { useEffect } from 'react';
import Logo from '@/components/shared/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { LEGAL_LAST_UPDATED, formatMonthYear, legalCopy, mailtoHref } from '@/lib/legalCopy';

export default function PrivacyContent() {
  const { language } = useLanguage();
  const copy = legalCopy(language);
  const t = copy.privacy;

  useEffect(() => {
    document.title = t.documentTitle;
  }, [t.documentTitle]);

  return (
    <div className="min-h-screen bg-brand-50">

      {/* Header */}
      <div className="border-b border-line bg-white px-6 py-10 text-center">
        <a href="/" className="mb-4 inline-flex" aria-label={copy.homeAriaLabel}><Logo /></a>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">{t.title}</h1>
        <p className="text-muted text-sm mt-2">{t.lastUpdated(formatMonthYear(LEGAL_LAST_UPDATED, language))}</p>
        {copy.translationNotice && (
          <p className="text-muted text-xs mt-3 max-w-md mx-auto">{copy.translationNotice}</p>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

        {/* Intro */}
        <p className="text-sm text-muted leading-relaxed bg-white rounded-2xl border border-line shadow-sm p-6">
          {t.intro}
        </p>

        {/* Sections */}
        {t.sections.map(section => (
          <section key={section.title} className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-line">
              <h2 className="text-sm font-bold text-ink">{section.title}</h2>
            </div>
            <div className="divide-y divide-line">
              {section.items.map(item => (
                <div key={item.label} className="px-6 py-4">
                  <p className="text-xs font-bold text-muted uppercase tracking-wider rtl:tracking-normal mb-1">{item.label}</p>
                  <p className="text-sm text-muted leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Contact */}
        <section className="bg-brand-50 rounded-2xl border border-brand-100 p-6 space-y-2">
          <h2 className="text-xs font-semibold text-brand-700 uppercase tracking-[0.06em] rtl:tracking-normal">{t.contactTitle}</h2>
          <p className="text-sm text-muted leading-relaxed">
            {t.contactBody}
          </p>
          <a
            href={mailtoHref(t.contactMailSubject)}
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:underline"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@subhub.app
          </a>
        </section>

        {/* Data deletion link */}
        <p className="text-xs text-muted text-center pb-4">
          {t.deletionLinkBefore}
          <a href="/data-deletion-instructions" className="underline hover:text-muted">
            {t.deletionLinkText}
          </a>
          {t.deletionLinkAfter}
        </p>

      </div>
    </div>
  );
}
