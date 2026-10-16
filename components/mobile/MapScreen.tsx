'use client';

import React, {
  useState, useMemo, useEffect, useRef, useCallback,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ListingCarousel from '@/components/ListingCarousel';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import AuthModal from '@/components/shared/AuthModal';
import MobileTabBar from '@/components/shared/MobileTabBar';
import { useSaved } from '@/contexts/SavedContext';
import Toast from '@/components/shared/Toast';
import { persistenceService } from '@/services/persistenceService';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/translations';
import { formatPrice, formatDate } from '@/utils/formatters';
import {
  Sublet, Filters, ListingStatus, SubletType,
  DateMode, RentTerm, Language, CurrencyCode,
} from '@/types';
import { CITY_CENTERS } from '@/constants';
import { matchesFreeText } from '@/lib/searchMatch';
import { listingTitle } from '@/lib/locationUtils';
import { homeCopy } from '@/lib/homeCopy';
import { formatDateRange, timelineWindow } from '@/lib/dateWindow';
import Logo from '@/components/shared/Logo';

const MapVisualizer = dynamic(
  () => import('@/components/MapVisualizer'),
  { ssr: false },
);

// ─── Constants ────────────────────────────────────────────────────────────────

const SHORT_TERM_DAYS = 183;
const PRICE_MAX = 30000;
const PRICE_STEP = 1000;
const SNAP_HANDLE = 32;
const SNAP_CARD   = 270;
const SNAP_LIST_RATIO = 0.55;

const INITIAL_FILTERS: Filters = {
  minPrice: 0, maxPrice: PRICE_MAX, showTaken: false, type: undefined,
  city: '', neighborhood: '', startDate: '', endDate: '',
  dateMode: DateMode.FLEXIBLE, petsAllowed: false,
  onlyWithPrice: true,
  rentTerm: RentTerm.ALL, postedWithin: 'all',
  minRooms: undefined, maxRooms: undefined,
};

const AMENITY_FILTER_KEYS: Array<keyof NonNullable<Filters['amenities']>> = [
  'furnished', 'wifi', 'ac', 'washer', 'petFriendly', 'parking', 'kitchen', 'balcony',
];

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

function getCardTitle(s: Sublet, unknownLocation: string, lang: string): string {
  return listingTitle(s, lang, unknownLocation);
}

function getDateRange(s: Sublet, t: { fromDate: string; availableNow: string }): string {
  const start = s.startDate ? formatDate(s.startDate) : '';
  const end   = s.endDate   ? formatDate(s.endDate)   : '';
  if (start && end) return `${start} – ${end}`;
  if (start) return t.fromDate.replace('{date}', start);
  if (s.immediateAvailability) return t.availableNow;
  return '';
}

// ─── Price Slider ─────────────────────────────────────────────────────────────

function PriceSlider({ minVal, maxVal, onChange }: {
  minVal: number; maxVal: number; onChange: (min: number, max: number) => void;
}) {
  const minPct = (minVal / PRICE_MAX) * 100;
  const maxPct = (maxVal / PRICE_MAX) * 100;
  const inputCls = [
    'absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer pointer-events-none',
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none',
    '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full',
    '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-brand-600',
    '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-runnable-track]:bg-transparent',
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5',
    '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border',
    '[&::-moz-range-thumb]:border-brand-600 [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent',
  ].join(' ');
  return (
    <div className="relative h-5 mt-2">
      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-brand-100 rounded-full pointer-events-none">
        <div className="absolute h-full bg-brand-600 rounded-full"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }} />
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

// ─── Filters Drawer ───────────────────────────────────────────────────────────

function FiltersDrawer({ open, onClose, filters, onFiltersChange, onClear, resultCount }: {
  open: boolean; onClose: () => void; filters: Filters;
  onFiltersChange: (f: Filters) => void; onClear: () => void; resultCount: number;
}) {
  const set = useCallback(
    (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch }),
    [filters, onFiltersChange],
  );
  const setAmenity = useCallback(
    (key: keyof NonNullable<Filters['amenities']>, val: boolean) =>
      onFiltersChange({ ...filters, amenities: { ...filters.amenities, [key]: val } }),
    [filters, onFiltersChange],
  );
  const { language } = useLanguage();
  const t = translations[language];

  const sLabel = 'text-xs font-semibold uppercase tracking-[0.06em] text-muted';
  const iconBtnCls = (active: boolean) =>
    `flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer select-none ${
      active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line text-ink'
    }`;
  const pillCls = (active: boolean) =>
    `whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
      active ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 bg-ink/40 z-[55]" onClick={onClose} />}
      <aside className={`fixed top-0 right-0 bottom-0 z-[60] w-full max-w-[480px] bg-white shadow-[0_0_40px_rgba(17,26,36,0.18)] flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="px-6 py-5 border-b border-line flex items-center justify-between shrink-0">
          <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink">{t.refineSearch}</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-brand-50 hover:text-ink transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8" style={{ scrollbarWidth: 'none' }}>
          {/* Price Range */}
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <span className={sLabel}>{t.priceRange}</span>
              <span className="text-sm font-semibold tabular-nums text-brand-700">
                ₪{filters.minPrice.toLocaleString()} — {filters.maxPrice >= PRICE_MAX ? '₪30k+' : `₪${filters.maxPrice.toLocaleString()}`}
              </span>
            </div>
            <PriceSlider minVal={filters.minPrice} maxVal={filters.maxPrice}
              onChange={(min, max) => set({ minPrice: min, maxPrice: max })} />
          </section>

          {/* Rental Duration */}
          <section className="space-y-4">
            <span className={sLabel}>{t.rentalDuration}</span>
            <div className="grid grid-cols-3 gap-3">
              {([
                { label: t.rentTerms[RentTerm.ALL], value: RentTerm.ALL, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
                { label: t.rentTerms[RentTerm.SHORT_TERM], value: RentTerm.SHORT_TERM, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                { label: t.rentTerms[RentTerm.LONG_TERM], value: RentTerm.LONG_TERM, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
              ]).map(opt => (
                <button key={opt.value} onClick={() => set({ rentTerm: opt.value })}
                  className={iconBtnCls((filters.rentTerm ?? RentTerm.ALL) === opt.value)}>
                  {opt.icon}<span className="text-xs font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Property Type */}
          <section className="space-y-4">
            <span className={sLabel}>{t.propertyType}</span>
            <div className="grid grid-cols-3 gap-3">
              {([
                { label: t.subletTypes[SubletType.ENTIRE], value: SubletType.ENTIRE, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
                { label: t.subletTypes[SubletType.ROOMMATE], value: SubletType.ROOMMATE, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                { label: t.subletTypes[SubletType.STUDIO], value: SubletType.STUDIO, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg> },
              ]).map(opt => (
                <button key={opt.value}
                  onClick={() => set({ type: filters.type === opt.value ? undefined : opt.value })}
                  className={iconBtnCls(filters.type === opt.value)}>
                  {opt.icon}<span className="text-xs font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Bedrooms */}
          <section className="space-y-4">
            <span className={sLabel}>{t.bedrooms}</span>
            <div className="flex gap-2 flex-wrap">
              {([
                { label: t.anyRooms, value: undefined as number | undefined },
                { label: '1+', value: 1 }, { label: '2+', value: 2 },
                { label: '3+', value: 3 }, { label: '4+', value: 4 },
              ]).map(opt => (
                <button key={opt.label} onClick={() => set({ minRooms: opt.value })}
                  className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all ${
                    filters.minRooms === opt.value
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-line text-ink'
                  }`}>
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
                  className={`relative w-11 h-6 rounded-full transition-colors ${filters.dateMode === DateMode.FLEXIBLE ? 'bg-brand-600' : 'bg-line'}`}>
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
              {([
                { label: t.postedWithinAll, value: 'all' }, { label: t.postedWithin1h, value: '1h' },
                { label: t.postedWithin24h, value: '24h' }, { label: t.postedWithin7d, value: '7d' },
                { label: t.postedWithin30d, value: '30d' },
              ]).map(opt => (
                <button key={opt.value} onClick={() => set({ postedWithin: opt.value })}
                  className={pillCls((filters.postedWithin ?? 'all') === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Post Quality */}
          <section className="space-y-4">
            <span className={sLabel}>{t.postQuality}</span>
            <button onClick={() => set({ onlyWithPrice: !filters.onlyWithPrice })}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all w-full ${filters.onlyWithPrice ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line text-ink'}`}>
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
                  <input type="checkbox" checked={!!(filters.amenities?.[opt.key])}
                    onChange={e => setAmenity(opt.key, e.target.checked)}
                    className="w-5 h-5 rounded border-line accent-brand-600 cursor-pointer" />
                  <span className="text-sm text-ink group-hover:text-brand-700 transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="px-6 py-4 bg-white border-t border-line flex items-center justify-between shrink-0">
          <button onClick={onClear} className="text-sm font-semibold text-muted hover:text-ink transition-colors">
            {t.clearAll}
          </button>
          <button onClick={onClose}
            className="flex items-center gap-2 h-12 px-6 bg-brand-600 text-white rounded-xl font-semibold text-[15px] hover:bg-brand-700 transition-colors">
            {t.showResults.replace('{n}', resultCount.toLocaleString())}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Mobile Tab Bar ───────────────────────────────────────────────────────────

// ─── Mini Picker (currency / language) ───────────────────────────────────────

function MiniPicker({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string; display?: React.ReactNode }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="relative">
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative z-50 flex h-10 items-center gap-1.5 rounded-[10px] border border-line bg-white px-2.5 text-[13px] font-medium text-ink transition-colors">
        {selected?.display ?? selected?.label ?? value}
        <svg className={`w-2.5 h-2.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full end-0 mt-1.5 bg-white border border-line rounded-xl shadow-[0_12px_32px_rgba(17,26,36,0.14)] py-1.5 z-50 min-w-[90px] overflow-hidden">
          {options.map(opt => (
            <button key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-bold transition-colors flex items-center gap-2 ${
                opt.value === value
                  ? 'text-brand-700 bg-brand-50'
                  : 'text-ink hover:bg-brand-50'
              }`}>
              {opt.display ?? opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Selected Listing Card ────────────────────────────────────────────────────

let _pendingMobileMapState: MobileMapSavedState | null = null;

/** Call before router.push('/map') to pre-seed search + map position for a city. */
export function setInitialMobileMapCity(city: string, center: { lat: number; lng: number; zoom?: number }) {
  _pendingMobileMapState = {
    filters: { ...INITIAL_FILTERS, city },
    searchQuery: city,
    selectedId: undefined,
    cityFlyTo: center,
    sheetHeight: SNAP_HANDLE,
  };
}

/** Call before router.push('/map') to pre-seed a free-text search with optional dates / budget. */
export function setInitialMobileMapSearch(
  query: string,
  extra: Partial<Pick<Filters, 'startDate' | 'endDate' | 'maxPrice'>> = {},
  center: { lat: number; lng: number; zoom?: number } | null = null,
) {
  _pendingMobileMapState = {
    filters: { ...INITIAL_FILTERS, ...extra },
    searchQuery: query,
    selectedId: undefined,
    cityFlyTo: center,
    sheetHeight: SNAP_HANDLE,
  };
}

interface MobileMapSavedState {
  filters: Filters;
  searchQuery: string;
  selectedId: string | undefined;
  cityFlyTo: { lat: number; lng: number; zoom?: number } | null;
  sheetHeight: number;
}

function useCardModel(s: Sublet) {
  const { language } = useLanguage();
  const t = translations[language];
  const copy = homeCopy(language);
  const postTs = s.postedAt ? (new Date(s.postedAt).getTime() || s.createdAt) : s.createdAt;
  const hoursAgo = Math.max(0, Math.floor((Date.now() - postTs) / (60 * 60 * 1000)));
  const daysAgo = Math.max(1, Math.floor(hoursAgo / 24));
  const isNew = hoursAgo < 24;
  return {
    language, t, copy, isNew,
    typeLabel: t.subletTypes[s.type],
    freshLabel: isNew
      ? t.addedXhAgo.replace('{x}', String(hoursAgo))
      : t.addedXdAgo.replace('{x}', String(daysAgo > 30 ? '30+' : daysAgo)),
    dateRange: formatDateRange(s.startDate, s.endDate, language) ?? (s.immediateAvailability ? copy.availableNow : null),
    timeline: timelineWindow(s.startDate, s.endDate, language),
    title: getCardTitle(s, t.unknownLocation, language),
  };
}

function FreshBadge({ isNew, label, className = '' }: { isNew: boolean; label: string; className?: string }) {
  return (
    <span className={`pointer-events-none inline-flex items-center gap-1 rounded-full px-2 py-px text-[11px] font-semibold ${isNew ? 'bg-accent-100 text-accent-700' : 'bg-white text-ink'} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isNew ? 'bg-accent-500' : 'bg-brand-200'}`} />
      {label}
    </span>
  );
}

function HeartButton({ isSaved, onSave, className = '' }: { isSaved: boolean; onSave: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <button
      onClick={onSave}
      aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white transition-colors ${isSaved ? 'text-accent-600' : 'text-ink'} ${className}`}
    >
      <svg className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  );
}

function SelectedCard({ sublet: s, currency, isSaved, onSave, onNavigate }: {
  sublet: Sublet; currency: string; isSaved: boolean;
  onSave: (e: React.MouseEvent) => void;
  onNavigate: () => void;
}) {
  const m = useCardModel(s);

  return (
    <div className="px-4 pb-2">
      <div className="flex gap-3 rounded-2xl border border-line bg-white p-2.5">
        <div className="relative aspect-square w-[104px] shrink-0 overflow-hidden rounded-xl">
          <ListingCarousel id={s.id} images={s.images} sourceUrl={s.sourceUrl}
            photoCount={s.photoCount} aspectRatio="aspect-square" />
          <FreshBadge isNew={m.isNew} label={m.freshLabel} className="absolute start-1.5 top-1.5 z-20" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-1.5">
            {m.typeLabel && <span className="truncate rounded-md bg-brand-100 px-1.5 py-px text-[11px] font-semibold text-brand-700">{m.typeLabel}</span>}
            <HeartButton isSaved={isSaved} onSave={onSave} className="-me-1 -mt-1 shrink-0 border border-line" />
          </div>
          <p className="truncate font-display text-[17px] font-bold leading-tight text-ink">{m.title}</p>
          {s.price > 0 ? (
            <p className="text-base font-bold tabular-nums text-ink">
              {formatPrice(s.price, currency as CurrencyCode, m.language, s.currency)}
              <span className="ms-0.5 text-xs font-normal text-muted">{m.copy.perMonth}</span>
            </p>
          ) : (
            <p className="text-xs text-muted">{m.copy.priceOnRequest}</p>
          )}
          {m.dateRange && <p className="text-xs text-muted">{m.dateRange}</p>}
          {m.timeline && (
            <div className="relative h-1.5 rounded-full bg-brand-100" aria-hidden="true">
              <div className="absolute inset-y-0 rounded-full bg-brand-600" style={{ insetInlineStart: `${m.timeline.left}%`, width: `${m.timeline.width}%` }} />
            </div>
          )}
          <Link href={`/listing/${s.id}`} onClick={onNavigate}
            className="mt-1 flex h-10 items-center justify-center rounded-[10px] bg-brand-600 text-sm font-semibold text-white active:bg-brand-700">
            {m.copy.viewDetails}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Mini Card (list view) ────────────────────────────────────────────────────

function MiniCard({ sublet: s, isSelected, isSaved, currency, onTap, onSave, onNavigate }: {
  sublet: Sublet; isSelected: boolean; isSaved: boolean; currency: string;
  onTap: () => void; onSave: (e: React.MouseEvent) => void; onNavigate: () => void;
}) {
  const m = useCardModel(s);
  const isTaken = s.status === ListingStatus.TAKEN;

  return (
    <div
      className={`relative w-52 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border bg-white transition-colors ${
        isSelected ? 'border-accent-500 ring-2 ring-accent-500' : 'border-line'
      } ${isTaken ? 'opacity-60' : ''}`}
      onClick={onTap}>
      <Link href={`/listing/${s.id}`} className="block" onClick={e => { e.stopPropagation(); onNavigate(); }}>
        <div className="relative aspect-[4/3] overflow-hidden">
          <ListingCarousel id={s.id} images={s.images} sourceUrl={s.sourceUrl}
            photoCount={s.photoCount} aspectRatio="aspect-[4/3]" />
          <FreshBadge isNew={m.isNew} label={m.freshLabel} className="absolute start-2 top-2 z-20" />
          {isTaken && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-ink/40">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-ink">{m.copy.taken}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 p-2.5">
          <div className="flex items-center justify-between gap-1.5">
            {m.typeLabel && <span className="truncate rounded-[5px] bg-brand-100 px-1.5 py-px text-[11px] font-semibold text-brand-700">{m.typeLabel}</span>}
            {s.price > 0
              ? <span className="shrink-0 text-[15px] font-bold tabular-nums text-ink">{formatPrice(s.price, currency as CurrencyCode, m.language, s.currency)}</span>
              : <span className="shrink-0 text-[11px] text-muted">{m.copy.priceOnRequest}</span>}
          </div>
          <p className="truncate font-display text-[15px] font-bold text-ink">{m.title}</p>
          {m.dateRange && <p className="truncate text-[11px] text-muted">{m.dateRange}</p>}
        </div>
      </Link>
      <HeartButton isSaved={isSaved} onSave={onSave} className="absolute end-2 top-2 z-30" />
    </div>
  );
}

// ─── MapScreen ────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { user, logout }       = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage } = useLanguage();

  const firebaseUser  = user as (typeof user & { photoURL?: string; displayName?: string }) | null;
  const displayName   = firebaseUser?.displayName || (user as any)?.name || 'User';
  const initials      = displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [sublets,        setSublets]        = useState<Sublet[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [filters,        setFilters]        = useState<Filters>(() => _pendingMobileMapState?.filters ?? INITIAL_FILTERS);
  const [searchQuery,    setSearchQuery]    = useState(() => _pendingMobileMapState?.searchQuery ?? '');
  const [selectedId,     setSelectedId]     = useState<string | undefined>(() => _pendingMobileMapState?.selectedId);
  const [cityFlyTo,      setCityFlyTo]      = useState<{ lat: number; lng: number; zoom?: number } | null>(() => _pendingMobileMapState?.cityFlyTo ?? null);
  const { savedIds, toggle: toggleSavedById, showSignInModal, closeSignInModal } = useSaved();
  const [authModalOpen,  setAuthModalOpen]  = useState(false);
  const [toastMessage,   setToastMessage]   = useState<string | null>(null);
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [profileOpen,    setProfileOpen]    = useState(false);
  const [headerAuthOpen, setHeaderAuthOpen] = useState(false);

  // ── Sheet drag state ────────────────────────────────────────────────────────
  const [sheetHeight,  setSheetHeight]  = useState(() => _pendingMobileMapState?.sheetHeight ?? SNAP_CARD);
  const [snapListH,    setSnapListH]    = useState(380);
  const [isDragging,   setIsDragging]   = useState(false);

  const containerRef    = useRef<HTMLDivElement>(null);
  const handleRef       = useRef<HTMLDivElement>(null);
  const cardListRef     = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<google.maps.Map | null>(null);
  const cardRefs      = useRef<Record<string, HTMLDivElement | null>>({});
  const sheetHRef     = useRef(_pendingMobileMapState?.sheetHeight ?? SNAP_CARD);
  const snapListHRef  = useRef(380);
  const dragStartY    = useRef(0);
  const dragStartH    = useRef(0);

  const t = translations[language];

  const LANG_CURRENCY: Partial<Record<Language, CurrencyCode>> = {
    [Language.HE]: CurrencyCode.ILS,
    [Language.EN]: CurrencyCode.USD,
    [Language.FR]: CurrencyCode.EUR,
    [Language.DE]: CurrencyCode.EUR,
    [Language.IT]: CurrencyCode.EUR,
    [Language.PT]: CurrencyCode.EUR,
    [Language.ES]: CurrencyCode.USD,
    [Language.RU]: CurrencyCode.USD,
    [Language.UK]: CurrencyCode.GBP,
    [Language.ZH]: CurrencyCode.USD,
  };
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as Language);
    const matched = LANG_CURRENCY[lang as Language];
    if (matched) setCurrency(matched);
  };

  // Clear pending state after mount — timeout survives Strict Mode's unmount/remount
  useEffect(() => {
    const t = setTimeout(() => { _pendingMobileMapState = null; }, 200);
    return () => clearTimeout(t);
  }, []);

  // Keep refs in sync
  useEffect(() => { sheetHRef.current = sheetHeight; }, [sheetHeight]);
  useEffect(() => { snapListHRef.current = snapListH; }, [snapListH]);

  // Measure snap list height after mount + on resize
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const raw = Math.round(containerRef.current.clientHeight * SNAP_LIST_RATIO);
        const h = Math.max(raw, SNAP_CARD + 80);
        setSnapListH(h);
        snapListHRef.current = h;
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ── Native drag listeners (passive:false so we own the gesture) ──────────────
  useEffect(() => {
    const el = handleRef.current;
    if (!el) return;

    // Zoom state captured at drag start
    let startZoom  = 12;
    let startMapH  = 1;

    const containerH = () => containerRef.current?.clientHeight ?? 600;

    const applyZoom = () => {
      const map = mapInstanceRef.current;
      if (!map || startMapH <= 0) return;
      const newMapH    = Math.max(1, containerH() - sheetHRef.current);
      const zoomDelta  = Math.log2(newMapH / startMapH);
      const newZoom    = Math.max(2, Math.min(20, startZoom + zoomDelta));
      map.setZoom(newZoom);
    };

    const snap = () => {
      const current = sheetHRef.current;
      const snaps   = [SNAP_HANDLE, SNAP_CARD, snapListHRef.current];
      const nearest = snaps.reduce((prev, s) =>
        Math.abs(s - current) < Math.abs(prev - current) ? s : prev
      );
      setSheetHeight(nearest);
      sheetHRef.current = nearest;
      // After the CSS transition settles, trigger a map resize
      setTimeout(() => {
        const map = mapInstanceRef.current;
        if (map && window.google?.maps) {
          window.google.maps.event.trigger(map, 'resize');
        }
      }, 350);
    };

    const captureZoomStart = () => {
      const map = mapInstanceRef.current;
      if (map) {
        startZoom = map.getZoom() ?? 12;
        startMapH = Math.max(1, containerH() - sheetHRef.current);
      }
    };

    // ── Touch ──
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartY.current = e.touches[0].clientY;
      dragStartH.current = sheetHRef.current;
      captureZoomStart();
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const dy   = dragStartY.current - e.touches[0].clientY;
      const maxH = containerH() * 0.92;
      const newH = Math.max(SNAP_HANDLE, Math.min(maxH, dragStartH.current + dy));
      setSheetHeight(newH);
      sheetHRef.current = newH;
      applyZoom();
    };
    const onTouchEnd = () => { setIsDragging(false); snap(); };

    // ── Mouse (desktop / dev-tools testing) ──
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartH.current = sheetHRef.current;
      captureZoomStart();

      const onMouseMove = (e: MouseEvent) => {
        const dy   = dragStartY.current - e.clientY;
        const maxH = containerH() * 0.92;
        const newH = Math.max(SNAP_HANDLE, Math.min(maxH, dragStartH.current + dy));
        setSheetHeight(newH);
        sheetHRef.current = newH;
        applyZoom();
      };
      const onMouseUp = () => {
        setIsDragging(false);
        snap();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    el.addEventListener('touchstart',  onTouchStart, { passive: false });
    el.addEventListener('touchmove',   onTouchMove,  { passive: false });
    el.addEventListener('touchend',    onTouchEnd);
    el.addEventListener('mousedown',   onMouseDown);

    return () => {
      el.removeEventListener('touchstart',  onTouchStart);
      el.removeEventListener('touchmove',   onTouchMove);
      el.removeEventListener('touchend',    onTouchEnd);
      el.removeEventListener('mousedown',   onMouseDown);
    };
  }, []); // all logic uses refs — no deps needed

  // ── Data loading ────────────────────────────────────────────────────────────
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

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredSublets = useMemo(() => {
    return sublets.filter(s => {
      const matchesSearch = matchesFreeText(s, searchQuery);

      const matchesPrice  = s.price >= filters.minPrice && s.price <= filters.maxPrice;
      const matchesStatus = filters.showTaken || s.status !== ListingStatus.TAKEN;
      const matchesType   = !filters.type || s.type === filters.type;
      const matchesCity   = !filters.city.trim()
        || (s.city?.toLowerCase().includes(filters.city.toLowerCase()));
      const matchesNbhd   = !filters.neighborhood.trim()
        || (s.neighborhood?.toLowerCase().includes(filters.neighborhood.toLowerCase()));
      const matchesDates  = !filters.startDate || !filters.endDate
        || (s.startDate <= filters.endDate && s.endDate >= filters.startDate);

      const rentTerm        = filters.rentTerm ?? RentTerm.ALL;
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
        && matchesCity && matchesNbhd && matchesDates && matchesRentTerm
        && matchesBeds && matchesFurnished && matchesPostedWithin && matchesPrice2;
    });
  }, [sublets, filters, searchQuery]);

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

  const selectedSublet = useMemo(
    () => selectedId ? filteredSublets.find(s => s.id === selectedId) : undefined,
    [selectedId, filteredSublets],
  );

  // Scroll selected card into view when in list mode
  useEffect(() => {
    if (!selectedId) return;
    const card = cardRefs.current[selectedId];
    if (card && cardListRef.current)
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedId]);

  // ── Callbacks ───────────────────────────────────────────────────────────────
  const handleMarkerClick = useCallback((sublet: Sublet) => {
    setSelectedId(sublet.id);
    setSheetHeight(SNAP_CARD);
    sheetHRef.current = SNAP_CARD;
  }, []);

  const handleSave = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const willSave = !savedIds.has(id);
    toggleSavedById(id);
    if (willSave && user) setToastMessage('Saved ♡');
  }, [savedIds, toggleSavedById, user]);

  const handleClearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchQuery('');
  }, []);

  const handleNavigateToListing = useCallback(() => {
    _pendingMobileMapState = {
      filters, searchQuery, selectedId, cityFlyTo,
      sheetHeight: sheetHRef.current,
    };
  }, [filters, searchQuery, selectedId, cityFlyTo]);

  // ── Derived sheet zones ──────────────────────────────────────────────────────
  const midHandleCard = (SNAP_HANDLE + SNAP_CARD) / 2;
  const midCardList   = (SNAP_CARD + snapListH)   / 2;
  const showCard = sheetHeight >= midHandleCard && sheetHeight < midCardList;
  const showList = sheetHeight >= midCardList;
  // Defer strip in card band until drag ends — mounting listings during touchmove janks the sheet.
  const showListingStrip = showList || (showCard && !selectedSublet && !isDragging);

  // ── Filter chip active states ────────────────────────────────────────────────
  const copy = homeCopy(language);
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

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">

      {/* ── Header ── */}
      <div className="bg-white shrink-0 px-4 pt-3 pb-3 space-y-2.5 border-b border-line">

        {/* Row 1: Logo + Pickers + Avatar */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center shrink-0" aria-label="SubHub home">
            <Logo size="sm" />
          </Link>

          <div className="flex-1" />

          <MiniPicker
            value={currency}
            options={[
              { value: CurrencyCode.ILS, label: '₪ ILS', display: <span className="font-semibold text-brand-600">₪</span> },
              { value: CurrencyCode.USD, label: '$ USD', display: <span className="font-semibold text-brand-600">$</span> },
              { value: CurrencyCode.EUR, label: '€ EUR', display: <span className="font-semibold text-brand-600">€</span> },
              { value: CurrencyCode.GBP, label: '£ GBP', display: <span className="font-semibold text-brand-600">£</span> },
            ]}
            onChange={v => setCurrency(v as CurrencyCode)}
          />
          <MiniPicker
            value={language}
            options={[
              { value: Language.EN, label: 'EN', display: <><img src="https://flagcdn.com/w20/us.png" alt="EN" className="w-4 h-3 rounded-sm object-cover" /> EN</> },
              { value: Language.HE, label: 'HE', display: <><img src="https://flagcdn.com/w20/il.png" alt="HE" className="w-4 h-3 rounded-sm object-cover" /> HE</> },
              { value: Language.FR, label: 'FR', display: <><img src="https://flagcdn.com/w20/fr.png" alt="FR" className="w-4 h-3 rounded-sm object-cover" /> FR</> },
              { value: Language.RU, label: 'RU', display: <><img src="https://flagcdn.com/w20/ru.png" alt="RU" className="w-4 h-3 rounded-sm object-cover" /> RU</> },
              { value: Language.ES, label: 'ES', display: <><img src="https://flagcdn.com/w20/es.png" alt="ES" className="w-4 h-3 rounded-sm object-cover" /> ES</> },
              { value: Language.DE, label: 'DE', display: <><img src="https://flagcdn.com/w20/de.png" alt="DE" className="w-4 h-3 rounded-sm object-cover" /> DE</> },
              { value: Language.PT, label: 'PT', display: <><img src="https://flagcdn.com/w20/pt.png" alt="PT" className="w-4 h-3 rounded-sm object-cover" /> PT</> },
              { value: Language.UK, label: 'UK', display: <><img src="https://flagcdn.com/w20/ua.png" alt="UK" className="w-4 h-3 rounded-sm object-cover" /> UK</> },
              { value: Language.IT, label: 'IT', display: <><img src="https://flagcdn.com/w20/it.png" alt="IT" className="w-4 h-3 rounded-sm object-cover" /> IT</> },
              { value: Language.ZH, label: 'ZH', display: <><img src="https://flagcdn.com/w20/cn.png" alt="ZH" className="w-4 h-3 rounded-sm object-cover" /> ZH</> },
            ]}
            onChange={handleLanguageChange}
          />

          {user ? (
            <div className="relative">
              <button onClick={() => setProfileOpen(v => !v)}
                className="w-10 h-10 rounded-full overflow-hidden border border-line focus:outline-none" aria-label="Account menu">
                {firebaseUser?.photoURL ? (
                  <img src={firebaseUser.photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-brand-600 flex items-center justify-center text-white text-xs font-black">
                    {initials}
                  </div>
                )}
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 overflow-hidden">
                    <Link href="/profile" onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Profile
                    </Link>
                    <Link href="/messages" onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Messages
                    </Link>
                    <div className="border-t border-slate-100 mt-1">
                      <button onClick={() => { logout(); setProfileOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={() => setHeaderAuthOpen(true)}
              className="w-10 h-10 rounded-full border border-line bg-white flex items-center justify-center text-ink" aria-label="Sign in">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          )}
        </div>

        {/* Row 2: Search + filters */}
        <div className="flex gap-2">
          <SearchAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            sublets={sublets}
            placeholder={copy.searchPlaceholderShort}
            className="min-w-0 flex-1"
            inputClassName="h-12 w-full rounded-[14px] border border-line bg-white text-[15px] font-medium text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand-600"
            onCitySelect={city => {
              const center = CITY_CENTERS[city];
              if (center) setCityFlyTo(center);
            }}
          />
          <button
            onClick={() => setDrawerOpen(true)}
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border transition-colors ${
              activeFilterCount > 0 ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink'
            }`}
            aria-label={activeFilterCount > 0 ? `${t.filters} (${activeFilterCount})` : t.filters}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-accent-ink">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Row 3: Quick filters */}
        <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {quickFilters.map(q => (
            <button
              key={q.key}
              type="button"
              aria-pressed={q.active}
              onClick={q.toggle}
              className={`h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                q.active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Map + Bottom Sheet ── */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">

        {/* Map — shrinks as sheet rises */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            bottom: sheetHeight,
            transition: isDragging ? 'none' : 'bottom 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}>
          <MapVisualizer
            sublets={filteredSublets}
            onMarkerClick={handleMarkerClick}
            onDeselect={() => {
              setSelectedId(undefined);
              setSheetHeight(SNAP_HANDLE);
              sheetHRef.current = SNAP_HANDLE;
            }}
            selectedSubletId={selectedId}
            language={language}
            flyToCity={cityFlyTo}
            mapInstanceRef={mapInstanceRef}
          />
        </div>

        {/* Bottom Sheet */}
        <div
          className="absolute left-0 right-0 bottom-0 bg-white rounded-t-[20px] z-10 flex flex-col overflow-hidden"
          style={{
            height: sheetHeight,
            boxShadow: '0 -8px 24px rgba(0,0,0,0.08)',
            transition: isDragging
              ? 'none'
              : 'height 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s',
          }}>

          {/* Drag handle */}
          <div
            ref={handleRef}
            className="flex justify-center py-4 shrink-0 touch-none cursor-grab active:cursor-grabbing select-none">
            <div className="w-10 h-1 bg-line rounded-full" />
          </div>

          {/* Card zone */}
          {showCard && selectedSublet && (
            <div className="flex-1 overflow-hidden">
              <SelectedCard
                sublet={selectedSublet}
                currency={currency}
                isSaved={savedIds.has(selectedSublet.id)}
                onSave={e => handleSave(e, selectedSublet.id)}
                onNavigate={handleNavigateToListing}
              />
            </div>
          )}

          {/* List zone */}
          {showListingStrip && (
            <>
              <div className="px-4 pb-2 shrink-0 flex items-center justify-between">
                <p className="font-display text-lg font-extrabold text-ink">
                  {isLoading
                    ? <span className="inline-block w-24 h-4 bg-brand-50 rounded animate-pulse" />
                    : copy.resultsCount(filteredSublets.length)}
                </p>
                {activeFilterCount > 0 && (
                  <button onClick={handleClearFilters} className="py-2 text-[13px] font-semibold text-brand-700">
                    {copy.clearFilters}
                  </button>
                )}
              </div>

              <div
                ref={cardListRef}
                className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4"
                style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
                <div className="flex gap-3 h-full items-start">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-52 overflow-hidden rounded-2xl border border-line bg-white animate-pulse">
                          <div className="aspect-[4/3] bg-brand-50" />
                          <div className="p-2.5 space-y-1.5">
                            <div className="h-3 bg-brand-50 rounded w-3/4" />
                            <div className="h-2 bg-brand-50 rounded w-1/2" />
                          </div>
                        </div>
                      ))
                    : filteredSublets.length === 0
                    ? (
                        <div className="flex items-center justify-center w-full py-8">
                          <div className="text-center">
                            <p className="font-display text-base font-bold text-ink">{copy.noResultsTitle}</p>
                            <p className="mt-1 text-xs text-muted">{copy.noResultsBody}</p>
                            {(activeFilterCount > 0 || searchQuery) && (
                              <button onClick={handleClearFilters}
                                className="mt-3 h-10 rounded-[10px] border border-line px-4 text-[13px] font-semibold text-brand-700">
                                {copy.clearFilters}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    : filteredSublets.map(s => (
                        <div key={s.id} ref={el => { cardRefs.current[s.id] = el; }}>
                          <MiniCard
                            sublet={s}
                            isSelected={selectedId === s.id}
                            isSaved={savedIds.has(s.id)}
                            currency={currency}
                            onTap={() => {
                              setSelectedId(s.id);
                              setSheetHeight(SNAP_CARD);
                              sheetHRef.current = SNAP_CARD;
                            }}
                            onSave={e => handleSave(e, s.id)}
                            onNavigate={handleNavigateToListing}
                          />
                        </div>
                      ))
                  }
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <MobileTabBar variant="embedded" />

      {/* ── Filters Drawer ── */}
      <FiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onClear={handleClearFilters}
        resultCount={filteredSublets.length}
      />

      {/* Auth modal — save flow */}
      {showSignInModal && (
        <AuthModal
          reason="save"
          initialMode="signup"
          onSuccess={() => setToastMessage('Saved ♡')}
          onClose={closeSignInModal}
        />
      )}

      {/* Auth modal — header sign in */}
      {headerAuthOpen && (
        <AuthModal reason="general" initialMode="signup" onClose={() => setHeaderAuthOpen(false)} />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  );
}
