
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sublet, Filters, ListingStatus, SubletType, Language, DateMode, ViewMode, CurrencyCode } from './types';
import { CITY_CENTERS, GLOBAL_CITIES } from './constants';
import MapVisualizer from './components/MapVisualizer';
import AddListingModal from './components/AddListingModal';
import EditListingModal from './components/EditListingModal';
import SubletDetailPage from './components/SubletDetailPage';
import PriceRangeFilter from './components/PriceRangeFilter';
import CityAutocomplete from './components/CityAutocomplete';
import CurrencySwitcher from './components/CurrencySwitcher';
import LanguageSwitcher from './components/LanguageSwitcher';
import ListingCarousel from './components/ListingCarousel';
import FeatureIcons from './components/FeatureIcons';
import AuthModal from './components/AuthModal';
import { CurrencyProvider, useCurrency } from './contexts/CurrencyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { persistenceService } from './services/persistenceService';
import { translations } from './translations';
import { formatPrice, formatDate } from './utils/formatters';
import { 
  FilterIcon, 
  MapIcon, 
  PlusIcon, 
  ExternalLinkIcon, 
  SearchIcon, 
  InfoIcon,
  HeartIcon,
  GithubIcon
} from './components/Icons';

const SAVED_STORAGE_KEY = 'subhub_saved_ids';
const LANG_STORAGE_KEY = 'subhub_language';

const AppContent: React.FC = () => {
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubletId, setSelectedSubletId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.BROWSE);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingSubletId, setEditingSubletId] = useState<string | undefined>();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Persist language choice
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return (saved as Language) || Language.EN;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  };

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(new Set());
  
  const { currency } = useCurrency();
  const { user, logout } = useAuth();
  
  // Ref to ensure we only check URL params once after data load
  const initialUrlCheckDone = useRef(false);

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
  const isRTL = language === Language.HE;
  const listContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_STORAGE_KEY);
    if (saved) {
      try {
        setSavedListingIds(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error("Failed to parse saved IDs", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(Array.from(savedListingIds)));
  }, [savedListingIds]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await persistenceService.fetchListings();
        setSublets(data);
      } catch (err) {
        console.error("Data loading failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Handle URL Deep Linking
  useEffect(() => {
    if (!isLoading && sublets.length > 0 && !initialUrlCheckDone.current) {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('id');
      
      if (idParam) {
        const found = sublets.find(s => s.id === idParam);
        if (found) {
          setSelectedSubletId(idParam);
          setViewMode(ViewMode.DETAIL);
        }
      }
      initialUrlCheckDone.current = true;
    }
  }, [isLoading, sublets]);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    // Add RTL-specific font if needed
    if (isRTL) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [language, isRTL]);

  useEffect(() => {
    if ((viewMode === ViewMode.BROWSE || viewMode === ViewMode.SAVED) && selectedSubletId && itemRefs.current[selectedSubletId]) {
      setTimeout(() => {
        itemRefs.current[selectedSubletId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [selectedSubletId, viewMode]);

  const toggleSaveListing = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedListingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setToast({ message: "Removed from saved", type: 'success' });
      } else {
        next.add(id);
        setToast({ message: "Saved successfully", type: 'success' });
      }
      return next;
    });
  };

  const filteredSublets = useMemo(() => {
    let list = sublets;
    if (viewMode === ViewMode.SAVED) {
      list = list.filter(s => savedListingIds.has(s.id));
    }

    return list.filter(s => {
      const matchesSearch = s.location.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            s.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.originalText.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPrice = s.price >= filters.minPrice && s.price <= filters.maxPrice;
      const matchesType = !filters.type || s.type === filters.type;
      const matchesStatus = filters.showTaken || s.status !== ListingStatus.TAKEN;
      const matchesCity = !filters.city || s.city?.toLowerCase() === filters.city.toLowerCase();
      const matchesNeighborhood = !filters.neighborhood || s.neighborhood?.toLowerCase() === filters.neighborhood.toLowerCase();
      
      const matchesPets = !filters.petsAllowed || (s.amenities && s.amenities.includes('petFriendly'));

      let matchesDates = true;
      if (filters.startDate || filters.endDate) {
        const filterStart = filters.startDate ? new Date(filters.startDate).getTime() : -Infinity;
        const filterEnd = filters.endDate ? new Date(filters.endDate).getTime() : Infinity;
        const subletStart = new Date(s.startDate).getTime();
        const subletEnd = s.endDate ? new Date(s.endDate).getTime() : subletStart + (30 * 24 * 60 * 60 * 1000);

        if (filters.dateMode === DateMode.EXACT) {
          matchesDates = (subletStart <= filterStart) && (subletEnd >= filterEnd);
        } else {
          matchesDates = (subletStart <= filterEnd) && (subletStart >= filterStart); 
        }
      }
      
      return matchesSearch && matchesPrice && matchesType && matchesStatus && matchesCity && matchesNeighborhood && matchesDates && matchesPets;
    });
  }, [sublets, filters, searchQuery, viewMode, savedListingIds]);

  const cityOptions = useMemo(() => {
    const invalidCityPattern = /^(start_date|end_date|price|location|type|amenities|currency|images?)(:.*)?$/i;
    const fromSublets = new Set(
      sublets.map(s => s.city).filter(c => c && !invalidCityPattern.test(c.trim()))
    );
    return Array.from(new Set([...GLOBAL_CITIES, ...fromSublets])).sort();
  }, [sublets]);
  
  const handleCityChange = (city: string) => {
    setFilters(prev => ({ ...prev, city, neighborhood: '' }));
  };

  const handleAddPostClick = () => {
    if (user) {
      setIsAddModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleAddSublet = async (newSublet: Sublet) => {
    setSublets(prev => [newSublet, ...prev]);
    setSelectedSubletId(newSublet.id);
    setSearchQuery('');
    setToast({ message: t.successSave, type: 'success' });
  };

  const handleUpdateSublet = async (updated: Sublet) => {
    await persistenceService.updateListing(updated);
    setSublets(prev => prev.map(s => s.id === updated.id ? updated : s));
    setToast({ message: t.saveChanges, type: 'success' });
  };

  const handleClaimListing = async (id: string) => {
    if (!user) {
      setToast({ message: "Please log in to claim a listing", type: 'error' });
      setIsAuthModalOpen(true);
      return;
    }
    if (window.confirm(t.claimConfirm)) {
      const listing = sublets.find(s => s.id === id);
      if (listing) {
        const updated = { ...listing, ownerId: user.id };
        await persistenceService.updateListing(updated);
        setSublets(prev => prev.map(s => s.id === id ? updated : s));
        setToast({ message: "Ownership claimed!", type: 'success' });
      }
    }
  };

  const selectedSublet = useMemo(() => 
    sublets.find(s => s.id === selectedSubletId), 
  [sublets, selectedSubletId]);

  const onMarkerClick = (s: Sublet) => {
    setSelectedSubletId(s.id);
  };

  const openFullDetail = (id: string) => {
    setSelectedSubletId(id);
    setViewMode(ViewMode.DETAIL);
  };

  const openEditModal = (id: string) => {
    setEditingSubletId(id);
  };

  const isNew = (createdAt: number) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return (Date.now() - createdAt) < oneDay;
  };

  const getHoursAgo = (createdAt: number) => {
    const diff = Date.now() - createdAt;
    return Math.max(0, Math.floor(diff / (60 * 60 * 1000)));
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-white ${isRTL ? 'font-sans' : ''}`}>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-10 duration-300">
          <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border
            ${toast.type === 'success' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-red-600 border-red-400 text-white'}
          `}>
            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
          </div>
        </div>
      )}

      {viewMode === ViewMode.DETAIL && selectedSublet && (
        <SubletDetailPage 
          sublet={selectedSublet} 
          onClose={() => {
            setViewMode(ViewMode.BROWSE);
            // Optional: Clear URL param on close if desired
            // window.history.pushState({}, '', window.location.pathname);
          }} 
          language={language} 
          currentUserId={user?.id || ''}
          onClaim={handleClaimListing}
          onEdit={openEditModal}
          onShowToast={(message, type) => setToast({ message, type })}
        />
      )}

      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 flex items-center justify-between z-[60] shadow-sm gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-blue-600 p-1.5 md:p-2 rounded-lg">
            <MapIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <h1 className="text-base md:text-lg font-bold text-slate-900 leading-none hidden xs:block">{t.appName}</h1>
        </div>

        <div className="flex-1 max-md:hidden relative mx-1 md:mx-4 max-w-md">
          <SearchIcon className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5`} />
          <input 
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-1.5 bg-slate-100 border-none rounded-full text-xs md:text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-full mr-1 sm:mr-2">
            <button 
              onClick={() => setViewMode(ViewMode.BROWSE)}
              className={`px-3 sm:px-4 py-1.5 text-[10px] font-bold rounded-full transition-all uppercase tracking-wider
                ${viewMode === ViewMode.BROWSE ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              {t.browse}
            </button>
            <button 
              onClick={() => setViewMode(ViewMode.SAVED)}
              className={`px-3 sm:px-4 py-1.5 text-[10px] font-bold rounded-full transition-all uppercase tracking-wider flex items-center gap-2
                ${viewMode === ViewMode.SAVED ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <HeartIcon className="w-3 h-3" filled={viewMode === ViewMode.SAVED} />
              <span className="hidden sm:inline">{t.savedListings}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
             <LanguageSwitcher language={language} setLanguage={setLanguage} />
             <CurrencySwitcher />
          </div>

          {user ? (
            <>
              <button 
                onClick={handleAddPostClick}
                className="bg-blue-600 text-white p-2 md:px-4 md:py-2 rounded-full hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-md active:scale-95 ml-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline font-bold text-xs">{t.addPost}</span>
              </button>
              
              <div className="ml-2 flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs border-2 border-slate-100">
                    {user.name.charAt(0).toUpperCase()}
                 </div>
                 <button onClick={logout} className="text-xs text-slate-500 hover:text-red-500 font-bold hidden md:block">
                   Log Out
                 </button>
              </div>
            </>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-black transition-all font-bold text-xs shadow-md ml-2"
            >
              Log In
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-col md:flex-row-reverse flex-1 overflow-hidden relative">
        <div className="h-[30vh] md:h-auto md:w-[45%] lg:w-[40%] xl:w-[45%] relative z-10 border-b md:border-b-0 border-slate-200">
          <MapVisualizer 
            sublets={filteredSublets} 
            onMarkerClick={onMarkerClick}
            selectedSubletId={selectedSubletId}
            language={language}
          />
        </div>

        <aside className="flex-1 bg-white flex flex-col z-20 md:border-r border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] h-[70vh] md:h-full overflow-hidden">
          <div className="sticky top-0 bg-white z-30 border-b border-slate-100 shadow-sm shrink-0">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {viewMode === ViewMode.SAVED ? t.savedListings : t.results}
                </span>
                <span className="text-base font-bold text-slate-900 leading-none">{filteredSublets.length} {t.results}</span>
              </div>
              <button 
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-bold
                  ${isFilterExpanded ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}
                `}
              >
                <FilterIcon className="w-3.5 h-3.5" />
                {t.filters}
              </button>
            </div>

            <div className={`filter-panel overflow-y-auto custom-scrollbar px-6 bg-slate-50/50 transition-all duration-300 ease-in-out
              ${isFilterExpanded ? 'max-h-[50vh] md:max-h-[800px] opacity-100 py-6 border-b border-slate-200' : 'max-h-0 opacity-0 py-0 pointer-events-none'}
            `}>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 items-end pb-10">
                 
                 <div className="sm:col-span-2 lg:col-span-1">
                   <PriceRangeFilter 
                    min={filters.minPrice}
                    max={filters.maxPrice}
                    language={language}
                    onChange={(min, max) => setFilters(prev => ({ ...prev, minPrice: min, maxPrice: max }))}
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.city}</label>
                   <CityAutocomplete
                     value={filters.city}
                     options={cityOptions}
                     placeholder={t.allCities}
                     onChange={(city) => setFilters(prev => ({ ...prev, city }))}
                     onCitySelect={(city) => handleCityChange(city)}
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.type}</label>
                   <select value={filters.type || ''} onChange={(e) => setFilters({...filters, type: e.target.value as SubletType || undefined})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none shadow-sm focus:ring-2 focus:ring-blue-500 cursor-pointer">
                     <option value="">{t.allTypes}</option>
                     {Object.values(SubletType).map(type => (
                       <option key={type} value={type}>{t.subletTypes[type]}</option>
                     ))}
                   </select>
                 </div>
                 
                 <div className="space-y-1.5 group">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.startDate}</label>
                   <div className="relative">
                     <input 
                       type="date" 
                       value={filters.startDate} 
                       onClick={(e) => e.currentTarget.showPicker?.()}
                       onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                       className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none shadow-sm focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                     />
                   </div>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.endDate}</label>
                   <div className="relative">
                     <input 
                       type="date" 
                       value={filters.endDate} 
                       onClick={(e) => e.currentTarget.showPicker?.()}
                       onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                       className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none shadow-sm focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                     />
                   </div>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.dateMode}</label>
                   <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm h-[44px]">
                     {Object.values(DateMode).map((mode) => (
                       <button
                         key={mode}
                         onClick={() => setFilters({ ...filters, dateMode: mode })}
                         className={`flex-1 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider
                           ${filters.dateMode === mode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}
                         `}
                       >
                         {t.dateModes[mode]}
                       </button>
                     ))}
                   </div>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.petsAllowed}</label>
                   <button 
                     onClick={() => setFilters({ ...filters, petsAllowed: !filters.petsAllowed })}
                     className={`w-full p-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2
                       ${filters.petsAllowed ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}
                     `}
                   >
                     <span>{filters.petsAllowed ? '🐾' : '🐕'}</span>
                     {t.petsAllowed}
                   </button>
                 </div>
               </div>
            </div>
          </div>

          <div ref={listContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-slate-50/20">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 font-bold text-sm">Loading Listings...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredSublets.map(sublet => (
                  <div 
                    key={sublet.id}
                    ref={el => { itemRefs.current[sublet.id] = el; }}
                    onClick={() => setSelectedSubletId(sublet.id)}
                    onDoubleClick={() => openFullDetail(sublet.id)}
                    className={`rounded-2xl border transition-all cursor-pointer group bg-white relative overflow-hidden
                      ${selectedSubletId === sublet.id 
                        ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-lg scale-[1.01]' 
                        : 'border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md'}
                      ${sublet.status === ListingStatus.TAKEN ? 'opacity-60' : ''}
                    `}
                  >
                    {/* Image Carousel at Top of Card */}
                    <ListingCarousel id={sublet.id} images={sublet.images} className="w-full" />

                    <div className="p-5">
                      {isNew(sublet.createdAt) && (
                        <div className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} bg-indigo-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-lg animate-pulse ring-4 ring-indigo-100 z-10 flex items-center gap-1.5`}>
                          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                          {t.addedXhAgo.replace('{x}', getHoursAgo(sublet.createdAt).toString())}
                        </div>
                      )}

                      <button 
                        onClick={(e) => toggleSaveListing(sublet.id, e)}
                        className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} z-10 p-2 rounded-full transition-all active:scale-90
                          ${savedListingIds.has(sublet.id) ? 'bg-indigo-50 text-indigo-600' : 'bg-white/80 backdrop-blur-md text-slate-300 hover:text-slate-400 shadow-sm'}
                        `}
                      >
                        <HeartIcon className="w-4 h-4" filled={savedListingIds.has(sublet.id)} />
                      </button>

                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                            ${sublet.type === SubletType.ROOMMATE ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}
                          `}>
                            {t.subletTypes[sublet.type]}
                          </span>
                          {sublet.amenities?.includes('petFriendly') && (
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-700 uppercase tracking-widest">
                              🐾 Pets
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-slate-900 leading-none dir-ltr">
                            {formatPrice(sublet.price, currency, language)}
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="font-bold text-slate-900 text-base mb-1 truncate">{sublet.location}</h3>
                      <p className="text-xs text-slate-400 font-medium uppercase mb-1">{sublet.neighborhood || sublet.city}</p>
                      <FeatureIcons apartment_details={sublet.apartment_details} className="mb-3" />
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                          <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {formatDate(sublet.startDate)}
                          {sublet.endDate ? ` - ${formatDate(sublet.endDate)}` : ''}
                        </div>
                        {sublet.status === ListingStatus.TAKEN && (
                          <span className="text-[10px] font-black text-red-500 uppercase ring-1 ring-red-100 px-1.5 py-0.5 rounded">{t.taken}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && filteredSublets.length === 0 && (
              <div className="py-24 flex flex-col items-center text-center px-10">
                <div className="bg-slate-100 p-6 rounded-full mb-6">
                  {viewMode === ViewMode.SAVED ? (
                    <HeartIcon className="w-12 h-12 text-slate-300" />
                  ) : (
                    <InfoIcon className="w-12 h-12 text-slate-300" />
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {viewMode === ViewMode.SAVED ? t.noSaved : t.noResults}
                </h3>
                <p className="text-sm text-slate-400 mt-2 max-w-xs">
                  {viewMode === ViewMode.SAVED ? t.noSavedDesc : t.noResultsDesc}
                </p>
                {viewMode === ViewMode.SAVED && (
                  <button 
                    onClick={() => setViewMode(ViewMode.BROWSE)}
                    className="mt-6 px-6 py-2 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-all text-sm"
                  >
                    {t.browse}
                  </button>
                )}
              </div>
            )}
            
            <div className="h-32 md:h-8" />
          </div>
        </aside>

        {selectedSublet && (viewMode === ViewMode.BROWSE || viewMode === ViewMode.SAVED) && (
          <div 
            onClick={() => openFullDetail(selectedSublet.id)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] md:w-[480px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 z-[50] animate-in slide-in-from-bottom-10 duration-300 ease-out overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
          >
             <div className="flex p-3 relative">
               {isNew(selectedSublet.createdAt) && (
                  <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg z-20 flex items-center gap-1`}>
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    {t.addedXhAgo.replace('{x}', getHoursAgo(selectedSublet.createdAt).toString())}
                  </div>
               )}
               
               <div className="w-2/5 shrink-0">
                 <ListingCarousel 
                   id={selectedSublet.id} 
                   images={selectedSublet.images}
                   aspectRatio="aspect-square" 
                   className="rounded-2xl" 
                 />
               </div>
               
               <div className="flex-1 px-4 py-1 relative flex flex-col justify-between overflow-hidden">
                 <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedSubletId(undefined); }} 
                  className="absolute top-0 right-0 text-slate-300 hover:text-slate-600 p-2 z-10"
                 >
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>

                 <div className="pt-2">
                   <h4 className="font-bold text-slate-900 text-sm pr-6 line-clamp-1">{selectedSublet.location}</h4>
                   <div className="text-indigo-600 font-black text-lg mt-0.5 dir-ltr">
                     {formatPrice(selectedSublet.price, currency, language)}
                   </div>
                   <div className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">{selectedSublet.neighborhood || selectedSublet.city}</div>
                   <FeatureIcons apartment_details={selectedSublet.apartment_details} className="mt-1.5" />
                 </div>

                 <div className="mt-4 flex gap-2">
                   {selectedSublet.ownerId === user?.id ? (
                     <button 
                      onClick={(e) => { e.stopPropagation(); openEditModal(selectedSublet.id); }}
                      className="flex-1 bg-slate-900 text-white text-[10px] font-black py-2.5 rounded-xl text-center uppercase tracking-wider shadow-sm"
                     >
                       {t.edit}
                     </button>
                   ) : (
                     <div className="flex-1 bg-indigo-600 text-white text-[10px] font-black py-2.5 rounded-xl text-center flex items-center justify-center gap-2 uppercase tracking-wider shadow-md shadow-indigo-100">
                       {t.viewOnFb}
                     </div>
                   )}
                 </div>
               </div>
             </div>
          </div>
        )}
      </main>

      {isAddModalOpen && user && (
        <AddListingModal 
          onAdd={handleAddSublet}
          onClose={() => setIsAddModalOpen(false)}
          language={language}
          currentUser={user}
        />
      )}

      {editingSubletId && (
        <EditListingModal 
          sublet={sublets.find(s => s.id === editingSubletId)!}
          onSave={handleUpdateSublet}
          onClose={() => setEditingSubletId(undefined)}
          language={language}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal 
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <CurrencyProvider>
      <AppContent />
    </CurrencyProvider>
  </AuthProvider>
);

export default App;
