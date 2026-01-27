
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  HeartIcon
} from '../components/Icons';

import MapVisualizer from '../components/MapVisualizer';
import AddListingModal from '../components/AddListingModal';
import EditListingModal from '../components/EditListingModal';
import SubletDetailPage from '../components/SubletDetailPage';
import CurrencySwitcher from '../components/CurrencySwitcher';
import LanguageSwitcher from '../components/LanguageSwitcher';
import AuthModal from '../components/AuthModal';

export default function Home() {
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubletId, setSelectedSubletId] = useState<string | undefined>();
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
                            s.originalText.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPrice = s.price >= filters.minPrice && s.price <= filters.maxPrice;
      const matchesStatus = filters.showTaken || s.status !== ListingStatus.TAKEN;
      return matchesSearch && matchesPrice && matchesStatus;
    });
  }, [sublets, filters, searchQuery, viewMode, savedListingIds]);

  const handleAddPostClick = () => {
    if (user) {
      setIsAddModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-[60] shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-md">
            <MapIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{t.appName}</h1>
        </div>

        <div className="flex items-center gap-4">
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

      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative bg-slate-50">
           <MapVisualizer 
             sublets={filteredSublets} 
             onMarkerClick={(s) => setSelectedSubletId(s.id)}
             selectedSubletId={selectedSubletId}
             language={language}
           />
        </div>
        
        <aside className="w-[450px] bg-white border-l border-slate-200 flex flex-col shadow-2xl relative z-10">
           <div className="p-6 border-b border-slate-50 bg-white">
             <div className="flex items-center justify-between mb-4">
               <div>
                  <h2 className="text-lg font-bold text-slate-900">{filteredSublets.length} {t.results}</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Available Sublets</p>
               </div>
               <button 
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
                  className={`p-2 rounded-lg transition-colors ${isFilterExpanded ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                  <FilterIcon className="w-4 h-4" />
               </button>
             </div>
             <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none border border-transparent focus:bg-white transition-all"
                />
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
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
                   className={`p-4 border rounded-2xl cursor-pointer transition-all hover:shadow-xl bg-white ${selectedSubletId === sublet.id ? 'border-indigo-600 ring-4 ring-indigo-50 scale-[1.02]' : 'border-slate-100 shadow-sm'}`}
                 >
                   <div className="flex justify-between items-start mb-2">
                     <h3 className="font-bold text-slate-900 line-clamp-1">{sublet.location}</h3>
                     <span className="text-indigo-600 font-black text-sm whitespace-nowrap ml-2">{formatPrice(sublet.price, currency, language)}</span>
                   </div>
                   <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{sublet.originalText}</p>
                 </div>
               ))
             ) : (
               <div className="text-center py-10">
                  <p className="text-slate-400 text-sm font-medium">No results found for your search.</p>
               </div>
             )}
           </div>
        </aside>
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
    </div>
  );
}
