'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import WebNavbar from '@/components/web/WebNavbar';
import MobileTabBar from '@/components/shared/MobileTabBar';
import HomeListingCard from '@/components/web/HomeListingCard';
import { setInitialMapCity } from '@/app/map/page';
import { setInitialMobileMapCity } from '@/components/mobile/MapScreen';
import { CITY_CENTERS } from '@/constants';
import { persistenceService } from '@/services/persistenceService';
import { Sublet, Filters } from '@/types';

const FEATURED_CITIES = ['Tel Aviv', 'Berlin', 'London'];
const CITY_CHIP_CITIES = ['Tel Aviv', 'Berlin', 'London', 'Amsterdam', 'Paris'];

interface MobileHomePageProps {
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

export function MobileHomePage({
  searchQuery,
  setSearchQuery,
  handleCityFlyTo,
  filteredSublets,
  toggleSaved,
  savedListingIds,
  onPostClick,
  filters: _filters,
  setFilters: _setFilters,
  cityFlyTo: _cityFlyTo,
  mapSelectedSubletId: _mapSelectedSubletId,
  setMapSelectedSubletId: _setMapSelectedSubletId,
  activeFilterCount: _activeFilterCount,
}: MobileHomePageProps) {
  const { currency } = useCurrency();
  const { language } = useLanguage();
  const router = useRouter();
  const [listingsByCity, setListingsByCity] = useState<Record<string, Sublet[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      FEATURED_CITIES.map(city =>
        persistenceService.fetchListingsByCity(city, 20).then(listings => ({ city, listings }))
      )
    ).then(results => {
      const map: Record<string, Sublet[]> = {};
      results.forEach(({ city, listings }) => { map[city] = listings; });
      setListingsByCity(map);
      setLoading(false);
    });
  }, []);

  const navigateToCity = (city: string) => {
    const center = CITY_CENTERS[city];
    if (center) {
      setInitialMapCity(city, center);       // web map
      setInitialMobileMapCity(city, center); // mobile map
    }
    setSearchQuery(city);
    handleCityFlyTo(city);
    router.push('/map');
  };

  const activeCities = loading ? FEATURED_CITIES : FEATURED_CITIES.filter(city => (listingsByCity[city]?.length ?? 0) > 0);

  return (
    <div className="font-sans bg-[#f6f7f8] text-slate-900 min-h-screen flex flex-col">
      {/* Existing sticky navbar (logo + auth + currency/language) */}
      <WebNavbar />

      {/* Scrollable content — padded for fixed tab bar */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* Search hero */}
        <div className="bg-[#0F172A] px-4 pt-6 pb-8">
          <h1 className="text-2xl font-black text-white text-center mb-1">
            Find your next sublet.
          </h1>
          <p className="text-slate-400 text-xs text-center mb-5">
            AI-structured listings from Facebook groups.
          </p>

          <SearchAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            sublets={[]}
            onCitySelect={(city) => {
              setSearchQuery(city);
              handleCityFlyTo(city);
              router.push('/map');
            }}
            className="w-full"
            inputClassName="w-full py-3.5 px-4 bg-white rounded-2xl text-sm font-medium focus:ring-4 focus:ring-[#4A7CC7]/30 outline-none border-2 border-transparent focus:border-[#4A7CC7] transition-all shadow-xl"
            placeholder="Search cities, neighborhoods..."
          />

          {/* City chips */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {CITY_CHIP_CITIES.map(city => (
              <button
                key={city}
                onClick={() => navigateToCity(city)}
                className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 active:bg-white/30 transition-colors border border-white/10"
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="bg-[#0F172A] border-t border-slate-800 py-3 px-4">
          <div className="flex justify-center items-center gap-5 text-xs font-medium text-slate-400">
            <span><span className="text-[#F5831F] font-black">12,470+</span> posts</span>
            <span className="w-px h-4 bg-slate-700" />
            <span><span className="text-[#F5831F] font-black">10+</span> cities</span>
            <span className="w-px h-4 bg-slate-700" />
            <span className="text-[#F5831F] font-black">Daily</span>
          </div>
        </div>

        {/* City listing rows */}
        <main className="px-4 py-8 space-y-10">
          {activeCities.map(city => (
            <section key={city}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-black text-slate-900">
                  {city}
                  {!loading && (listingsByCity[city]?.length ?? 0) > 0 && (
                    <span className="ml-1.5 text-sm font-semibold text-slate-400">
                      ({listingsByCity[city].length}+)
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => navigateToCity(city)}
                  className="flex items-center gap-1 text-[#4A7CC7] text-xs font-bold"
                >
                  See all
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>

              <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-56 shrink-0 rounded-2xl overflow-hidden bg-white shadow-md animate-pulse">
                        <div className="h-36 bg-slate-200" />
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between gap-2">
                            <div className="h-4 w-16 bg-slate-200 rounded-full" />
                            <div className="h-4 w-12 bg-slate-200 rounded-full" />
                          </div>
                          <div className="h-3 w-36 bg-slate-200 rounded" />
                          <div className="h-3 w-24 bg-slate-200 rounded" />
                        </div>
                      </div>
                    ))
                  : (listingsByCity[city] ?? []).map(sublet => (
                      <HomeListingCard
                        key={sublet.id}
                        sublet={sublet}
                        isSaved={savedListingIds.has(sublet.id)}
                        onToggleSave={(e) => toggleSaved(e, sublet.id)}
                        currency={currency}
                        language={language}
                      />
                    ))
                }
              </div>
            </section>
          ))}
        </main>
      </div>

      {/* Tab bar — WebNavbar skips it on the home route, so we render it here */}
      <MobileTabBar variant="fixed" onPostClick={onPostClick} />
    </div>
  );
}
