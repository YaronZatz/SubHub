'use client';

import React from 'react';
import type { Sublet } from '../../types';

interface SuccessTranslations {
  successTitle: string;
  viewOnMap: string;
  postAnother: string;
  done: string;
}

interface ListingSuccessScreenProps {
  listing: Sublet;
  onViewOnMap: () => void;
  onPostAnother: () => void;
  onDone: () => void;
  t: SuccessTranslations;
}

export default function ListingSuccessScreen({
  listing,
  onViewOnMap,
  onPostAnother,
  onDone,
  t,
}: ListingSuccessScreenProps) {
  const title = listing.location || listing.city || 'Your listing';
  const currencySymbol: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };
  const sym = currencySymbol[listing.currency] ?? listing.currency;
  const priceStr = listing.price > 0 ? `${sym}${listing.price.toLocaleString()}` : null;

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Checkmark */}
      <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center ">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-1">
        <h3 className="font-display text-2xl font-extrabold tracking-tight text-ink">{t.successTitle}</h3>
        <p className="text-muted text-sm font-semibold">{title}</p>
        {priceStr && <p className="text-brand-600 text-sm font-bold">{priceStr}</p>}
      </div>

      <div className="w-full space-y-2.5 max-w-xs">
        <button
          type="button"
          onClick={onViewOnMap}
          className="w-full h-12 bg-brand-600 text-white rounded-xl font-semibold text-[15px] hover:bg-brand-700 transition-all "
        >
          {t.viewOnMap}
        </button>
        <button
          type="button"
          onClick={onPostAnother}
          className="w-full h-12 bg-white border border-line text-ink rounded-xl font-semibold text-[15px] hover:border-brand-200 transition-all"
        >
          {t.postAnother}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="w-full py-3 text-muted text-sm font-semibold hover:text-muted transition-colors"
        >
          {t.done}
        </button>
      </div>
    </div>
  );
}
