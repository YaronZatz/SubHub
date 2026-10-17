'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import WebNavbar from '@/components/web/WebNavbar';
import HomeListingCard from '@/components/web/HomeListingCard';
import CityCarousel from '@/components/shared/CityCarousel';
import SiteFooter from '@/components/shared/SiteFooter';
import PostToListingSection from '@/components/shared/PostToListingSection';
import { useMapSearch } from '@/hooks/useMapSearch';
import { homeCopy } from '@/lib/homeCopy';
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

/** Decorative map card in the hero — links to the real map. */
function HeroMapCard({ label }: { label: string }) {
  const pin = 'absolute rounded-full bg-white px-2.5 py-1 text-[13px] font-bold tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.16)]';
  return (
    <Link
      href="/map"
      aria-label={label}
      className="relative block h-[380px] min-w-0 flex-[1_1_420px] overflow-hidden rounded-[20px] border border-brand-100 bg-[#F5F6F7] transition-shadow hover:shadow-[0_12px_32px_rgba(17,26,36,0.10)]"
    >
      <svg viewBox="0 0 560 380" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M0 0 L120 0 L95 120 L70 240 L40 380 L0 380 Z" className="fill-brand-200" />
        <rect x="300" y="40" width="110" height="70" rx="10" className="fill-brand-100" />
        <rect x="420" y="250" width="90" height="80" rx="10" className="fill-brand-100" />
        <g stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round">
          <path d="M160 0 L130 380" /><path d="M250 0 L235 380" /><path d="M370 0 L380 380" /><path d="M480 0 L520 380" />
          <path d="M110 80 L560 60" /><path d="M100 170 L560 165" /><path d="M85 260 L560 275" />
        </g>
        <g stroke="#fff" strokeWidth="4" fill="none">
          <path d="M200 0 L185 380" /><path d="M310 0 L305 380" /><path d="M430 0 L450 380" />
          <path d="M120 125 L560 115" /><path d="M95 215 L560 222" /><path d="M70 320 L560 330" />
        </g>
      </svg>
      <span className={pin} style={{ left: '26%', top: '18%' }} dir="ltr">₪4.5k</span>
      <span className={pin} style={{ left: '54%', top: '30%' }} dir="ltr">₪6.8k</span>
      <span className="absolute rounded-full bg-accent-500 px-3.5 py-1.5 text-[15px] font-bold tabular-nums text-accent-ink shadow-[0_6px_16px_rgba(0,0,0,0.2)]" style={{ left: '36%', top: '50%' }} dir="ltr">₪3.2k</span>
      <span className={pin} style={{ left: '70%', top: '62%' }} dir="ltr">₪9k</span>
      <span className="absolute rounded-full bg-brand-900 px-2.5 py-1 text-[13px] font-bold text-white" style={{ left: '22%', top: '74%' }}>12</span>
    </Link>
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
          <HeroMapCard label={copy.showOnMap} />
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
              title={city}
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
