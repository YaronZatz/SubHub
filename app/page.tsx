
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Sublet, Filters, ListingStatus, SubletType, Language, DateMode, ViewMode, CurrencyCode, RentTerm } from '../types';
import { translations } from '../translations';
import { GLOBAL_CITIES } from '../constants';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { persistenceService } from '../services/persistenceService';
import { formatPrice } from '../utils/formatters';
import { 
  FilterIcon, 
  ListIcon,
  PlusIcon, 
  SearchIcon, 
  HeartIcon,
  CalendarIcon
} from '../components/Icons';

// Leaflet uses `window` at load time; load map only on client to avoid prerender error
const MapVisualizer = dynamic(() => import('../components/MapVisualizer'), { ssr: false });
import AddListingModal from '../components/AddListingModal';
import ListingCarousel from '../components/ListingCarousel';
import PriceRangeFilter from '../components/PriceRangeFilter';
import CityAutocomplete from '../components/CityAutocomplete';
import EditListingModal from '../components/EditListingModal';
import SubletDetailPage from '../components/SubletDetailPage';
import FeatureIcons from '../components/FeatureIcons';
import CurrencySwitcher from '../components/CurrencySwitcher';
import LanguageSwitcher from '../components/LanguageSwitcher';
import AuthModal from '../components/AuthModal';
import MapPreviewCard from '../components/MapPreviewCard';

/** ~6 months in days; used to classify short-term vs long-term */
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
  const yearMatch = duration.match(/(\d+)\s*year/);
  if (yearMatch) return parseInt(yearMatch[1], 10) * 365;
  return null;
}

const INITIAL_FILTERS: Filters = {
  minPrice: 0,
  maxPrice: 20000,
  showTaken: false,
  type: undefined,
  city: '',
  neighborhood: '',
  startDate: '',
  endDate: '',
  dateMode: DateMode.FLEXIBLE,
  petsAllowed: false,
  rentTerm: RentTerm.ALL
};

export default function Home() {
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubletId, setSelectedSubletId] = useState<string | undefined>();
  const [mapSelectedSubletId, setMapSelectedSubletId] = useState<string | undefined>();
  const [detailSublet, setDetailSublet] = useState<Sublet | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.BROWSE);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguageState] = useState<Language>(Language.EN);
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(new Set());
  const [showMapView, setShowMapView] = useState(true);
  
  const { currency } = useCurrency();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isUserMenuOpen]);
  
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);

  const handleClearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setSearchQuery('');
  };

  const t = translations[language] || translations[Language.EN];

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await persistenceService.fetchListings();
        setSublets(data);
      } catch (err) {
        console.error("Data loading failed", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredSublets = useMemo(() => {
    let list = sublets;
    if (viewMode === ViewMode.SAVED) {
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
      const matchesDates = !filters.startDate || !filters.endDate || (s.startDate <= filters.endDate && s.endDate >= filters.startDate);
      const matchesPets = !filters.petsAllowed || (s.amenities?.some(a => /pet|dog|cat|friendly|חיית|כלב|חתול/i.test(a)) ?? true);
      const rentTerm = filters.rentTerm ?? RentTerm.ALL;
      const matchesRentTerm = rentTerm === RentTerm.ALL || (() => {
        const days = getListingDurationDays(s);
        if (days == null) return true;
        if (rentTerm === RentTerm.SHORT_TERM) return days <= SHORT_TERM_DAYS;
        return days > SHORT_TERM_DAYS;
      })();
      return matchesSearch && matchesPrice && matchesStatus && matchesType && matchesCity && matchesNeighborhood && matchesDates && matchesPets && matchesRentTerm;
    });
  }, [sublets, filters, searchQuery, viewMode, savedListingIds]);

  const cityOptions = useMemo(() => {
    const invalidCityPattern = /^(start_date|end_date|price|location|type|amenities|currency|images?)(:.*)?$/i;
    const fromSublets = new Set(
      sublets.map(s => s.city).filter(c => c && !invalidCityPattern.test(c.trim()))
    );
    return Array.from(new Set([...GLOBAL_CITIES, ...fromSublets])).sort();
  }, [sublets]);

  const handleAddPostClick = () => {
    if (user) {
      setIsAddModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const addedAgo = (createdAt: number) => {
    const h = Math.max(0, Math.floor((Date.now() - createdAt) / (60 * 60 * 1000)));
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return d <= 1 ? '1d' : `${d}d`;
  };

  const toggleSaved = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedListingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const mapSelectedSublet = mapSelectedSubletId ? filteredSublets.find(s => s.id === mapSelectedSubletId) : undefined;

  return (
    <div data-root className="flex flex-col h-screen overflow-hidden bg-white">
      <header className="bg-white border-b border-slate-200 px-3 sm:px-4 md:px-6 py-1 flex flex-wrap items-center justify-between gap-2 sm:gap-3 z-[60] shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <div className="shrink-0">
            <img src="/logo.png" alt="SubHub" className="h-12 sm:h-16 w-auto object-contain" />
          </div>
          <div className="relative max-w-md w-full hidden md:block">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none border border-transparent focus:bg-white"
            />
          </div>
          <nav className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-0 sm:ml-2">
            <button
              onClick={() => setViewMode(ViewMode.BROWSE)}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${viewMode === ViewMode.BROWSE ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {t.browse}
            </button>
            <button
              onClick={() => setViewMode(ViewMode.SAVED)}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-1 sm:gap-1.5 ${viewMode === ViewMode.SAVED ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <HeartIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" filled={viewMode === ViewMode.SAVED} />
              <span className="hidden sm:inline">{t.savedListings}</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 shrink-0 pl-0 sm:pl-2 md:pl-4 md:border-l md:border-slate-200">
          <button 
            onClick={handleAddPostClick}
            className="bg-indigo-600 text-white p-2 sm:px-4 sm:py-2.5 rounded-full hover:bg-indigo-700 transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-indigo-100 active:scale-95 font-bold text-xs sm:text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.addPost}</span>
          </button>
          
          <div className="flex items-center gap-1 sm:gap-2 border-l border-slate-200 pl-1.5 sm:pl-2 md:pl-4">
            <LanguageSwitcher language={language} setLanguage={setLanguageState} />
            <CurrencySwitcher />
          </div>

          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(v => !v)}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm border-2 border-white shadow-sm shrink-0 hover:bg-slate-700 transition-colors"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[200]">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { logout(); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)} 
              className="text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-indigo-50 hover:bg-indigo-50"
            >
              Log In
            </button>
          )}
        </div>
      </header>

      <div className="bg-slate-50 border-b border-slate-100 px-3 sm:px-6 py-1.5 sm:py-2 flex items-center justify-center">
        <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">{t.aiPowered}</p>
      </div>

      <main className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
        <aside className="listings-panel flex-1 min-h-0 min-w-0 bg-white md:border-r border-slate-200 flex flex-col shadow-xl relative z-10 overflow-hidden order-2 md:order-1">
           <div className="p-3 md:p-4 border-b border-slate-100 bg-white">
             <div className="flex items-center justify-between mb-2 md:mb-3">
               <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight">{t.results}</h2>
               <div className="flex items-center gap-1.5 sm:gap-2">
                 <button
                   onClick={() => setShowMapView(!showMapView)}
                   className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 text-sm font-bold ${showMapView ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}
                   title={showMapView ? 'List only' : 'Show map'}
                   aria-label={showMapView ? 'Switch to list only view' : 'Switch to map view'}
                 >
                   <ListIcon className="w-4 h-4" />
                   <span className="hidden sm:inline">{showMapView ? 'List only' : 'Map'}</span>
                 </button>
                 <button 
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
                    className={`p-2.5 rounded-xl transition-all flex items-center gap-2 text-sm font-bold ${isFilterExpanded ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                 >
                    <FilterIcon className="w-4 h-4" />
                    {t.filters}
                 </button>
               </div>
             </div>
             <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-2 md:mb-3">{filteredSublets.length} {t.results}</p>
             <div className="relative md:hidden">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none border border-transparent focus:bg-white"
                />
             </div>
             {isFilterExpanded && (
               <div className="filter-panel mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 max-h-[40vh] md:max-h-[65vh] overflow-y-auto custom-scrollbar">
                 <PriceRangeFilter
                   min={filters.minPrice}
                   max={filters.maxPrice}
                   minLimit={0}
                   maxLimit={20000}
                   language={language}
                   onChange={(min, max) => setFilters(f => ({ ...f, minPrice: min, maxPrice: max }))}
                 />

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.type}</label>
                   <select
                     value={filters.type ?? ''}
                     onChange={(e) => setFilters(f => ({ ...f, type: e.target.value ? (e.target.value as SubletType) : undefined }))}
                     className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                   >
                     <option value="">{t.allTypes}</option>
                     {[SubletType.ENTIRE, SubletType.ROOMMATE, SubletType.STUDIO].map(type => (
                       <option key={type} value={type}>{(t as { subletTypes: Record<SubletType, string> }).subletTypes[type]}</option>
                     ))}
                   </select>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.rentTermLabel}</label>
                   <div className="flex flex-wrap gap-2">
                     {([RentTerm.ALL, RentTerm.SHORT_TERM, RentTerm.LONG_TERM] as const).map((term) => (
                       <button
                         key={term}
                         type="button"
                         onClick={() => setFilters(f => ({ ...f, rentTerm: term }))}
                         className={`flex-1 min-w-0 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap
                           ${(filters.rentTerm ?? RentTerm.ALL) === term ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                       >
                         {(t as { rentTerms: Record<RentTerm, string> }).rentTerms[term]}
                       </button>
                     ))}
                   </div>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.city}</label>
                   <CityAutocomplete
                     value={filters.city}
                     options={cityOptions}
                     placeholder={t.allCities}
                     onChange={(city) => setFilters(f => ({ ...f, city }))}
                     onCitySelect={(city) => setFilters(f => ({ ...f, city, neighborhood: '' }))}
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.neighborhood}</label>
                   <input
                     type="text"
                     placeholder={t.allNeighborhoods}
                     value={filters.neighborhood}
                     onChange={(e) => setFilters(f => ({ ...f, neighborhood: e.target.value }))}
                     className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.dateMode}</label>
                   <select
                     value={filters.dateMode}
                     onChange={(e) => setFilters(f => ({ ...f, dateMode: e.target.value as DateMode }))}
                     className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                   >
                     <option value={DateMode.EXACT}>{t.exact}</option>
                     <option value={DateMode.FLEXIBLE}>{t.flexible}</option>
                   </select>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.startDate}</label>
                     <input
                       type="date"
                       value={filters.startDate}
                       onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                       className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                     />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.endDate}</label>
                     <input
                       type="date"
                       value={filters.endDate}
                       onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                       className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                     />
                   </div>
                 </div>

                 <div className="flex items-center gap-2">
                   <input
                     type="checkbox"
                     id="filter-pets"
                     checked={filters.petsAllowed}
                     onChange={(e) => setFilters(f => ({ ...f, petsAllowed: e.target.checked }))}
                     className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                   />
                   <label htmlFor="filter-pets" className="text-xs font-bold text-slate-600">{t.petsAllowed}</label>
                 </div>

                 <div className="flex items-center gap-2 pt-1">
                   <input
                     type="checkbox"
                     id="show-taken"
                     checked={filters.showTaken}
                     onChange={(e) => setFilters(f => ({ ...f, showTaken: e.target.checked }))}
                     className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                   />
                   <label htmlFor="show-taken" className="text-xs font-bold text-slate-600">{t.showTaken}</label>
                 </div>

                 <div className="pt-3 border-t border-slate-200">
                   <button
                     type="button"
                     onClick={handleClearFilters}
                     className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                     aria-label={t.clearFilters}
                   >
                     {t.clearFilters}
                   </button>
                 </div>
               </div>
             )}
           </div>
           
           <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar bg-slate-50/30 min-h-0">
             {isLoading ? (
               <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Scanning map...</p>
               </div>
             ) : filteredSublets.length > 0 ? (
               <div className="grid grid-cols-2 gap-3 md:gap-4">
               {filteredSublets.map(sublet => (
                 <div 
                   key={sublet.id} 
                   onClick={() => { setDetailSublet(sublet); setMapSelectedSubletId(undefined); setSelectedSubletId(undefined); }}
                   className={`rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl bg-white border ${selectedSubletId === sublet.id ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-lg' : 'border-slate-100 shadow-sm'}`}
                 >
                   <div className="relative aspect-[3/2] md:aspect-[4/3] bg-slate-100">
                     <ListingCarousel id={sublet.id} images={sublet.images} sourceUrl={sublet.sourceUrl} photoCount={sublet.photoCount} aspectRatio="" className="w-full h-full object-cover" />
                     <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-indigo-600/90 text-white text-[10px] font-bold">
                       • Added {addedAgo(sublet.createdAt)} ago
                     </span>
                     <button
                       onClick={(e) => toggleSaved(e, sublet.id)}
                       className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm"
                     >
                       <HeartIcon className="w-4 h-4" filled={savedListingIds.has(sublet.id)} />
                     </button>
                   </div>
                   <div className="p-4">
                     <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-2">
                       {String(sublet.type).toUpperCase()}
                     </span>
                     <div className="flex justify-between items-baseline gap-2 mb-1">
                       <span className="text-lg font-black text-indigo-600">{formatPrice(sublet.price, currency, language)}</span>
                     </div>
                     <h3 className="font-bold text-slate-900 line-clamp-1 text-sm">{sublet.location}</h3>
                     {sublet.neighborhood && (
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{sublet.neighborhood}</p>
                     )}
                     <FeatureIcons apartment_details={sublet.apartment_details} className="mt-1.5" />
                     <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                       <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                       <span>{sublet.startDate} – {sublet.endDate}</span>
                     </div>
                   </div>
                 </div>
               ))}
               </div>
             ) : (
               <div className="text-center py-10">
                  <p className="text-slate-400 text-sm font-medium">{t.noResults}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.noResultsDesc}</p>
               </div>
             )}
           </div>
        </aside>

        {showMapView && (
        <div className="map-area h-[26vh] sm:h-[28vh] md:h-full md:flex-[0_0_45%] md:min-w-[280px] relative bg-slate-50 shrink-0 order-1 md:order-2">
           <MapVisualizer
             sublets={filteredSublets}
             onMarkerClick={(s) => { setSelectedSubletId(s.id); setMapSelectedSubletId(s.id); }}
             selectedSubletId={selectedSubletId}
             language={language}
           />
           {mapSelectedSublet && (
             <MapPreviewCard
               sublet={mapSelectedSublet}
               onClose={() => { setMapSelectedSubletId(undefined); setSelectedSubletId(undefined); }}
               onOpenDetail={() => { setDetailSublet(mapSelectedSublet); setMapSelectedSubletId(undefined); setSelectedSubletId(undefined); }}
               isSaved={savedListingIds.has(mapSelectedSublet.id)}
               onToggleSave={(e) => toggleSaved(e, mapSelectedSublet.id)}
               currency={currency}
               language={language}
             />
           )}
        </div>
      )}
      </main>

      {isAddModalOpen && user && (
        <AddListingModal 
          onAdd={(s) => {setSublets([s, ...sublets]); setIsAddModalOpen(false);}}
          onClose={() => setIsAddModalOpen(false)}
          language={language}
          currentUser={user}
        />
      )}
      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}

      {detailSublet && (
        <SubletDetailPage
          sublet={detailSublet}
          onClose={() => setDetailSublet(null)}
          language={language}
          currentUserId={user?.id ?? ''}
          onClaim={() => {}}
          onEdit={(id) => setDetailSublet(null)}
        />
      )}
    </div>
  );
}
