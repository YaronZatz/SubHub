
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Sublet, Filters, ListingStatus, SubletType, Language, DateMode, ViewMode, CurrencyCode } from '../types';
import { translations } from '../translations';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { persistenceService } from '../services/persistenceService';
import { formatPrice } from '../utils/formatters';
import { 
  FilterIcon, 
  MapIcon, 
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
import EditListingModal from '../components/EditListingModal';
import SubletDetailPage from '../components/SubletDetailPage';
import CurrencySwitcher from '../components/CurrencySwitcher';
import LanguageSwitcher from '../components/LanguageSwitcher';
import AuthModal from '../components/AuthModal';

export default function Home() {
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubletId, setSelectedSubletId] = useState<string | undefined>();
  const [detailSublet, setDetailSublet] = useState<Sublet | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.BROWSE);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguageState] = useState<Language>(Language.EN);
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(new Set());
  
  const { currency } = useCurrency();
  const { user, logout } = useAuth();
  
  const [filters, setFilters] = useState<Filters>({
    minPrice: 0,
    maxPrice: 20000,
    showTaken: false,
    type: undefined,
    city: '',
    neighborhood: '',
    startDate: '',
    endDate: '',
    dateMode: DateMode.FLEXIBLE,
    petsAllowed: false
  });

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
      return matchesSearch && matchesPrice && matchesStatus && matchesType && matchesCity && matchesNeighborhood && matchesDates && matchesPets;
    });
  }, [sublets, filters, searchQuery, viewMode, savedListingIds]);

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

  const selectedSublet = selectedSubletId ? filteredSublets.find(s => s.id === selectedSubletId) : undefined;

  const openDetailFromPreview = () => {
    if (selectedSublet) setDetailSublet(selectedSublet);
  };

  return (
    <div data-root className="flex flex-col h-screen overflow-hidden bg-white">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-[60] shadow-sm">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-md">
              <MapIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight hidden sm:block">{t.appName}</h1>
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
          <nav className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={() => setViewMode(ViewMode.BROWSE)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === ViewMode.BROWSE ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {t.browse}
            </button>
            <button
              onClick={() => setViewMode(ViewMode.SAVED)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 ${viewMode === ViewMode.SAVED ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <HeartIcon className="w-4 h-4" filled={viewMode === ViewMode.SAVED} />
              {t.savedListings}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4 shrink-0 pl-4">
          <button 
            onClick={handleAddPostClick}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 font-bold text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{t.addPost}</span>
          </button>
          
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <LanguageSwitcher language={language} setLanguage={setLanguageState} />
            <CurrencySwitcher />
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button onClick={logout} className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors uppercase tracking-widest">Log Out</button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)} 
              className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors px-4 py-2 rounded-full border border-indigo-50 hover:bg-indigo-50"
            >
              Log In
            </button>
          )}
        </div>
      </header>

      <div className="bg-slate-50 border-b border-slate-100 px-6 py-2 flex items-center justify-center">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.aiPowered}</p>
      </div>

      <main className="flex flex-1 overflow-hidden">
        <aside className="listings-panel w-[450px] bg-white border-r border-slate-200 flex flex-col shadow-2xl relative z-10 shrink-0">
           <div className="p-4 border-b border-slate-100 bg-white">
             <div className="flex items-center justify-between mb-3">
               <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t.results}</h2>
               <button 
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
                  className={`p-2.5 rounded-xl transition-all flex items-center gap-2 text-sm font-bold ${isFilterExpanded ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                  <FilterIcon className="w-4 h-4" />
                  {t.filters}
               </button>
             </div>
             <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-3">{filteredSublets.length} {t.results}</p>
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
               <div className="filter-panel mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
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
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.city}</label>
                   <input
                     type="text"
                     placeholder={t.allCities}
                     value={filters.city}
                     onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                     className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
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
               </div>
             )}
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-slate-50/30">
             {isLoading ? (
               <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Scanning map...</p>
               </div>
             ) : filteredSublets.length > 0 ? (
               filteredSublets.map(sublet => (
                 <div 
                   key={sublet.id} 
                   onClick={() => setSelectedSubletId(sublet.id)}
                   className={`rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl bg-white border ${selectedSubletId === sublet.id ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-lg' : 'border-slate-100 shadow-sm'}`}
                 >
                   <div className="relative aspect-[4/3] bg-slate-100">
                     <ListingCarousel id={sublet.id} images={sublet.images} aspectRatio="aspect-[4/3]" className="w-full" />
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
                     <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                       <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                       <span>{sublet.startDate} – {sublet.endDate}</span>
                     </div>
                   </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-10">
                  <p className="text-slate-400 text-sm font-medium">{t.noResults}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.noResultsDesc}</p>
               </div>
             )}
             {selectedSublet && (
               <div
                 onClick={openDetailFromPreview}
                 className="sticky bottom-4 left-0 right-0 mt-4 p-0 rounded-2xl overflow-hidden bg-white border-2 border-indigo-200 shadow-xl cursor-pointer hover:shadow-2xl hover:border-indigo-400 transition-all active:scale-[0.98] ring-2 ring-indigo-100 z-20"
               >
                 <div className="flex">
                   <div className="w-24 h-20 shrink-0 bg-slate-100 overflow-hidden">
                     <img
                       src={selectedSublet.images?.[0] || `https://picsum.photos/seed/${selectedSublet.id}/240/160`}
                       alt=""
                       className="w-full h-full object-cover"
                     />
                   </div>
                   <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                     <span className="text-sm font-black text-indigo-600">{formatPrice(selectedSublet.price, currency, language)}</span>
                     <p className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">{selectedSublet.location}</p>
                     <p className="text-[10px] text-slate-500 mt-0.5">{selectedSublet.startDate} – {selectedSublet.endDate}</p>
                     <p className="text-[10px] text-indigo-600 font-bold mt-1">Tap to view full details →</p>
                   </div>
                 </div>
               </div>
             )}
           </div>
        </aside>

        <div className="map-area flex-1 relative bg-slate-50">
           <MapVisualizer 
             sublets={filteredSublets} 
             onMarkerClick={(s) => setSelectedSubletId(s.id)}
             selectedSubletId={selectedSubletId}
             language={language}
           />
        </div>
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
