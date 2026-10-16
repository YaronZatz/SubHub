'use client';

import React, {
  useState, useMemo, useEffect, useRef, useCallback,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import PlatformWrapper from '@/components/shared/PlatformWrapper';
import MapScreen from '@/components/mobile/MapScreen';
import ListingCarousel from '@/components/ListingCarousel';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import AuthModal from '@/components/shared/AuthModal';
import Toast from '@/components/shared/Toast';
import { persistenceService } from '@/services/persistenceService';
import { useAuth } from '@/contexts/AuthContext';
import { useSaved } from '@/contexts/SavedContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/translations';
import { formatPrice, formatDate } from '@/utils/formatters';
import {
  Sublet, Filters, ListingStatus, SubletType,
  DateMode, RentTerm, Language,
} from '@/types';
import { CITY_CENTERS } from '@/constants';
import { matchesFreeText } from '@/lib/searchMatch';
import { homeCopy } from '@/lib/homeCopy';
import { formatDateRange, timelineWindow } from '@/lib/dateWindow';

const MapVisualizer = dynamic(
  () => import('@/components/MapVisualizer'),
  { ssr: false },
);

// ─── Constants ────────────────────────────────────────────────────────────────

const SHORT_TERM_DAYS = 183;

const INITIAL_FILTERS: Filters = {
  minPrice: 0,
  maxPrice: 30000,
  showTaken: false,
  type: undefined,
  city: '',
  neighborhood: '',
  startDate: '',
  endDate: '',
  dateMode: DateMode.FLEXIBLE,
  petsAllowed: false,
  onlyWithPrice: true,
  rentTerm: RentTerm.ALL,
  postedWithin: 'all',
  minRooms: undefined,
  maxRooms: undefined,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getListingDurationDays(s: Sublet): number | null {
  const start = s.startDate && /^\d{4}-\d{2}-\d{2}$/.test(s.startDate)
    ? new Date(s.startDate).getTime() : null;
  const end = s.endDate && /^\d{4}-\d{2}-\d{2}$/.test(s.endDate)
    ? new Date(s.endDate).getTime() : null;
  if (start != null && end != null && end >= start)
    return Math.round((end - start) / (24 * 60 * 60 * 1000));
  return null;
}

function getBedroomCount(s: Sublet): number | null {
  return s.parsedRooms?.bedrooms ?? s.rooms?.bedrooms ?? null;
}

function getCardTitle(s: Sublet): string {
  const parts = [s.neighborhood, s.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : (s.location || 'Unknown location');
}

function getDateRange(s: Sublet): string {
  const start = s.startDate ? formatDate(s.startDate) : '';
  const end = s.endDate ? formatDate(s.endDate) : '';
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (s.immediateAvailability) return 'Available now';
  return '';
}

// ─── Price Slider (dual-thumb) ────────────────────────────────────────────────

const PRICE_MAX = 30000;
const PRICE_STEP = 1000;
const AMENITY_FILTER_KEYS: Array<keyof NonNullable<Filters['amenities']>> = [
  'furnished', 'wifi', 'ac', 'washer', 'petFriendly', 'parking', 'kitchen', 'balcony',
];

function PriceSlider({ minVal, maxVal, onChange }: {
  minVal: number; maxVal: number; onChange: (min: number, max: number) => void;
}) {
  const minPct = (minVal / PRICE_MAX) * 100;
  const maxPct = (maxVal / PRICE_MAX) * 100;
  const inputCls = [
    'absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer pointer-events-none',
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none',
    '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full',
    '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-600',
    '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-runnable-track]:bg-transparent',
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5',
    '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2',
    '[&::-moz-range-thumb]:border-brand-600 [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent',
  ].join(' ');
  return (
    <div className="relative h-5 mt-2">
      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-brand-100 rounded-full pointer-events-none">
        <div className="absolute h-full bg-brand-600 rounded-full" style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }} />
      </div>
      <input type="range" min={0} max={PRICE_MAX} step={PRICE_STEP} value={minVal}
        onChange={e => { const v = +e.target.value; if (v < maxVal) onChange(v, maxVal); }}
        className={inputCls} />
      <input type="range" min={0} max={PRICE_MAX} step={PRICE_STEP} value={maxVal}
        onChange={e => { const v = +e.target.value; if (v > minVal) onChange(minVal, v); }}
        className={inputCls} />
    </div>
  );
}

// ─── Filters Drawer ────────────────────────────────────────────────────────────

function FiltersDrawer({ open, onClose, filters, onFiltersChange, onClear, resultCount }: {
  open: boolean; onClose: () => void; filters: Filters;
  onFiltersChange: (f: Filters) => void; onClear: () => void; resultCount: number;
}) {
  const { language } = useLanguage();
  const t = translations[language];
  const set = useCallback(
    (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch }),
    [filters, onFiltersChange],
  );
  const setAmenity = useCallback(
    (key: keyof NonNullable<Filters['amenities']>, val: boolean) =>
      onFiltersChange({ ...filters, amenities: { ...filters.amenities, [key]: val } }),
    [filters, onFiltersChange],
  );

  const sLabel = 'text-xs font-semibold uppercase tracking-[0.06em] text-muted';
  const iconBtnCls = (active: boolean) =>
    `flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors cursor-pointer select-none ${
      active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line text-ink hover:border-brand-200'
    }`;
  const pillCls = (active: boolean) =>
    `whitespace-nowrap h-9 px-3.5 rounded-full border text-[13px] font-medium transition-colors shrink-0 ${
      active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink hover:border-brand-200'
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 bg-ink/40 z-[55]" onClick={onClose} />}
      <aside aria-hidden={!open} className={`fixed top-0 end-0 bottom-0 z-[60] w-[440px] max-w-full bg-white shadow-[0_0_40px_rgba(17,26,36,0.18)] flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}`}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-line flex items-center justify-between shrink-0">
          <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink">{t.filters}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-brand-50 hover:text-ink transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8" style={{ scrollbarWidth: 'none' }}>

          {/* Price Range */}
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <span className={sLabel}>{t.priceRange}</span>
              <span className="text-sm font-semibold tabular-nums text-brand-700">
                ₪{filters.minPrice.toLocaleString()} — {filters.maxPrice >= PRICE_MAX ? '₪30k+' : `₪${filters.maxPrice.toLocaleString()}`}
              </span>
            </div>
            <PriceSlider minVal={filters.minPrice} maxVal={filters.maxPrice} onChange={(min, max) => set({ minPrice: min, maxPrice: max })} />
          </section>

          {/* Rental Duration */}
          <section className="space-y-4">
            <span className={sLabel}>{t.rentTermLabel}</span>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: RentTerm.ALL, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
                { value: RentTerm.SHORT_TERM, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                { value: RentTerm.LONG_TERM, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
              ] as const).map(opt => (
                <button key={opt.value} onClick={() => set({ rentTerm: opt.value })} className={iconBtnCls((filters.rentTerm ?? RentTerm.ALL) === opt.value)}>
                  {opt.icon}<span className="text-xs font-semibold">{t.rentTerms[opt.value]}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Property Type */}
          <section className="space-y-4">
            <span className={sLabel}>{t.type}</span>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: SubletType.ENTIRE, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
                { value: SubletType.ROOMMATE, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                { value: SubletType.STUDIO, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg> },
              ] as const).map(opt => (
                <button key={opt.value} onClick={() => set({ type: filters.type === opt.value ? undefined : opt.value })} className={iconBtnCls(filters.type === opt.value)}>
                  {opt.icon}<span className="text-xs font-semibold">{t.subletTypes[opt.value]}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Bedrooms */}
          <section className="space-y-4">
            <span className={sLabel}>{t.bedrooms}</span>
            <div className="flex gap-2 flex-wrap">
              {([{ label: t.anyRooms, value: undefined as number | undefined }, { label: '1+', value: 1 }, { label: '2+', value: 2 }, { label: '3+', value: 3 }, { label: '4+', value: 4 }]).map(opt => (
                <button key={opt.label} onClick={() => set({ minRooms: opt.value })}
                  className={`h-10 px-4 rounded-full text-sm font-medium border transition-colors ${filters.minRooms === opt.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line text-ink hover:border-brand-200'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Move-in Date */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={sLabel}>{t.moveInDate}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-medium">{t.flexible}</span>
                <button
                  onClick={() => set({ dateMode: filters.dateMode === DateMode.FLEXIBLE ? DateMode.EXACT : DateMode.FLEXIBLE })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${filters.dateMode === DateMode.FLEXIBLE ? 'bg-brand-600' : 'bg-line'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${filters.dateMode === DateMode.FLEXIBLE ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-line focus-within:border-brand-600 transition-colors">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted mb-1">{t.start}</p>
                <input type="date" value={filters.startDate || ''} onChange={e => set({ startDate: e.target.value })}
                  className="bg-transparent border-none p-0 text-sm font-medium text-ink outline-none w-full" />
              </div>
              <div className="p-3 rounded-xl border border-line focus-within:border-brand-600 transition-colors">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted mb-1">{t.end}</p>
                <input type="date" value={filters.endDate || ''} onChange={e => set({ endDate: e.target.value })}
                  className="bg-transparent border-none p-0 text-sm font-medium text-ink outline-none w-full" />
              </div>
            </div>
          </section>

          {/* Posted Within */}
          <section className="space-y-4">
            <span className={sLabel}>{t.postedWithin}</span>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {([{ label: t.postedWithinAll, value: 'all' }, { label: t.postedWithin1h, value: '1h' }, { label: t.postedWithin24h, value: '24h' }, { label: t.postedWithin7d, value: '7d' }, { label: t.postedWithin30d, value: '30d' }]).map(opt => (
                <button key={opt.value} onClick={() => set({ postedWithin: opt.value })} className={pillCls((filters.postedWithin ?? 'all') === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Post Quality */}
          <section className="space-y-4">
            <span className={sLabel}>{t.postQuality}</span>
            <button onClick={() => set({ onlyWithPrice: !filters.onlyWithPrice })}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-colors w-full ${filters.onlyWithPrice ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line text-ink hover:border-brand-200'}`}>
              {t.onlyWithPrice}
            </button>
          </section>

          {/* Amenities */}
          <section className="space-y-4">
            <span className={sLabel}>{t.amenities}</span>
            <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
              {([
                { key: 'furnished', label: t.amenityFurnished }, { key: 'wifi', label: t.amenityWifi },
                { key: 'washer', label: t.amenityWasher }, { key: 'ac', label: t.amenityAC },
                { key: 'petFriendly', label: t.amenityPetFriendly }, { key: 'parking', label: t.amenityParking },
                { key: 'kitchen', label: t.amenityKitchen }, { key: 'balcony', label: t.amenityBalcony },
              ] as Array<{ key: keyof NonNullable<Filters['amenities']>; label: string }>).map(opt => (
                <label key={opt.key} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={!!(filters.amenities?.[opt.key])} onChange={e => setAmenity(opt.key, e.target.checked)}
                    className="w-5 h-5 rounded border-line accent-brand-600 cursor-pointer" />
                  <span className="text-sm text-ink group-hover:text-brand-700 transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-line flex items-center justify-between shrink-0">
          <button onClick={onClear} className="text-sm font-semibold text-muted underline-offset-2 hover:text-ink hover:underline transition-colors">
            {t.clearAll}
          </button>
          <button onClick={onClose} className="flex h-12 items-center gap-2 px-6 bg-brand-600 text-white rounded-xl font-semibold text-[15px] hover:bg-brand-700 transition-colors">
            {t.showResults.replace('{n}', resultCount.toLocaleString())}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

let _pendingWebMapState: WebMapSavedState | null = null;

/** Call before router.push('/map') to pre-seed search + map position for a city. */
export function setInitialMapCity(city: string, center: { lat: number; lng: number; zoom?: number }) {
  _pendingWebMapState = {
    filters: { ...INITIAL_FILTERS, city },
    searchQuery: city,
    selectedSubletId: undefined,
    cityFlyTo: center,
  };
}

/** Call before router.push('/map') to pre-seed a free-text search with optional dates / budget. */
export function setInitialMapSearch(
  query: string,
  extra: Partial<Pick<Filters, 'startDate' | 'endDate' | 'maxPrice'>> = {},
  center: { lat: number; lng: number; zoom?: number } | null = null,
) {
  _pendingWebMapState = {
    filters: { ...INITIAL_FILTERS, ...extra },
    searchQuery: query,
    selectedSubletId: undefined,
    cityFlyTo: center,
  };
}

interface WebMapSavedState {
  filters: Filters;
  searchQuery: string;
  selectedSubletId: string | undefined;
  cityFlyTo: { lat: number; lng: number; zoom?: number } | null;
}

interface ListingCardProps {
  sublet: Sublet;
  isSelected: boolean;
  isSaved: boolean;
  currency: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onSave: (e: React.MouseEvent) => void;
  onNavigate: () => void;
}

const ListingCard = React.forwardRef<HTMLDivElement, ListingCardProps>(
  ({ sublet: s, isSelected, isSaved, currency, onMouseEnter, onMouseLeave, onSave, onNavigate }, ref) => {
    const { language } = useLanguage();
    const t = translations[language];
    const copy = homeCopy(language);
    const beds = getBedroomCount(s);
    const dateRange = formatDateRange(s.startDate, s.endDate, language)
      ?? (s.immediateAvailability ? copy.availableNow : null);
    const timeline = timelineWindow(s.startDate, s.endDate, language);
    const isTaken = s.status === ListingStatus.TAKEN;
    const postTs = s.postedAt ? (new Date(s.postedAt).getTime() || s.createdAt) : s.createdAt;
    const hoursAgo = Math.max(0, Math.floor((Date.now() - postTs) / (60 * 60 * 1000)));
    const daysAgo = Math.max(1, Math.floor(hoursAgo / 24));
    const isNew = hoursAgo < 24;
    const typeLabel = t.subletTypes[s.type];

    return (
      <div
        ref={ref}
        className={`group relative overflow-hidden rounded-2xl border bg-white transition-shadow ${
          isSelected ? 'border-accent-500 ring-2 ring-accent-500' : 'border-line hover:shadow-[0_8px_24px_rgba(17,26,36,0.10)]'
        } ${isTaken ? 'opacity-60' : ''}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Link href={`/listing/${s.id}`} className="block" onClick={onNavigate}>
          <div className="relative aspect-[4/3] overflow-hidden">
            <ListingCarousel
              id={s.id}
              images={s.images}
              sourceUrl={s.sourceUrl}
              photoCount={s.photoCount}
              aspectRatio="aspect-[4/3]"
            />
            <span
              className={`pointer-events-none absolute start-2.5 top-2.5 z-20 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isNew ? 'bg-accent-100 text-accent-700' : 'bg-white text-ink'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isNew ? 'bg-accent-500' : 'bg-brand-200'}`} />
              {isNew
                ? t.addedXhAgo.replace('{x}', String(hoursAgo))
                : t.addedXdAgo.replace('{x}', String(daysAgo > 30 ? '30+' : daysAgo))}
            </span>
            {isTaken && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-ink/40">
                <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-ink">{copy.taken}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-3">
            <div className="flex items-center justify-between gap-2">
              {typeLabel && (
                <span className="truncate rounded-md bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">{typeLabel}</span>
              )}
              {s.price > 0 ? (
                <span className="shrink-0 text-[17px] font-bold tabular-nums text-ink">
                  {formatPrice(s.price, currency as import('@/types').CurrencyCode, language, s.currency)}
                  <span className="ms-0.5 text-xs font-normal text-muted">{copy.perMonth}</span>
                </span>
              ) : (
                <span className="shrink-0 text-xs text-muted">{copy.priceOnRequest}</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-[17px] font-bold tracking-tight text-ink">{getCardTitle(s)}</h3>
              {beds !== null && <p className="text-[13px] text-muted">{copy.bedroomsShort(beds)}</p>}
            </div>
            {dateRange && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink">{dateRange}</span>
                {timeline && (
                  <div className="relative h-1.5 rounded-full bg-brand-100" aria-hidden="true">
                    <div className="absolute inset-y-0 rounded-full bg-brand-600" style={{ insetInlineStart: `${timeline.left}%`, width: `${timeline.width}%` }} />
                  </div>
                )}
              </div>
            )}
          </div>
        </Link>

        <button
          onClick={onSave}
          className={`absolute end-2 top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white transition-colors ${
            isSaved ? 'text-accent-600' : 'text-ink hover:text-accent-600'
          }`}
          aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
        >
          <svg className="h-[18px] w-[18px]" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    );
  },
);

ListingCard.displayName = 'ListingCard';

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-line bg-white">
      <div className="aspect-[4/3] bg-brand-50" />
      <div className="space-y-2 p-3.5">
        <div className="h-4 w-3/4 rounded bg-brand-50" />
        <div className="h-3 w-1/2 rounded bg-brand-50" />
      </div>
    </div>
  );
}

// ─── Map Page ─────────────────────────────────────────────────────────────────

function WebMapPage() {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { language } = useLanguage();
  const t = translations[language];
  const copy = homeCopy(language);

  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'priceAsc' | 'priceDesc'>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(() => _pendingWebMapState?.filters ?? INITIAL_FILTERS);
  const [searchQuery, setSearchQuery] = useState(() => _pendingWebMapState?.searchQuery ?? '');
  const [selectedSubletId, setSelectedSubletId] = useState<string | undefined>(() => _pendingWebMapState?.selectedSubletId);
  const [cityFlyTo, setCityFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(() => _pendingWebMapState?.cityFlyTo ?? null);
  const { savedIds: savedListingIds, toggle: toggleSavedById, showSignInModal: savedAuthModal, closeSignInModal: closeSavedAuthModal } = useSaved();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Clear pending state after mount — timeout survives Strict Mode's unmount/remount
  useEffect(() => {
    const t = setTimeout(() => { _pendingWebMapState = null; }, 200);
    return () => clearTimeout(t);
  }, []);

  // Load listings
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

  // Filter listings
  const filteredSublets = useMemo(() => {
    return sublets.filter(s => {
      const matchesSearch = matchesFreeText(s, searchQuery);

      const matchesPrice = s.price >= filters.minPrice && s.price <= filters.maxPrice;
      const matchesStatus = filters.showTaken || s.status !== ListingStatus.TAKEN;
      const matchesType = !filters.type || s.type === filters.type;
      const matchesCity = !filters.city.trim()
        || (s.city?.toLowerCase().includes(filters.city.toLowerCase()));
      const matchesNeighborhood = !filters.neighborhood.trim()
        || (s.neighborhood?.toLowerCase().includes(filters.neighborhood.toLowerCase()));
      const matchesDates = !filters.startDate || !filters.endDate
        || (s.startDate <= filters.endDate && s.endDate >= filters.startDate);

      const rentTerm = filters.rentTerm ?? RentTerm.ALL;
      const matchesRentTerm = rentTerm === RentTerm.ALL || (() => {
        const days = getListingDurationDays(s);
        if (days == null) return true;
        return rentTerm === RentTerm.SHORT_TERM ? days <= SHORT_TERM_DAYS : days > SHORT_TERM_DAYS;
      })();

      const matchesBeds = !filters.minRooms || (() => {
        const beds = getBedroomCount(s);
        return beds !== null && beds >= (filters.minRooms ?? 0);
      })();

      const matchesFurnished = AMENITY_FILTER_KEYS.every(
        key => !filters.amenities?.[key] || s.parsedAmenities?.[key] === true,
      );

      let matchesPostedWithin = true;
      if (filters.postedWithin && filters.postedWithin !== 'all') {
        const durations: Record<string, number> = {
          '1h': 3_600_000, '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000,
        };
        const cutoff = Date.now() - (durations[filters.postedWithin] ?? 0);
        matchesPostedWithin = s.createdAt >= cutoff;
      }

      const matchesPrice2 = !filters.onlyWithPrice || (s.price && s.price > 0);

      return matchesSearch && matchesPrice && matchesStatus && matchesType
        && matchesCity && matchesNeighborhood && matchesDates && matchesRentTerm
        && matchesBeds && matchesFurnished && matchesPostedWithin && matchesPrice2;
    });
  }, [sublets, filters, searchQuery]);

  const sortedSublets = useMemo(() => {
    const ts = (s: Sublet) => (s.postedAt ? new Date(s.postedAt).getTime() || s.createdAt : s.createdAt);
    const list = [...filteredSublets];
    if (sortBy === 'newest') list.sort((a, b) => ts(b) - ts(a));
    else list.sort((a, b) => (sortBy === 'priceAsc' ? 1 : -1) * ((a.price || Infinity) - (b.price || Infinity)));
    return list;
  }, [filteredSublets, sortBy]);

  const quickFilters = [
    { key: 'entire', label: t.subletTypes[SubletType.ENTIRE], active: filters.type === SubletType.ENTIRE,
      toggle: () => setFilters(f => ({ ...f, type: f.type === SubletType.ENTIRE ? undefined : SubletType.ENTIRE })) },
    { key: 'room', label: t.subletTypes[SubletType.ROOMMATE], active: filters.type === SubletType.ROOMMATE,
      toggle: () => setFilters(f => ({ ...f, type: f.type === SubletType.ROOMMATE ? undefined : SubletType.ROOMMATE })) },
    { key: 'studio', label: t.subletTypes[SubletType.STUDIO], active: filters.type === SubletType.STUDIO,
      toggle: () => setFilters(f => ({ ...f, type: f.type === SubletType.STUDIO ? undefined : SubletType.STUDIO })) },
    { key: 'pets', label: copy.quickPets, active: !!filters.amenities?.petFriendly,
      toggle: () => setFilters(f => ({ ...f, amenities: { ...f.amenities, petFriendly: !f.amenities?.petFriendly } })) },
    { key: 'today', label: copy.quickToday, active: filters.postedWithin === '24h',
      toggle: () => setFilters(f => ({ ...f, postedWithin: f.postedWithin === '24h' ? 'all' : '24h' })) },
  ];

  const activeFilterCount = useMemo(() => [
    filters.minPrice !== 0,
    filters.maxPrice !== PRICE_MAX,
    !!filters.type,
    !!filters.city,
    !!filters.neighborhood,
    !!filters.startDate,
    !!filters.endDate,
    (filters.rentTerm ?? RentTerm.ALL) !== RentTerm.ALL,
    !!filters.minRooms,
    (filters.postedWithin ?? 'all') !== 'all',
    ...AMENITY_FILTER_KEYS.map(k => !!filters.amenities?.[k]),
  ].filter(Boolean).length, [filters]);

  const handleMarkerClick = useCallback((sublet: Sublet) => {
    setSelectedSubletId(sublet.id);
    const card = cardRefs.current[sublet.id];
    if (card && panelRef.current) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  const handleSave = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const wasSaved = savedListingIds.has(id);
    toggleSavedById(id);
    if (!wasSaved && user) setToastMessage('Saved ♡');
  }, [user, savedListingIds, toggleSavedById]);

  const handleClearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchQuery('');
  }, []);

  const handleNavigateToListing = useCallback(() => {
    _pendingWebMapState = { filters, searchQuery, selectedSubletId, cityFlyTo };
  }, [filters, searchQuery, selectedSubletId, cityFlyTo]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">

      {/* ── Navbar ── */}
      <div className="shrink-0">
        <WebNavbar />
      </div>

      {/* ── Search + quick filters ── */}
      <div className="shrink-0 z-40 flex flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-3">
        <SearchAutocomplete
          value={searchQuery}
          onChange={setSearchQuery}
          sublets={sublets}
          placeholder={copy.searchPlaceholder}
          className="w-full max-w-md flex-1"
          inputClassName="h-11 w-full rounded-xl border border-line bg-white text-[15px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand-600"
          onCitySelect={city => {
            const center = CITY_CENTERS[city];
            if (center) setCityFlyTo(center);
          }}
        />

        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-[15px] font-semibold transition-colors ${
            activeFilterCount > 0 ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink hover:border-brand-200'
          }`}
        >
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {t.filters}
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="scrollbar-hide flex min-w-0 items-center gap-2 overflow-x-auto">
          {quickFilters.map(q => (
            <button
              key={q.key}
              type="button"
              aria-pressed={q.active}
              onClick={q.toggle}
              className={`h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                q.active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink hover:border-brand-200'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">

        {/* Listings Panel */}
        <div
          ref={panelRef}
          className="flex-1 md:flex-none md:w-1/2 overflow-y-auto bg-white border-e border-line"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-white/95 px-4 py-3">
            {isLoading ? (
              <div className="h-5 w-32 animate-pulse rounded bg-brand-50" />
            ) : (
              <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">
                {copy.resultsCount(filteredSublets.length)}
              </h1>
            )}
            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="sr-only sm:not-sr-only">{copy.sortLabel}</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="h-9 rounded-lg border border-line bg-white px-2 text-sm font-medium text-ink outline-none focus:border-brand-600"
              >
                <option value="newest">{copy.sortNewest}</option>
                <option value="priceAsc">{copy.sortPriceLow}</option>
                <option value="priceDesc">{copy.sortPriceHigh}</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            ) : sortedSublets.length === 0 ? (
              <div className="col-span-full py-16 text-center">
                <p className="font-display text-lg font-bold text-ink">{copy.noResultsTitle}</p>
                <p className="mt-1 text-sm text-muted">{copy.noResultsBody}</p>
                {(activeFilterCount > 0 || searchQuery) && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 h-10 rounded-xl border border-line px-4 text-sm font-semibold text-brand-700 hover:border-brand-200"
                  >
                    {copy.clearFilters}
                  </button>
                )}
              </div>
            ) : (
              sortedSublets.map(s => (
                <ListingCard
                  key={s.id}
                  ref={el => { cardRefs.current[s.id] = el; }}
                  sublet={s}
                  isSelected={selectedSubletId === s.id}
                  isSaved={savedListingIds.has(s.id)}
                  currency={currency}
                  onMouseEnter={() => setSelectedSubletId(s.id)}
                  onMouseLeave={() => setSelectedSubletId(undefined)}
                  onSave={e => handleSave(e, s.id)}
                  onNavigate={handleNavigateToListing}
                />
              ))
            )}
          </div>
        </div>

        {/* Map */}
        <div className="h-[42vh] md:h-auto md:w-1/2 shrink-0 relative">
          <MapVisualizer
            sublets={filteredSublets}
            onMarkerClick={handleMarkerClick}
            onDeselect={() => setSelectedSubletId(undefined)}
            selectedSubletId={selectedSubletId}
            language={language}
            flyToCity={cityFlyTo}
          />
        </div>
      </div>

      {/* ── Filters Drawer ── */}
      <FiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onClear={handleClearFilters}
        resultCount={filteredSublets.length}
      />

      {/* ── Auth Modal (triggered by SavedContext when guest tries to save) ── */}
      {savedAuthModal && (
        <AuthModal
          reason="save"
          initialMode="signup"
          onSuccess={closeSavedAuthModal}
          onClose={closeSavedAuthModal}
        />
      )}

      {/* ── Toast ── */}
      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  );
}

export default function MapPage() {
  return <PlatformWrapper web={<WebMapPage />} mobile={<MapScreen />} />;
}
