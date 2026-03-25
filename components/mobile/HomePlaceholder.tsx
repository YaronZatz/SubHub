'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useSaved } from '@/contexts/SavedContext';
import { persistenceService } from '@/services/persistenceService';
import { formatPrice } from '@/utils/formatters';
import { Sublet, ListingStatus, CurrencyCode } from '@/types';
import ListingCarousel from '@/components/ListingCarousel';
import AuthModal from '@/components/shared/AuthModal';
import WebNavbar from '@/components/web/WebNavbar';

function getCardTitle(s: Sublet): string {
  const parts = [s.neighborhood, s.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : (s.location || 'Unknown location');
}

function addedAgo(createdAt: number): string {
  const h = Math.max(0, Math.floor((Date.now() - createdAt) / (60 * 60 * 1000)));
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d <= 1 ? '1d ago' : `${d}d ago`;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm animate-pulse shrink-0 w-64">
      <div className="aspect-[4/3] bg-slate-200 rounded-2xl" />
      <div className="px-2 pt-2 pb-1 space-y-1.5">
        <div className="h-4 bg-slate-200 rounded-full w-3/4" />
        <div className="h-3 bg-slate-100 rounded-full w-1/2" />
      </div>
    </div>
  );
}

export function MobileHomePlaceholder() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { currency } = useCurrency();
  const { savedIds, toggle: toggleSaved, showSignInModal, closeSignInModal } = useSaved();
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/map');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await persistenceService.fetchListings();
        setSublets(data);
      } catch (err) {
        console.error('Failed to load listings:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const recentSublets = sublets
    .filter(s => s.status !== ListingStatus.TAKEN)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(searchQuery.trim() ? `/map?q=${encodeURIComponent(searchQuery.trim())}` : '/map');
  };

  const handleSave = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSaved(id);
  };

  return (
    <div className="bg-slate-50 flex flex-col min-h-full">
      <WebNavbar />

      {/* Hero */}
      <div className="relative px-5 pt-6 pb-8 bg-gradient-to-b from-white to-slate-50">
        <div className="flex items-center gap-3 mb-5">
          <img src="/logo.png" alt="SubHub" className="h-12 w-auto mix-blend-multiply" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 leading-tight mb-1.5">
          Every rental post.{' '}
          <span className="text-[#2F6EA8]">One smart search.</span>
        </h1>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          Sublets, short stays & long-term rentals. All on one map.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search cities, neighborhoods..."
            className="w-full py-3.5 pl-11 pr-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#2F6EA8] focus:ring-3 focus:ring-[#2F6EA8]/10 transition-all shadow-sm"
          />
        </form>

        {/* Quick action buttons */}
        <div className="flex gap-3 mt-5">
          <Link
            href="/map"
            className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 bg-[#2F6EA8] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[#2F6EA8]/25 active:scale-[0.97] transition-all"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            View Map
          </Link>
          <button
            onClick={() => user ? router.push('/post') : setIsAuthModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 bg-[#F97316] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[#F97316]/25 active:scale-[0.97] transition-all"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Post Listing
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="px-5 py-4 bg-slate-900 flex items-center justify-between">
        <div className="text-center">
          <p className="text-[#F97316] text-lg font-black">12,470+</p>
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Posts</p>
        </div>
        <div className="w-px h-8 bg-slate-700" />
        <div className="text-center">
          <p className="text-[#F97316] text-lg font-black">10+</p>
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Cities</p>
        </div>
        <div className="w-px h-8 bg-slate-700" />
        <div className="text-center">
          <p className="text-[#F97316] text-lg font-black">Daily</p>
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Updated</p>
        </div>
      </div>

      {/* Recently Added */}
      <section className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Recently Added</h2>
          <Link href="/map" className="text-xs font-bold text-[#2F6EA8] active:opacity-70">
            View all →
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : recentSublets.length === 0 ? (
            <div className="w-full py-12 text-center">
              <p className="text-slate-400 text-sm font-medium">No listings yet</p>
            </div>
          ) : (
            recentSublets.map(s => {
              const isSaved = savedIds.has(s.id);
              const isNew = (Date.now() - s.createdAt) < 24 * 60 * 60 * 1000;

              return (
                <Link
                  key={s.id}
                  href={`/listing/${s.id}`}
                  className="shrink-0 w-64 snap-start rounded-2xl overflow-hidden bg-white shadow-sm active:shadow-md transition-all"
                >
                  <div className="relative">
                    <ListingCarousel
                      id={s.id}
                      images={s.images}
                      sourceUrl={s.sourceUrl}
                      photoCount={s.photoCount}
                      aspectRatio="aspect-[4/3]"
                    />
                    {isNew && (
                      <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 bg-cyan-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg ring-2 ring-cyan-100 pointer-events-none">
                        <span className="w-1 h-1 bg-white rounded-full" />
                        {addedAgo(s.createdAt)}
                      </div>
                    )}
                    <button
                      onClick={e => handleSave(e, s.id)}
                      className={`absolute top-2.5 right-2.5 z-30 w-8 h-8 rounded-full flex items-center justify-center transition-all min-h-[44px] min-w-[44px] -mt-2 -mr-2 ${
                        isSaved ? 'bg-white text-red-500 shadow-md' : 'bg-black/25 backdrop-blur-sm text-white'
                      }`}
                      aria-label={isSaved ? 'Unsave' : 'Save'}
                    >
                      <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                  <div className="px-2.5 pt-2 pb-2.5">
                    <p className="font-black text-slate-900 text-sm leading-none">
                      {formatPrice(s.price, currency as CurrencyCode, 'en-US', s.currency)}
                      <span className="text-slate-400 font-medium text-[11px] ml-1">/mo</span>
                    </p>
                    <p className="font-semibold text-slate-600 truncate text-xs mt-1">{getCardTitle(s)}</p>
                    {!isNew && (
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{addedAgo(s.createdAt)}</p>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* How it works — compact */}
      <section className="px-5 py-6">
        <h2 className="text-lg font-black text-slate-900 mb-4">How It Works</h2>
        <div className="space-y-3">
          {[
            { icon: '🔍', title: 'AI-powered search', desc: 'We scrape 100+ Facebook & WhatsApp groups and structure every post.' },
            { icon: '🗺️', title: 'One unified map', desc: 'Browse sublets, short stays and long-term rentals — all in one place.' },
            { icon: '⚡', title: 'Post in seconds', desc: 'Paste a URL or upload a screenshot. AI fills in the details.' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-slate-100">
              <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="px-5 pb-8">
        <Link
          href="/map"
          className="block w-full min-h-[48px] py-3.5 text-center bg-gradient-to-r from-[#2F6EA8] to-[#F97316] text-white rounded-2xl font-black text-sm shadow-lg active:scale-[0.97] transition-all"
        >
          Start Exploring →
        </Link>
      </div>

      {isAuthModalOpen && (
        <AuthModal
          reason="general"
          initialMode="signup"
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
      {showSignInModal && <AuthModal reason="save" initialMode="signup" onClose={closeSignInModal} />}
    </div>
  );
}
