'use client';

import React from 'react';
import Link from 'next/link';
import { MapPinOff } from 'lucide-react';
import Logo from '@/components/shared/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { legalCopy } from '@/lib/legalCopy';

export default function NotFound() {
  const { language } = useLanguage();
  const copy = legalCopy(language);
  const t = copy.notFound;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <Link href="/" className="mb-10" aria-label={copy.homeAriaLabel}><Logo /></Link>
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <MapPinOff className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h1 className="font-display text-3xl font-extrabold text-ink mb-3 tracking-tight">
        {t.title}
      </h1>
      <p className="text-muted mb-10 max-w-sm">
        {t.body}
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/map"
          className="flex h-12 items-center gap-2 px-6 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors"
        >
          {t.browse}
          <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
        </Link>
        <Link
          href="/"
          className="flex h-12 items-center px-6 border border-line bg-white text-ink font-semibold rounded-xl hover:border-brand-200 transition-colors"
        >
          {t.home}
        </Link>
      </div>
    </div>
  );
}
