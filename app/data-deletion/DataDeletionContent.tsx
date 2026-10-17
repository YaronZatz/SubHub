'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatFullDate, legalCopy, mailtoHref } from '@/lib/legalCopy';

export interface DeletionStatusInfo {
  status: 'pending' | 'completed' | 'failed';
  /** ISO timestamp of the request. */
  requestedAt?: string;
}

export default function DataDeletionContent({
  id,
  info,
}: {
  id?: string;
  info: DeletionStatusInfo | null;
}) {
  const { language } = useLanguage();
  const copy = legalCopy(language);
  const t = copy.deletion;

  useEffect(() => {
    document.title = t.documentTitle;
  }, [t.documentTitle]);

  const requestedAt = info?.requestedAt ? new Date(info.requestedAt) : null;
  const requestedLabel = requestedAt && !Number.isNaN(requestedAt.getTime())
    ? formatFullDate(requestedAt, language)
    : null;

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-line overflow-hidden">

        {/* Header */}
        <div className="border-b border-line bg-brand-50 px-8 py-6">
          <h1 className="font-display text-xl font-extrabold text-ink tracking-tight">{t.title}</h1>
          <p className="text-muted text-sm mt-1">{t.subtitle}</p>
          {copy.translationNotice && (
            <p className="text-muted text-xs mt-2">{copy.translationNotice}</p>
          )}
        </div>

        <div className="px-8 py-8 space-y-6">

          {/* Status section — shown only when a confirmation code is in the URL */}
          {id && (
            <div className={`rounded-2xl border p-5 ${
              !info                         ? 'bg-brand-50 border-line' :
              info.status === 'completed'   ? 'bg-brand-50 border-brand-200' :
              info.status === 'failed'      ? 'bg-red-50 border-red-200' :
                                              'bg-accent-50 border-accent-200'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  !info                         ? 'bg-muted' :
                  info.status === 'completed'   ? 'bg-brand-600' :
                  info.status === 'failed'      ? 'bg-red-500' :
                                                  'bg-accent-500 animate-pulse'
                }`} />
                <p className="font-bold text-sm text-ink">
                  {!info                       ? t.statusNotFound :
                   info.status === 'completed' ? t.statusCompleted :
                   info.status === 'failed'    ? t.statusFailed :
                                                 t.statusPending}
                </p>
              </div>

              <p className="text-[11px] text-muted">
                {t.confirmationCodeLabel}{' '}
                <span className="font-mono break-all" dir="ltr">{id}</span>
              </p>
              {requestedLabel && (
                <p className="text-[11px] text-muted mt-1">{t.requestedOn(requestedLabel)}</p>
              )}
            </div>
          )}

          {/* What we delete */}
          <div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider rtl:tracking-normal mb-3">
              {t.deletedTitle}
            </h2>
            <ul className="space-y-2">
              {t.deletedItems.map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
                  <svg className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Manual deletion instructions */}
          <div className="bg-brand-50 rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider rtl:tracking-normal">
              {t.manualTitle}
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              {t.manualBodyBefore}
              <strong className="text-ink"> "{t.mailSubject}"</strong> {t.manualBodyAfter}
            </p>
            <a
              href={mailtoHref(t.mailSubject)}
              className="inline-flex items-center gap-2 mt-1 text-sm font-bold text-brand-600 hover:underline"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              support@subhub.app
            </a>
            <p className="text-xs text-muted">{t.manualTimeline}</p>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted text-center">
            {t.requiredByBefore}
            <a
              href="https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-muted"
            >
              {t.requiredByLink}
            </a>
            {t.requiredByAfter}
          </p>
        </div>
      </div>
    </div>
  );
}
