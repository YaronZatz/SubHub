'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AuthModal from '@/components/AuthModal';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import WebNavbar from '@/components/web/WebNavbar';
import HomeListingCard from '@/components/web/HomeListingCard';
import { setInitialMapCity } from '@/app/map/page';
import { CITY_CENTERS } from '@/constants';
import { Sublet, Filters } from '@/types';

const FEATURED_CITIES = ['Tel Aviv', 'Berlin', 'London'];

const CITY_CHIP_CITIES = ['Tel Aviv', 'Berlin', 'London', 'Amsterdam', 'Paris', 'New York'];

interface WebHomePageProps {
  onPostClick?: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  cityFlyTo: { lat: number; lng: number; zoom?: number } | null;
  handleCityFlyTo: (city: string) => void;
  mapSelectedSubletId: string | undefined;
  setMapSelectedSubletId: (id: string | undefined) => void;
  filteredSublets: Sublet[];
  toggleSaved: (e: React.MouseEvent, id: string) => void;
  savedListingIds: Set<string>;
  activeFilterCount: number;
}

export function WebHomePage({
  searchQuery,
  setSearchQuery,
  handleCityFlyTo,
  filteredSublets,
  toggleSaved,
  savedListingIds,
  // kept for interface compatibility with app/page.tsx
  onPostClick: _onPostClick,
  filters: _filters,
  setFilters: _setFilters,
  cityFlyTo: _cityFlyTo,
  mapSelectedSubletId: _mapSelectedSubletId,
  setMapSelectedSubletId: _setMapSelectedSubletId,
  activeFilterCount: _activeFilterCount,
}: WebHomePageProps) {
  const { currency } = useCurrency();
  const { language } = useLanguage();
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const navigateToCity = (city: string) => {
    const center = CITY_CENTERS[city];
    if (center) setInitialMapCity(city, center);
    setSearchQuery(city);
    handleCityFlyTo(city);
    router.push('/map');
  };

  // Group listings by city, limited per city for the carousel
  const listingsByCity = FEATURED_CITIES.reduce<Record<string, Sublet[]>>((acc, city) => {
    acc[city] = filteredSublets
      .filter(s => s.city?.toLowerCase() === city.toLowerCase())
      .slice(0, 20);
    return acc;
  }, {});

  const activeCities = FEATURED_CITIES.filter(city => listingsByCity[city].length > 0);

  return (
    <div className="font-sans bg-[#f6f7f8] text-slate-900 min-h-screen">
      <WebNavbar />

      {/* Hero */}
      <header className="relative bg-[#0F172A] pt-20 pb-16 overflow-hidden">
        {/* Subtle gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#4A7CC7]/20 rounded-full blur-3xl -z-0 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#F5831F]/10 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          {/* AI pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A7CC7]/20 text-[#93bbf0] text-xs font-bold uppercase tracking-wider mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A7CC7] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4A7CC7]" />
            </span>
            AI-structured listings · Updated daily
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight mb-4">
            Find your next sublet.
          </h1>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Every rental post from Facebook groups — structured by AI, searchable on one map.
          </p>

          {/* Search bar */}
          <div className="relative z-20 max-w-2xl mx-auto">
            <SearchAutocomplete
              value={searchQuery}
              onChange={setSearchQuery}
              sublets={filteredSublets}
              onCitySelect={(city) => {
                setSearchQuery(city);
                handleCityFlyTo(city);
                router.push('/map');
              }}
              className="w-full"
              inputClassName="w-full py-4 px-5 bg-white rounded-2xl text-base font-medium focus:ring-4 focus:ring-[#4A7CC7]/30 outline-none border-2 border-transparent focus:border-[#4A7CC7] transition-all shadow-2xl"
              placeholder="Search cities, neighborhoods, streets..."
            />
          </div>

          {/* City chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {CITY_CHIP_CITIES.map(city => (
              <button
                key={city}
                onClick={() => navigateToCity(city)}
                className="px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors border border-white/10"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="bg-[#0F172A] border-t border-slate-800 py-5">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-12 text-sm font-medium">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[#F5831F] text-xl font-black">12,470+</span>
              posts aggregated
            </div>
            <div className="hidden sm:block w-px h-5 bg-slate-700" />
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[#F5831F] text-xl font-black">10+</span>
              major cities
            </div>
            <div className="hidden sm:block w-px h-5 bg-slate-700" />
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[#F5831F] text-xl font-black">Updated</span>
              daily
            </div>
          </div>
        </div>
      </div>

      {/* City listing rows */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
        {activeCities.length === 0 ? (
          /* Loading skeleton or empty state */
          <div className="text-center py-20 text-slate-400">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-lg font-semibold">Loading listings…</p>
          </div>
        ) : (
          activeCities.map(city => (
            <section key={city}>
              {/* Section header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-slate-900">
                  Listings in {city}
                  <span className="ml-2 text-base font-semibold text-slate-400">
                    ({listingsByCity[city].length}+)
                  </span>
                </h2>
                <button
                  onClick={() => navigateToCity(city)}
                  className="flex items-center gap-1 text-[#4A7CC7] text-sm font-bold hover:underline"
                >
                  See all
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>

              {/* Horizontal carousel */}
              <div className="flex overflow-x-auto gap-4 pb-3 -mx-4 px-4 scrollbar-hide">
                {listingsByCity[city].map(sublet => (
                  <HomeListingCard
                    key={sublet.id}
                    sublet={sublet}
                    isSaved={savedListingIds.has(sublet.id)}
                    onToggleSave={(e) => toggleSaved(e, sublet.id)}
                    currency={currency}
                    language={language}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-slate-300 py-16 mt-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <img src="/logo.png" alt="SubHub Logo" className="h-16 w-auto mix-blend-screen opacity-90" />
              </div>
              <p className="text-slate-500 leading-relaxed text-sm">
                Connecting people with the perfect home by bringing all fragmented rental posts into one unified platform.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Platform</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li><Link href="/map" className="text-slate-400 hover:text-white transition-colors">Search Map</Link></li>
                <li><Link href="/how-it-works" className="text-slate-400 hover:text-white transition-colors">How it Works</Link></li>
                <li><Link href="/map" className="text-slate-400 hover:text-white transition-colors">Post a Listing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Support</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li><Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/data-deletion" className="text-slate-400 hover:text-white transition-colors">Data Deletion</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Subscribe</h4>
              <p className="text-sm text-slate-400 mb-4">Get the latest rental tips and news.</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Enter email"
                  className="bg-slate-800/50 border border-slate-700 rounded-l-lg text-sm w-full focus:ring-1 focus:ring-[#4A7CC7] px-4 py-3 outline-none text-white placeholder-slate-500"
                />
                <button className="bg-[#4A7CC7] text-white px-5 py-3 rounded-r-lg hover:bg-[#4A7CC7]/90 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-500">
            <p>© 2026 SubHub Technologies Inc. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}
    </div>
  );
}
