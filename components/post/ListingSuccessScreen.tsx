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
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-100">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-1">
        <h3 className="text-xl font-black text-slate-900">{t.successTitle}</h3>
        <p className="text-slate-600 text-sm font-semibold">{title}</p>
        {priceStr && <p className="text-cyan-600 text-sm font-bold">{priceStr}</p>}
      </div>

      <div className="w-full space-y-2.5 max-w-xs">
        <button
          type="button"
          onClick={onViewOnMap}
          className="w-full py-3.5 bg-cyan-600 text-white rounded-2xl font-black text-sm hover:bg-cyan-700 transition-all shadow-xl shadow-cyan-100"
        >
          {t.viewOnMap}
        </button>
        <button
          type="button"
          onClick={onPostAnother}
          className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
        >
          {t.postAnother}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="w-full py-3 text-slate-400 text-sm font-semibold hover:text-slate-600 transition-colors"
        >
          {t.done}
        </button>
      </div>
    </div>
  );
}
