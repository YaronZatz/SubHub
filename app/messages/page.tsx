'use client';

import React from 'react';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import AuthGuard from '@/components/shared/AuthGuard';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/translations';
import { accountCopy } from '@/lib/accountCopy';

function MessagesContent() {
  const { language } = useLanguage();
  const t = translations[language];
  const mc = accountCopy(language).messages;
  return (
    <div className="min-h-screen bg-white">
      <WebNavbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 md:pb-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">{t.messages}</h1>
          <p className="text-muted text-sm mt-1">{mc.subtitle}</p>
        </div>

        {/* Empty state */}
        <div className="bg-white rounded-2xl border border-line py-20 flex flex-col items-center text-center px-4">
          <div className="w-16 h-16 rounded-full bg-brand-600/10 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-ink mb-2">{t.noMessages}</h2>
          <p className="text-sm text-muted max-w-xs mb-3">{t.noMessagesDesc}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-100 text-accent-700 text-xs font-semibold rounded-full mb-8">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {mc.comingSoon}
          </div>
          <Link
            href="/map"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
          >
            {mc.findListing}
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <AuthGuard>
      <MessagesContent />
    </AuthGuard>
  );
}
