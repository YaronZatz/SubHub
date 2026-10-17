'use client';

import React, { useState, useEffect } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import WebNavbar from '@/components/web/WebNavbar';
import MobileTabBar from '@/components/shared/MobileTabBar';
import HomeListingCard from '@/components/web/HomeListingCard';
import CityCarousel from '@/components/shared/CityCarousel';
import { useMapSearch } from '@/hooks/useMapSearch';
import { homeCopy } from '@/lib/homeCopy';
import { cityFor } from '@/lib/placeNames';
import { formatDateRange } from '@/lib/dateWindow';
import { persistenceService } from '@/services/persistenceService';
import { Sublet, Filters } from '@/types';

const FEATURED_CITIES = ['Tel Aviv', 'Berlin', 'London'];
/** Cities that have a /city/[slug] page. */
const CITY_PAGE_SLUG: Record<string, string> = { 'Tel Aviv': 'tel-aviv' };

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

function CardSkeleton() {
  return (
    <div className="w-[220px] shrink-0 animate-pulse overflow-hidden rounded-2xl border border-line bg-white">
      <div className="h-[130px] bg-brand-50" />
      <div className="space-y-2 p-3">
        <div className="flex justify-between gap-2">
          <div className="h-4 w-16 rounded bg-brand-50" />
          <div className="h-4 w-12 rounded bg-brand-50" />
        </div>
        <div className="h-3.5 w-28 rounded bg-brand-50" />
        <div className="h-1.5 w-full rounded bg-brand-50" />
      </div>
    </div>
  );
}

export function MobileHomePage({
  searchQuery,
  setSearchQuery,
  toggleSaved,
  savedListingIds,
  onPostClick,
}: MobileHomePageProps) {
  const { currency } = useCurrency();
  const { language } = useLanguage();
  const copy = homeCopy(language);
  const { openCity, search } = useMapSearch();
  const [listingsByCity, setListingsByCity] = useState<Record<string, Sublet[]>>({});
  const [loading, setLoading] = useState(true);
  const [openPanel, setOpenPanel] = useState<'dates' | 'budget' | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');

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

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const maxPrice = Number(budget);
    search(searchQuery, {
      ...(startDate && endDate ? { startDate, endDate } : {}),
      ...(maxPrice > 0 ? { maxPrice } : {}),
    });
  };

  const activeCities = loading ? FEATURED_CITIES : FEATURED_CITIES.filter(city => (listingsByCity[city]?.length ?? 0) > 0);
  const datesLabel = (startDate && endDate && formatDateRange(startDate, endDate, language)) || copy.anyDates;
  const budgetLabel = Number(budget) > 0 ? `≤ ${Number(budget).toLocaleString(language === 'he' ? 'he' : 'en')}` : copy.anyBudget;
  const toggleBtn = (active: boolean) =>
    `h-10 flex-1 rounded-[10px] border text-[13px] font-medium transition-colors ${
      active ? 'border-brand-600 bg-brand-100 text-brand-700' : 'border-line bg-white text-ink'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-ink">
      <WebNavbar />

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Hero + search */}
        <div className="flex flex-col gap-3.5 bg-brand-50 px-4 pb-5 pt-4">
          <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em]">
            {copy.headlineMobileLead}{' '}
            <span className="text-brand-600 [box-shadow:inset_0_-8px_0_var(--color-accent-100)]">{copy.headlineMobileAccent}</span>
          </h1>

          <form onSubmit={submitSearch} className="flex flex-col gap-2">
            <div className="flex min-h-14 items-center gap-2 rounded-[14px] border border-line bg-white py-2 pe-2 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
              <SearchAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                sublets={[]}
                onCitySelect={(city) => search(city)}
                className="min-w-0 flex-1"
                inputClassName="w-full border-0 bg-transparent py-1 text-[15px] font-medium text-ink outline-none placeholder:text-muted/70"
                placeholder={copy.searchPlaceholderShort}
              />
              <button type="submit" className="h-10 shrink-0 rounded-[10px] bg-brand-600 px-3.5 text-sm font-semibold text-white">
                {copy.search}
              </button>
            </div>

            <div className="flex gap-2">
              <button type="button" aria-expanded={openPanel === 'dates'} onClick={() => setOpenPanel(p => (p === 'dates' ? null : 'dates'))} className={toggleBtn(openPanel === 'dates' || !!(startDate && endDate))}>
                {datesLabel}
              </button>
              <button type="button" aria-expanded={openPanel === 'budget'} onClick={() => setOpenPanel(p => (p === 'budget' ? null : 'budget'))} className={toggleBtn(openPanel === 'budget' || Number(budget) > 0)}>
                {budgetLabel}
              </button>
            </div>

            {openPanel === 'dates' && (
              <div className="flex items-center gap-2 rounded-[10px] border border-line bg-white p-2">
                <input type="date" aria-label={copy.whenLabel} value={startDate} onChange={e => setStartDate(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                <span className="text-muted" aria-hidden="true">→</span>
                <input type="date" aria-label={copy.whenLabel} value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </div>
            )}
            {openPanel === 'budget' && (
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                aria-label={copy.budgetLabel}
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder={copy.budgetLabel}
                className="h-11 rounded-[10px] border border-line bg-white px-3 text-sm outline-none focus:border-brand-600"
              />
            )}
          </form>
        </div>

        {/* City carousels */}
        <main className="flex flex-col gap-6 px-4 pt-5">
          {activeCities.map(city => {
            const listings = listingsByCity[city] ?? [];
            return (
              <CityCarousel
                key={city}
                size="md"
                title={cityFor(city, language) ?? city}
                titleHref={CITY_PAGE_SLUG[city] ? `/city/${CITY_PAGE_SLUG[city]}` : undefined}
                countLabel={!loading && listings.length > 0 ? String(listings.length >= 20 ? '20+' : listings.length) : undefined}
                seeAllLabel={copy.seeAll}
                onSeeAll={() => openCity(city)}
                prevLabel={copy.previous}
                nextLabel={copy.next}
              >
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
                  : listings.map(sublet => (
                      <HomeListingCard
                        key={sublet.id}
                        size="md"
                        sublet={sublet}
                        isSaved={savedListingIds.has(sublet.id)}
                        onToggleSave={(e) => toggleSaved(e, sublet.id)}
                        currency={currency}
                        language={language}
                      />
                    ))}
              </CityCarousel>
            );
          })}
        </main>
      </div>

      {/* Tab bar — WebNavbar skips it on the home route, so we render it here */}
      <MobileTabBar variant="fixed" onPostClick={onPostClick} />
    </div>
  );
}
