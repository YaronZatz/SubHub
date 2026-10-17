'use client';

import React, { useState, useEffect } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import WebNavbar from '@/components/web/WebNavbar';
import HomeListingCard from '@/components/web/HomeListingCard';
import CityCarousel from '@/components/shared/CityCarousel';
import SiteFooter from '@/components/shared/SiteFooter';
import PostToListingSection from '@/components/shared/PostToListingSection';
import HeroMapCard from '@/components/shared/HeroMapCard';
import { useMapSearch } from '@/hooks/useMapSearch';
import { homeCopy } from '@/lib/homeCopy';
import { cityFor } from '@/lib/placeNames';
import { persistenceService } from '@/services/persistenceService';
import { Sublet, Filters } from '@/types';

const FEATURED_CITIES = ['Tel Aviv', 'Berlin', 'London'];
/** Cities that have a /city/[slug] page. */
const CITY_PAGE_SLUG: Record<string, string> = { 'Tel Aviv': 'tel-aviv' };

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

function CardSkeleton() {
  return (
    <div className="w-[272px] shrink-0 animate-pulse overflow-hidden rounded-2xl border border-line bg-white">
      <div className="aspect-[4/3] bg-brand-50" />
      <div className="space-y-2.5 p-4">
        <div className="flex justify-between gap-2">
          <div className="h-4 w-20 rounded bg-brand-50" />
          <div className="h-4 w-14 rounded bg-brand-50" />
        </div>
        <div className="h-4 w-32 rounded bg-brand-50" />
        <div className="h-1.5 w-full rounded bg-brand-50" />
      </div>
    </div>
  );
}

export function WebHomePage({
  searchQuery,
  setSearchQuery,
  toggleSaved,
  savedListingIds,
}: WebHomePageProps) {
  const { currency } = useCurrency();
  const { language } = useLanguage();
  const copy = homeCopy(language);
  const { openCity, search } = useMapSearch();
  const [listingsByCity, setListingsByCity] = useState<Record<string, Sublet[]>>({});
  const [loading, setLoading] = useState(true);
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
  const fieldLabel = 'text-xs font-medium uppercase tracking-[0.06em] text-muted';
  const fieldInput = 'w-full border-0 bg-transparent p-0 text-[17px] font-medium text-ink outline-none placeholder:text-muted/70';

  return (
    <div className="min-h-screen bg-white font-sans text-ink">
      <WebNavbar />

      {/* Hero */}
      <section className="bg-brand-50">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-6 pt-10">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-5">
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-brand-100 bg-white px-3 py-1 text-[13px] font-medium text-muted">
              <span className="h-2 w-2 rounded-full bg-accent-500" />
              {copy.badge}
            </span>
            <h1 className="font-display text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] lg:text-[66px]">
              {copy.headlineLead}{' '}
              <span className="text-brand-600 [box-shadow:inset_0_-12px_0_var(--color-accent-100)]">{copy.headlineAccent}</span>
            </h1>
            <p className="max-w-[520px] text-[19px] text-muted">{copy.subhead}</p>
          </div>
          <HeroMapCard label={copy.showOnMap} className="h-[380px] flex-[1_1_420px]" />
        </div>

        {/* Search — overlaps the hero edge */}
        <div className="relative top-9 mx-auto max-w-[1200px] px-6 pt-10">
          <form
            onSubmit={submitSearch}
            className="relative flex flex-wrap items-stretch rounded-2xl border border-line bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
          >
            <div className="flex min-w-0 flex-[3_1_320px] flex-col gap-0.5 border-line px-5 py-3.5 sm:border-e">
              <span className={`${fieldLabel} ps-10`} aria-hidden="true">{copy.searchLabel}</span>
              <SearchAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                sublets={[]}
                onCitySelect={(city) => search(city)}
                className="w-full"
                inputClassName={`${fieldInput} py-0.5`}
                placeholder={copy.searchPlaceholder}
              />
            </div>
            <div className="flex min-w-0 flex-[2_1_300px] flex-col gap-0.5 border-line px-5 py-3.5 sm:border-e">
              <span className={fieldLabel}>{copy.whenLabel}</span>
              <div className="flex items-center gap-2">
                <input type="date" aria-label={copy.whenLabel} value={startDate} onChange={e => setStartDate(e.target.value)} className={`${fieldInput} min-w-0 flex-1 text-[15px]`} />
                <span className="text-muted" aria-hidden="true">→</span>
                <input type="date" aria-label={copy.whenLabel} value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} className={`${fieldInput} min-w-0 flex-1 text-[15px]`} />
              </div>
            </div>
            <label className="flex min-w-0 flex-[1_1_150px] flex-col gap-0.5 px-5 py-3.5">
              <span className={fieldLabel}>{copy.budgetLabel}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder={copy.budgetPlaceholder}
                className={fieldInput}
              />
            </label>
            <div className="flex p-2.5">
              <button
                type="submit"
                className="flex min-h-14 items-center gap-2.5 rounded-xl bg-brand-600 px-7 text-base font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                {copy.showOnMap}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* City carousels */}
      <main className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 pb-14 pt-[88px]">
        {activeCities.map(city => {
          const listings = listingsByCity[city] ?? [];
          return (
            <CityCarousel
              key={city}
              title={cityFor(city, language) ?? city}
              titleHref={CITY_PAGE_SLUG[city] ? `/city/${CITY_PAGE_SLUG[city]}` : undefined}
              countLabel={!loading && listings.length > 0 ? copy.listingsCount(listings.length) : undefined}
              seeAllLabel={copy.seeAllOnMap}
              onSeeAll={() => openCity(city)}
              prevLabel={copy.previous}
              nextLabel={copy.next}
              showArrows
            >
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
                : listings.map(sublet => (
                    <HomeListingCard
                      key={sublet.id}
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

      {/* How it works */}
      <PostToListingSection />

      <SiteFooter />
    </div>
  );
}
