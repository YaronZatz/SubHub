'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/shared/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { homeCopy } from '@/lib/homeCopy';

/** Light site footer: wordmark + the pages that actually exist. */
export default function SiteFooter() {
  const { language } = useLanguage();
  const copy = homeCopy(language);
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 px-6 py-8 text-sm text-muted">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <span>© {new Date().getFullYear()} SubHub</span>
        </div>
        <nav className="flex flex-wrap gap-5" aria-label="Footer">
          <Link href="/how-it-works" className="hover:text-ink">{copy.howItWorksLink}</Link>
          <Link href="/privacy" className="hover:text-ink">{copy.privacy}</Link>
          <Link href="/data-deletion" className="hover:text-ink">{copy.dataDeletion}</Link>
        </nav>
      </div>
    </footer>
  );
}
