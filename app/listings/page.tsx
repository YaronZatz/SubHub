'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Sublet, Filters, ListingStatus, Language, DateMode, RentTerm, SubletType } from '@/types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { persistenceService } from '@/services/persistenceService';
import { formatPrice } from '@/utils/formatters';
import { translations } from '@/translations';
import { localizedLocation, localizedNeighborhood } from '@/lib/locationUtils';
import { HeartIcon } from '@/components/Icons';
import ListingCarousel from '@/components/ListingCarousel';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CurrencySwitcher from '@/components/CurrencySwitcher';
import AuthModal from '@/components/shared/AuthModal';
import PostListingModal from '@/components/PostListingModal';
import { useSaved } from '@/contexts/SavedContext';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import { GLOBAL_CITIES, CITY_CENTERS, MAP_CENTER, MAP_ZOOM } from '@/constants';

const MapVisualizer = dynamic(() => import('@/components/MapVisualizer'), { ssr: false });
const SubletDetailPage = dynamic(() => import('@/components/SubletDetailPage'), { ssr: false });

const SHORT_TERM_DAYS = 183;

function getListingDurationDays(s: Sublet): number | null {
  const start = s.startDate && /^\d{4}-\d{2}-\d{2}$/.test(s.startDate) ? new Date(s.startDate).getTime() : null;
  const end = s.endDate && /^\d{4}-\d{2}-\d{2}$/.test(s.endDate) ? new Date(s.endDate).getTime() : null;
  if (start != null && end != null && end >= start) return Math.round((end - start) / (24 * 60 * 60 * 1000));
  const duration = s.parsedDates?.duration?.toLowerCase() ?? '';
  const monthMatch = duration.match(/(\d+)\s*month/);
  if (monthMatch) return parseInt(monthMatch[1], 10) * 30;
  const weekMatch = duration.match(/(\d+)\s*week/);
  if (weekMatch) return parseInt(weekMatch[1], 10) * 7;
  return null;
}

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
};

export default function ListingsPage() {
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapSelectedSubletId, setMapSelectedSubletId] = useState<string | undefined>();
  const [cityFlyTo, setCityFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [detailSublet, setDetailSublet] = useState<Sublet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { language, setLanguage } = useLanguage();
  const t = translations[language];
  const { savedIds: savedListingIds, toggle: toggleSavedById, showSignInModal, closeSignInModal } = useSaved();
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editListing, setEditListing] = useState<Sublet | null>(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const { currency } = useCurrency();
  const { user, logout } = useAuth();

  const handleAddPostClick = () => {
    if (user) {
      setIsAddModalOpen(true);
    } else {
      setOpenAddModalAfterAuth(true);
      setIsAuthModalOpen(true);
    }
  };
  const [openAddModalAfterAuth, setOpenAddModalAfterAuth] = useState(false);

  // Real-time listings listener — updates automatically when new listings are posted
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = persistenceService.onListingsChanged((data) => {
      setSublets(data);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // Filtered listings
  const filteredSublets = useMemo(() => {
    let list = sublets;
    if (showSavedOnly) {
      list = list.filter(s => savedListingIds.has(s.id));
    }
    return list.filter(s => {
      const matchesSearch = s.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.city?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (s.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPrice = s.price >= filters.minPrice && s.price <= filters.maxPrice;
      const matchesStatus = filters.showTaken || s.status !== ListingStatus.TAKEN;
      const matchesType = !filters.type || s.type === filters.type;
      const matchesCity = !filters.city.trim() || (s.city?.toLowerCase().includes(filters.city.toLowerCase()));
      const matchesNeighborhood = !filters.neighborhood.trim() || (s.neighborhood?.toLowerCase().includes(filters.neighborhood.toLowerCase()));
      const matchesPets = !filters.petsAllowed || (s.amenities?.some((a: string) => /pet|dog|cat|friendly|חיית|כלב|חתול/i.test(a)) ?? true);
      const rentTerm = filters.rentTerm ?? RentTerm.ALL;
      const matchesRentTerm = rentTerm === RentTerm.ALL || (() => {
        const days = getListingDurationDays(s);
        if (days == null) return true;
        if (rentTerm === RentTerm.SHORT_TERM) return days <= SHORT_TERM_DAYS;
        return days > SHORT_TERM_DAYS;
      })();
      let matchesPostedWithin = true;
      if (filters.postedWithin && filters.postedWithin !== 'all') {
        const durations: Record<string, number> = {
          '1h':  1 * 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
          '7d':  7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        };
        const cutoff = Date.now() - (durations[filters.postedWithin] ?? 0);
        matchesPostedWithin = s.createdAt >= cutoff;
      }
      return matchesSearch && matchesPrice && matchesStatus && matchesType && matchesCity && matchesNeighborhood && matchesPets && matchesRentTerm && matchesPostedWithin;
    });
  }, [sublets, filters, searchQuery, showSavedOnly, savedListingIds]);

  const activeFilterCount = [
    filters.minPrice !== 0,
    filters.maxPrice !== 30000,
    !!filters.type,
    !!filters.city,
    !!filters.neighborhood,
    filters.petsAllowed,
    filters.showTaken,
    (filters.rentTerm ?? RentTerm.ALL) !== RentTerm.ALL,
    (filters.postedWithin ?? 'all') !== 'all',
  ].filter(Boolean).length;

  const toggleSaved = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleSavedById(id);
  };

  const getTimeAgo = (sublet: { createdAt: number; postedAt?: string | null }) => {
    const postTs = sublet.postedAt ? (new Date(sublet.postedAt).getTime() || sublet.createdAt) : sublet.createdAt;
    const h = Math.max(0, Math.floor((Date.now() - postTs) / (60 * 60 * 1000)));
    const d = Math.max(1, Math.floor(h / 24));
    return { h, d, isNew: h < 24 };
  };

  return (
    <div className="font-sans bg-white text-slate-900 h-screen flex flex-col overflow-hidden">
      {/* Top Bar — Row 1: logo + search + count */}
      <div className="shrink-0 bg-white z-30 border-b border-slate-200">
        <div className="flex items-center gap-4 px-4 py-2">
          <a href="/" className="shrink-0">
            <img src="/logo.png" alt="SubHub" className="h-16 w-auto mix-blend-multiply" />
          </a>
          <div className="flex-1 max-w-xl">
            <SearchAutocomplete
              value={searchQuery}
              onChange={setSearchQuery}
              sublets={sublets}
              onCitySelect={(city) => {
                setSearchQuery(city);
                const center = CITY_CENTERS[city];
                if (center) setCityFlyTo({ ...center });
              }}
              className="w-full"
              inputClassName="w-full py-2 bg-slate-50 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#4A7CC7]/20 outline-none border border-slate-200 focus:border-[#4A7CC7] transition-all"
              placeholder="Search cities, neighborhoods..."
            />
          </div>
          <span className="text-sm font-bold text-slate-500 whitespace-nowrap">
            {isLoading ? '...' : filteredSublets.length} listings
          </span>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 shrink-0" />

          {/* Saved Listings */}
          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={`shrink-0 flex items-center gap-1.5 text-sm font-semibold transition-all whitespace-nowrap ${
              showSavedOnly ? 'text-red-500' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <HeartIcon className={`w-4 h-4 ${showSavedOnly ? 'fill-red-500 text-red-500' : ''}`} />
            Saved
          </button>

          {/* Add Post */}
          <button
            onClick={handleAddPostClick}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#2F6EA8] text-white rounded-lg text-sm font-bold hover:bg-[#2F6EA8]/90 transition-all shadow-sm whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Post
          </button>

          {/* Language Switcher */}
          <LanguageSwitcher language={language} setLanguage={setLanguage} />

          {/* Currency Switcher */}
          <CurrencySwitcher />

          {/* Log In / User */}
          {user ? (
            <button
              onClick={logout}
              className="shrink-0 text-sm font-bold text-[#2F6EA8] hover:text-[#2F6EA8]/80 transition-colors whitespace-nowrap"
            >
              Log Out
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="shrink-0 text-sm font-bold text-[#2F6EA8] hover:text-[#2F6EA8]/80 transition-colors whitespace-nowrap"
            >
              Log In
            </button>
          )}
        </div>

        {/* Row 2: Filter pill buttons */}
        <div className="flex items-center gap-2 px-4 pb-2.5 overflow-x-auto">
          {/* Price */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filters.minPrice !== 0 || filters.maxPrice !== 30000
                ? 'bg-[#2F6EA8]/10 border-[#2F6EA8] text-[#2F6EA8]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {filters.minPrice !== 0 || filters.maxPrice !== 30000
              ? `$${filters.minPrice.toLocaleString()} – $${filters.maxPrice >= 30000 ? '30k+' : filters.maxPrice.toLocaleString()}`
              : 'Price'}
          </button>

          {/* Property Type */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filters.type
                ? 'bg-[#2F6EA8]/10 border-[#2F6EA8] text-[#2F6EA8]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 3h13.5M5.25 21V6.75" /></svg>
            {filters.type || 'Type'}
          </button>

          {/* Rental Duration */}
          {[
            { key: RentTerm.ALL, label: 'All Durations' },
            { key: RentTerm.SHORT_TERM, label: 'Short Term' },
            { key: RentTerm.LONG_TERM, label: 'Long Term' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilters(f => ({ ...f, rentTerm: key }))}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                (filters.rentTerm ?? RentTerm.ALL) === key
                  ? 'bg-[#2F6EA8] border-[#2F6EA8] text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}

          {/* Posted Within */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filters.postedWithin && filters.postedWithin !== 'all'
                ? 'bg-[#2F6EA8]/10 border-[#2F6EA8] text-[#2F6EA8]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {filters.postedWithin && filters.postedWithin !== 'all'
              ? { '1h': 'Last hour', '24h': 'Last 24h', '7d': 'Last 7d', '30d': 'Last 30d' }[filters.postedWithin] || 'Recent'
              : 'Recency'}
          </button>

          {/* Pet Friendly */}
          <button
            onClick={() => setFilters(f => ({ ...f, petsAllowed: !f.petsAllowed }))}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filters.petsAllowed
                ? 'bg-[#2F6EA8]/10 border-[#2F6EA8] text-[#2F6EA8]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🐾 Pet Friendly
          </button>

          {/* More Filters */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeFilterCount > 0
                ? 'bg-[#2F6EA8]/10 border-[#2F6EA8] text-[#2F6EA8]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
            More Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>

          {/* Clear all (only when filters active) */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFilters(INITIAL_FILTERS); setSearchQuery(''); }}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold text-red-500 hover:bg-red-50 transition-all"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Full-screen split: Cards | Map */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Scrollable Listing Cards */}
        <div className="w-full lg:w-[50%] xl:w-[45%] overflow-y-auto border-r border-slate-200">
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse bg-slate-100 rounded-2xl h-72" />
              ))
            ) : filteredSublets.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="font-bold text-lg">No listings found</p>
                <p className="text-sm">Try adjusting your search</p>
              </div>
            ) : (
              filteredSublets.map((sublet) => (
                <div
                  key={sublet.id}
                  onClick={() => setDetailSublet(sublet)}
                  onMouseEnter={() => setMapSelectedSubletId(sublet.id)}
                  onMouseLeave={() => setMapSelectedSubletId(undefined)}
                  className={`group cursor-pointer bg-white rounded-2xl border transition-all duration-200 overflow-hidden hover:shadow-lg ${
                    mapSelectedSubletId === sublet.id ? 'border-[#4A7CC7] shadow-lg ring-2 ring-[#4A7CC7]/20' : 'border-slate-200'
                  }`}
                >
                  <div className="relative">
                    <ListingCarousel
                      id={sublet.id}
                      images={sublet.images}
                      sourceUrl={sublet.sourceUrl}
                      photoCount={sublet.photoCount}
                      aspectRatio="aspect-[4/3]"
                      className="rounded-t-2xl"
                    />
                    <button
                      onClick={(e) => toggleSaved(e, sublet.id)}
                      className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-all"
                    >
                      <HeartIcon className={`w-4 h-4 ${
                        savedListingIds.has(sublet.id) ? 'fill-red-500 text-red-500' : 'text-slate-600'
                      }`} />
                    </button>
                    {(() => { const { h, d, isNew } = getTimeAgo(sublet); return isNew ? (
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-cyan-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg animate-pulse ring-2 ring-cyan-100">
                        <span className="w-1 h-1 bg-white rounded-full" />
                        Added {h}h ago
                      </div>
                    ) : (
                      <div className="absolute top-3 left-3 z-10 bg-slate-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        Added {d > 30 ? '30+' : d}d ago
                      </div>
                    ); })()}
                    {sublet.status === ListingStatus.TAKEN && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase">Taken</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate pr-2">{localizedLocation(sublet, language)}</h3>
                      <span className="text-[#4A7CC7] font-black text-sm whitespace-nowrap">
                        {formatPrice(sublet.price, currency, language, sublet.currency)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2 truncate">{localizedNeighborhood(sublet, language) || sublet.city}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#4A7CC7]/10 text-[#4A7CC7]">
                        {t.subletTypes[sublet.type]}
                      </span>
                      {sublet.startDate && (
                        <span className="text-[10px] text-slate-400 font-medium">From {sublet.startDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Map fills remaining space */}
        <div className="hidden lg:block flex-1">
          <MapVisualizer
            sublets={filteredSublets}
            onMarkerClick={(sublet) => setDetailSublet(sublet)}
            selectedSubletId={mapSelectedSubletId}
            language={language}
            flyToCity={cityFlyTo}
          />
        </div>
      </div>

      {/* ===== FILTER DRAWER ===== */}
      {isFilterOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setIsFilterOpen(false)}
          />
          {/* Drawer */}
          <aside className="fixed top-0 right-0 bottom-0 z-[60] w-full max-w-[480px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Refine Your Search</h2>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">

              {/* Price Range */}
              <section className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Price Range</label>
                  <span className="text-sm font-medium text-[#2F6EA8]">
                    ${filters.minPrice.toLocaleString()} — ${filters.maxPrice >= 30000 ? '30,000+' : filters.maxPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={e => setFilters(f => ({ ...f, minPrice: Number(e.target.value) || 0 }))}
                    placeholder="Min"
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2F6EA8]/20 focus:border-[#2F6EA8] outline-none"
                  />
                  <span className="self-center text-slate-300">—</span>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={e => setFilters(f => ({ ...f, maxPrice: Number(e.target.value) || 30000 }))}
                    placeholder="Max"
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2F6EA8]/20 focus:border-[#2F6EA8] outline-none"
                  />
                </div>
              </section>

              {/* Rental Duration */}
              <section className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Rental Duration</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: RentTerm.ALL, label: 'All', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
                    { key: RentTerm.SHORT_TERM, label: 'Short Term', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
                    { key: RentTerm.LONG_TERM, label: 'Long Term', icon: 'M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819' },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setFilters(f => ({ ...f, rentTerm: key }))}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        (filters.rentTerm ?? RentTerm.ALL) === key
                          ? 'border-[#2F6EA8] bg-[#2F6EA8]/5 text-[#2F6EA8]'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                      </svg>
                      <span className="text-xs font-semibold">{label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Property Type */}
              <section className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Property Type</label>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { key: undefined as SubletType | undefined, label: 'All', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
                    { key: SubletType.ENTIRE, label: 'Apartment', icon: 'M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 3h13.5M5.25 21V6.75A2.25 2.25 0 017.5 4.5h9A2.25 2.25 0 0118.75 6.75V21' },
                    { key: SubletType.ROOMMATE, label: 'Roommate', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z' },
                    { key: SubletType.STUDIO, label: 'Studio', icon: 'M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z' },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={label}
                      onClick={() => setFilters(f => ({ ...f, type: key }))}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        filters.type === key
                          ? 'bg-[#2F6EA8] text-white shadow-md'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-[#2F6EA8]/10 group-hover:text-[#2F6EA8]'
                      }`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                        </svg>
                      </div>
                      <span className={`text-[10px] font-semibold ${
                        filters.type === key ? 'text-[#2F6EA8] font-bold' : 'text-slate-500'
                      }`}>{label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Dates */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Move-in Date</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Flexible</span>
                    <button
                      onClick={() => setFilters(f => ({ ...f, dateMode: f.dateMode === DateMode.FLEXIBLE ? DateMode.EXACT : DateMode.FLEXIBLE }))}
                      className={`w-9 h-5 rounded-full relative transition-colors ${
                        filters.dateMode === DateMode.FLEXIBLE ? 'bg-[#2F6EA8]' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        filters.dateMode === DateMode.FLEXIBLE ? 'right-0.5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 p-3 rounded-lg bg-slate-50 border border-transparent focus-within:border-[#2F6EA8] transition-all">
                    <span className="text-[10px] block text-slate-400 uppercase font-bold">Start Date</span>
                    <input
                      type="date"
                      value={filters.startDate || ''}
                      onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                      className="bg-transparent border-none p-0 text-sm font-medium focus:ring-0 w-full text-slate-900"
                    />
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-slate-50 border border-transparent focus-within:border-[#2F6EA8] transition-all">
                    <span className="text-[10px] block text-slate-400 uppercase font-bold">End Date</span>
                    <input
                      type="date"
                      value={filters.endDate || ''}
                      onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                      className="bg-transparent border-none p-0 text-sm font-medium focus:ring-0 w-full text-slate-900"
                    />
                  </div>
                </div>
              </section>

              {/* Posted Within */}
              <section className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Posted Within</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'all', label: 'Any time' },
                    { key: '1h', label: 'Last hour' },
                    { key: '24h', label: 'Last 24h' },
                    { key: '7d', label: 'Last 7 days' },
                    { key: '30d', label: 'Last 30 days' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilters(f => ({ ...f, postedWithin: key }))}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        (filters.postedWithin ?? 'all') === key
                          ? 'bg-[#2F6EA8] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-transparent'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Amenities */}
              <section className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Amenities</label>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.petsAllowed}
                      onChange={e => setFilters(f => ({ ...f, petsAllowed: e.target.checked }))}
                      className="w-5 h-5 rounded border-slate-300 text-[#2F6EA8] focus:ring-[#2F6EA8]/20"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-[#2F6EA8] transition-colors">Pet Friendly</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.showTaken}
                      onChange={e => setFilters(f => ({ ...f, showTaken: e.target.checked }))}
                      className="w-5 h-5 rounded border-slate-300 text-[#2F6EA8] focus:ring-[#2F6EA8]/20"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-[#2F6EA8] transition-colors">Show Taken</span>
                  </label>
                </div>
              </section>

              {/* Neighborhood */}
              <section className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Neighborhood</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <input
                    type="text"
                    value={filters.neighborhood}
                    onChange={e => setFilters(f => ({ ...f, neighborhood: e.target.value }))}
                    placeholder="Filter by neighborhood..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[#2F6EA8]/20"
                  />
                </div>
              </section>

            </div>

            {/* Footer */}
            <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setFilters(INITIAL_FILTERS);
                  setSearchQuery('');
                }}
                className="text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="flex items-center gap-2 px-8 py-3.5 bg-[#2F6EA8] text-white rounded-xl font-bold shadow-lg shadow-[#2F6EA8]/30 hover:bg-[#2F6EA8]/90 transition-all active:scale-95"
              >
                Show {filteredSublets.length} Results
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Listing Detail Overlay */}
      {detailSublet && (
        <SubletDetailPage
          sublet={detailSublet}
          onClose={() => setDetailSublet(null)}
          language={language}
          setLanguage={setLanguage}
          currentUserId={user?.id || ''}
          onClaim={() => {}}
          onEdit={(id) => {
            const listing = sublets.find(s => s.id === id);
            if (listing) { setDetailSublet(null); setEditListing(listing); }
          }}
        />
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal
          onClose={() => { setIsAuthModalOpen(false); setOpenAddModalAfterAuth(false); }}
          onSuccess={() => {
            setIsAuthModalOpen(false);
            if (openAddModalAfterAuth) {
              setOpenAddModalAfterAuth(false);
              setIsAddModalOpen(true);
            }
          }}
        />
      )}

      {/* Sign-in-to-save modal */}
      {showSignInModal && (
        <AuthModal reason="save" initialMode="signup" onClose={closeSignInModal} />
      )}

      {/* Post Listing Modal */}
      {isAddModalOpen && user && (
        <PostListingModal
          onAdd={(newSublet) => {
            setSublets(prev => [newSublet, ...prev]);
          }}
          onClose={() => setIsAddModalOpen(false)}
          onViewOnMap={(listing) => {
            setIsAddModalOpen(false);
            if (listing.lat && listing.lng) {
              setCityFlyTo({ lat: listing.lat, lng: listing.lng, zoom: 15 });
            }
          }}
          language={language}
          currentUserId={user.id}
          currentUserName={user.name}
        />
      )}

      {/* Edit Listing Modal */}
      {editListing && user && (
        <PostListingModal
          onAdd={() => {}}
          onClose={() => setEditListing(null)}
          onViewOnMap={(listing) => {
            setEditListing(null);
            if (listing.lat && listing.lng) {
              setCityFlyTo({ lat: listing.lat, lng: listing.lng, zoom: 15 });
            }
          }}
          onUpdate={(updated) => {
            setSublets(prev => prev.map(s => s.id === updated.id ? updated : s));
          }}
          existingListing={editListing}
          language={language}
          currentUserId={user.id}
          currentUserName={user.name}
        />
      )}
    </div>
  );
}
