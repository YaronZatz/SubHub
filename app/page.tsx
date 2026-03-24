'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Sublet, Filters, ListingStatus, SubletType, Language, DateMode, ViewMode, CurrencyCode, RentTerm } from '../types';
import { translations } from '../translations';
import { GLOBAL_CITIES, CITY_CENTERS, MAP_CENTER, MAP_ZOOM } from '../constants';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { persistenceService } from '../services/persistenceService';
import { formatPrice, formatDate } from '../utils/formatters';
import {
  FilterIcon,
  ListIcon,
  PlusIcon,
  HeartIcon,
  CalendarIcon
} from '../components/Icons';
import SearchAutocomplete from '../components/SearchAutocomplete';

// Leaflet uses `window` at load time; load map only on client to avoid prerender error
const MapVisualizer = dynamic(() => import('../components/MapVisualizer'), { ssr: false });
import AddListingModal from '../components/AddListingModal';
import ListingCarousel from '../components/ListingCarousel';
import PriceRangeFilter from '../components/PriceRangeFilter';
// Uses @googlemaps/js-api-loader which accesses window at module init — must be client-only
const CityAutocomplete = dynamic(() => import('../components/CityAutocomplete'), { ssr: false });
import EditListingModal from '../components/EditListingModal';
const SubletDetailPage = dynamic(() => import('../components/SubletDetailPage'), { ssr: false });
import FeatureIcons from '../components/FeatureIcons';
import CurrencySwitcher from '../components/CurrencySwitcher';
import LanguageSwitcher from '../components/LanguageSwitcher';
import AuthModal from '../components/AuthModal';
import MapPreviewCard from '../components/MapPreviewCard';
import MobileMapCard from '../components/MobileMapCard';

import PlatformWrapper from '@/components/shared/PlatformWrapper';
import { WebHomePage } from '@/components/web/HomePage';
import { MobileHomePlaceholder } from '@/components/mobile/HomePlaceholder';

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
  onlyWithPrice: true,
  rentTerm: RentTerm.ALL,
  postedWithin: 'all',
};

export default function Home() {
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubletId, setSelectedSubletId] = useState<string | undefined>();
  const [mapSelectedSubletId, setMapSelectedSubletId] = useState<string | undefined>();
  const [cityFlyTo, setCityFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
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
    if (filters.city !== '') {
      setCityFlyTo({ lat: MAP_CENTER.lat, lng: MAP_CENTER.lng, zoom: MAP_ZOOM });
    }
    setFilters(INITIAL_FILTERS);
    setSearchQuery('');
  };

  const t = translations[language] || translations[Language.EN];
  const isRTL = language === Language.HE;

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
      return matchesSearch && matchesPrice && matchesStatus && matchesType && matchesCity && matchesNeighborhood && matchesDates && matchesPets && matchesRentTerm && matchesPostedWithin;
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

  const handleCityFlyTo = (city: string) => {
    const center = CITY_CENTERS[city];
    setCityFlyTo(center ? { ...center } : null);
  };

  const mapSelectedSublet = mapSelectedSubletId ? filteredSublets.find(s => s.id === mapSelectedSubletId) : undefined;

  const activeFilterCount = [
    filters.minPrice !== 0,
    filters.maxPrice !== 20000,
    !!filters.type,
    !!filters.city,
    !!filters.neighborhood,
    !!filters.startDate,
    !!filters.endDate,
    filters.petsAllowed,
    filters.showTaken,
    (filters.rentTerm ?? RentTerm.ALL) !== RentTerm.ALL,
    (filters.postedWithin ?? 'all') !== 'all',
  ].filter(Boolean).length;

  return (
    <>
      <PlatformWrapper
        web={
          <WebHomePage 
            onPostClick={handleAddPostClick}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filters={filters}
            setFilters={setFilters}
            cityFlyTo={cityFlyTo}
            handleCityFlyTo={handleCityFlyTo}
            mapSelectedSubletId={mapSelectedSubletId}
            setMapSelectedSubletId={setMapSelectedSubletId}
            filteredSublets={filteredSublets}
            toggleSaved={toggleSaved}
            savedListingIds={savedListingIds}
            activeFilterCount={activeFilterCount}
          />
        }
        mobile={<MobileHomePlaceholder />}
      />

      {isAddModalOpen && user && (
        <AddListingModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={(newListing) => {
            setSublets(prev => [newListing, ...prev]);
            setIsAddModalOpen(false);
          }}
          language={language}
          currentUser={user}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal onClose={() => setIsAuthModalOpen(false)} />
      )}
    </>
  );
}
