'use client';

import React, { useState } from 'react';
import { Filters, DateMode, RentTerm } from '../types';
import { CITY_CENTERS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useSaved } from '../contexts/SavedContext';

import AddListingModal from '../components/AddListingModal';
import AuthModal from '../components/AuthModal';
import { useLanguage } from '../contexts/LanguageContext';

import PlatformWrapper from '@/components/shared/PlatformWrapper';
import { WebHomePage } from '@/components/web/HomePage';
import { MobileHomePage } from '@/components/mobile/MobileHomePage';

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

export { setInitialMapCity } from '@/app/map/page';

export default function Home() {
  const [mapSelectedSubletId, setMapSelectedSubletId] = useState<string | undefined>();
  const [cityFlyTo, setCityFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddAuthModalOpen, setIsAddAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const { language } = useLanguage();
  const { savedIds: savedListingIds, toggle: toggleSavedById, showSignInModal: isAuthModalOpen, closeSignInModal } = useSaved();
  const { user } = useAuth();

  const handleAddPostClick = () => {
    if (user) setIsAddModalOpen(true);
    else setIsAddAuthModalOpen(true);
  };

  const toggleSaved = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleSavedById(id);
  };

  const handleCityFlyTo = (city: string) => {
    const center = CITY_CENTERS[city];
    setCityFlyTo(center ? { ...center } : null);
  };

  const sharedProps = {
    onPostClick: handleAddPostClick,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    cityFlyTo,
    handleCityFlyTo,
    mapSelectedSubletId,
    setMapSelectedSubletId,
    filteredSublets: [],
    toggleSaved,
    savedListingIds,
    activeFilterCount: 0,
  };

  return (
    <>
      <PlatformWrapper
        web={<WebHomePage {...sharedProps} />}
        mobile={<MobileHomePage {...sharedProps} />}
      />

      {isAddModalOpen && user && (
        <AddListingModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={() => setIsAddModalOpen(false)}
          language={language}
          currentUser={user}
        />
      )}

      {isAddAuthModalOpen && (
        <AuthModal onClose={() => setIsAddAuthModalOpen(false)} />
      )}

      {isAuthModalOpen && (
        <AuthModal onClose={closeSignInModal} />
      )}
    </>
  );
}
