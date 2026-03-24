'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import AuthGuard from '@/components/shared/AuthGuard';
import ListingCarousel from '@/components/ListingCarousel';
import { useSaved } from '@/contexts/SavedContext';
import { persistenceService } from '@/services/persistenceService';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice, formatDate } from '@/utils/formatters';
import { HeartIcon } from '@/components/Icons';
import { Sublet } from '@/types';

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 py-20 flex flex-col items-center text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2">Your Shortlist is Empty</h2>
      <p className="text-sm text-slate-500 max-w-xs mb-8">
        Tap the ♡ on any listing to save it here. We'll keep your shortlist ready whenever you come back.
      </p>
      <Link
        href="/map"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#2F6EA8] text-white font-bold rounded-xl hover:bg-[#2F6EA8]/90 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Browse the map
      </Link>
    </div>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

function SavedCard({ sublet, onUnsave }: { sublet: Sublet; onUnsave: () => void }) {
  const { currency } = useCurrency();

  const title = [sublet.neighborhood, sublet.city].filter(Boolean).join(', ') || sublet.location || 'Unknown location';
  const dateRange = (() => {
    const s = sublet.startDate ? formatDate(sublet.startDate) : '';
    const e = sublet.endDate ? formatDate(sublet.endDate) : '';
    if (s && e) return `${s} – ${e}`;
    if (s) return `From ${s}`;
    if (sublet.immediateAvailability) return 'Available now';
    return '';
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-100">
        <ListingCarousel
          id={sublet.id}
          images={sublet.images}
          sourceUrl={sublet.sourceUrl}
          photoCount={sublet.photoCount}
          aspectRatio="aspect-[4/3]"
        />
        {/* Unsave button */}
        <button
          onClick={(e) => { e.preventDefault(); onUnsave(); }}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
          title="Remove from saved"
        >
          <HeartIcon className="w-4 h-4 fill-red-500 text-red-500" />
        </button>
      </div>

      {/* Body */}
      <Link href={`/listing/${sublet.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{title}</p>
            {dateRange && (
              <p className="text-xs text-slate-500 mt-0.5">{dateRange}</p>
            )}
          </div>
          {sublet.price > 0 && (
            <p className="shrink-0 text-sm font-black text-slate-900">
              {formatPrice(sublet.price, sublet.currency ?? currency)}
              <span className="text-xs font-normal text-slate-400">/mo</span>
            </p>
          )}
        </div>
        {sublet.type && (
          <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {sublet.type}
          </span>
        )}
      </Link>
    </div>
  );
}

// ─── Page Content ─────────────────────────────────────────────────────────────

function SavedContent() {
  const { savedIds, toggle, isLoading: savedLoading } = useSaved();
  const [allListings, setAllListings] = useState<Sublet[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  // Fetch all listings once so we can filter by savedIds.
  useEffect(() => {
    persistenceService.fetchListings().then((data) => {
      setAllListings(data);
      setListingsLoading(false);
    });
  }, []);

  const savedListings = allListings.filter((s) => savedIds.has(s.id));
  const isLoading = savedLoading || listingsLoading;

  return (
    <div className="min-h-screen bg-[#f6f7f8]">
      <WebNavbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 md:pb-10">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Saved Listings</h1>
            <p className="text-slate-500 text-sm mt-1">Your shortlist — all in one place.</p>
          </div>
          {!isLoading && savedIds.size > 0 && (
            <span className="text-sm font-semibold text-slate-500">
              {savedIds.size} saved
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && savedListings.length === 0 && <EmptyState />}

        {/* Saved listings grid */}
        {!isLoading && savedListings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedListings.map((sublet) => (
              <SavedCard
                key={sublet.id}
                sublet={sublet}
                onUnsave={() => toggle(sublet.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function SavedPage() {
  return (
    <AuthGuard>
      <SavedContent />
    </AuthGuard>
  );
}
