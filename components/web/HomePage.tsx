'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import { Sublet, Filters } from '@/types';

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

export function WebHomePage({ 
  onPostClick,
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  cityFlyTo,
  handleCityFlyTo,
  mapSelectedSubletId,
  setMapSelectedSubletId,
  filteredSublets,
  toggleSaved,
  savedListingIds,
  activeFilterCount
}: WebHomePageProps) {
  const { user, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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

  const handlePostClick = () => {
    if (onPostClick) {
      onPostClick();
    } else if (!user) {
      setIsAuthModalOpen(true);
    }
  };

  const handleSearchClick = () => {
    // Scroll down to the map section or just trigger a smooth scroll down
    window.scrollTo({ top: 800, behavior: 'smooth' });
  };

  return (
    <div className="font-sans bg-[#f6f7f8] text-slate-900">
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            {/* Logo Left */}
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="SubHub Logo" className="h-20 w-auto mix-blend-multiply" />
            </div>
            
            {/* Nav Links Center */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-[#4A7CC7] transition-colors">How it Works</a>
              <a href="#" className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-[#4A7CC7] transition-colors">For Renters</a>
              <a href="#" className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-[#4A7CC7] transition-colors">For Landlords</a>
              <a href="#" className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-[#4A7CC7] transition-colors">Pricing</a>
            </div>
            
            {/* Auth Buttons Right */}
            <div className="flex items-center gap-4 relative">
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 focus:outline-none rounded-full hover:bg-slate-100 transition-colors"
                  >
                    {('photoURL' in user && (user as any).photoURL) ? (
                      <img src={(user as any).photoURL} alt="User" className="w-8 h-8 rounded-full shadow-sm" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#4A7CC7] text-white flex items-center justify-center font-bold text-sm shadow-sm hover:bg-[#3b66a6] transition-colors">
                        {('displayName' in user && (user as any).displayName) ? (user as any).displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </button>
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 overflow-hidden">
                      <div className="px-4 py-2 text-sm text-slate-600 border-b border-slate-100">
                        <div className="font-semibold text-slate-800 truncate">{('displayName' in user && (user as any).displayName) || 'User'}</div>
                        <div className="text-xs truncate">{user.email}</div>
                      </div>
                      <button 
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }} 
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="hidden lg:block px-4 py-2 text-sm font-black text-[#4A7CC7] border border-[#4A7CC7]/30 hover:bg-[#4A7CC7]/5 rounded-lg transition-all"
                >
                  Log In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-16 pb-24 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <div className="flex flex-col gap-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A7CC7]/10 text-[#4A7CC7] text-xs font-bold uppercase tracking-wider w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A7CC7] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4A7CC7]"></span>
                </span>
                Real-time updates
              </div>
              <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900">
                Every rental post. <br/>
                <span className="text-[#4A7CC7]">One smart search.</span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed max-w-xl">
                SubHub scrapes Facebook groups — and transforms every messy post into a structured, searchable listing. Sublets, short stays, long-term rentals. All on one map.
              </p>
              
              <div className="pt-2 max-w-lg relative z-20">
                <SearchAutocomplete
                  value={searchQuery}
                  onChange={setSearchQuery}
                  sublets={filteredSublets}
                  onCitySelect={(city) => {
                    setSearchQuery(city);
                    handleCityFlyTo(city);
                    handleSearchClick();
                  }}
                  className="w-full shadow-2xl shadow-[#4A7CC7]/10 rounded-xl"
                  inputClassName="w-full pl-10 pr-4 py-4 bg-white rounded-xl text-base font-medium focus:ring-4 focus:ring-[#4A7CC7]/20 outline-none border-2 border-slate-200 focus:border-[#4A7CC7] transition-all"
                  placeholder="Search cities, neighborhoods, streets..."
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <button onClick={handleSearchClick} className="px-8 py-4 bg-[#4A7CC7] text-white rounded-xl font-bold text-lg shadow-xl shadow-[#4A7CC7]/30 hover:-translate-y-1 transition-all flex items-center gap-2">
                  View on Map
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
                <button onClick={handlePostClick} className="px-8 py-4 border-2 border-[#F5831F] text-[#F5831F] rounded-xl font-bold text-lg hover:bg-[#F5831F]/5 transition-all">
                  Post a Listing
                </button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#4A7CC7]/10 rounded-full blur-3xl -z-10"></div>
              <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[#F5831F]/10 rounded-full blur-3xl -z-10"></div>
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                  </div>
                  <div className="mx-auto bg-white rounded-md px-4 py-1 text-[10px] text-slate-400 border border-slate-200 w-64 text-center">
                    subhub.io/search/rentals
                  </div>
                </div>
                <div className="aspect-[4/3] relative bg-slate-50 overflow-hidden">
                  <div 
                    className="w-full h-full bg-cover bg-center opacity-80" 
                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAoGiKqJJX2A28zVbHBJA78MuVqqIgpdn51IoPA-5vDDvweqQwsjTvYAT_zQNLIZV6woZCU5dgKBQ8Z7tKcxlpOo5CMIM0xqemjp-3pPotf6LbR3hV5E5xWTxLCLExfPdKahfvJ9v-iA_i7NduJZ-PHPoAZ-qqTJY7XAC-w2gtfJdeWoCDWcOzBJYYFvhbY98S7Q6svpeIBZ_nLrDngZk-tDDyUdqPz01tv8M8vBw_636bLg4xoD1E9m0tUe8OoWOldOsuf6NkCC2g")' }}
                  ></div>
                  <div className="absolute inset-0 p-4">
                    <div className="absolute top-10 left-20 bg-[#4A7CC7] text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">$1,200</div>
                    <div className="absolute top-32 left-40 bg-[#4A7CC7] text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">$950</div>
                    <div className="absolute top-20 right-32 bg-[#4A7CC7] text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">$1,550</div>
                    <div className="absolute bottom-4 right-4 w-48 bg-white rounded-xl shadow-xl border-l-4 border-[#F5831F] p-3">
                      <div className="h-24 w-full bg-slate-200 rounded-lg mb-2 overflow-hidden relative">
                         <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBN_O3m6HuoxWNMGL7Xq_9mElYeGOjAaxSd8RCPG3oF5W9GYp_FIWLDe-H5SygwohivYZhRMgJmBHdF3jv9joh_hFXeUdVIC1dbmVEo8ucJiAEGqhiOr74HI6CTaW9tmwBVoIbPSrd29EOuU1Gqbz273A7Z0GjU8ROAb9MN9DpD20Kusc1OKgU5mS2jGE-Xxf3ASa0R6uZb7zFSgdtx7zYv0kNU1_mLA9VIo4CNctnCIXZuCCvm9l54BNFuUYYptWfi6bL62kvOZaw" alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="font-bold text-xs text-slate-900">Studio in Mitte</div>
                      <div className="text-[10px] text-[#F5831F] font-bold">$1,200 / mo</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-[#0F172A] py-8 border-y border-slate-800">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-white text-lg md:text-xl font-medium">
            <div className="flex items-center gap-3">
              <span className="text-[#F5831F] text-2xl font-black">12,470+</span>
              <span className="text-slate-400">posts aggregated</span>
            </div>
            <div className="hidden md:block w-px h-8 bg-slate-700"></div>
            <div className="flex items-center gap-3">
              <span className="text-[#F5831F] text-2xl font-black">10+</span>
              <span className="text-slate-400">major cities</span>
            </div>
            <div className="hidden md:block w-px h-8 bg-slate-700"></div>
            <div className="flex items-center gap-3">
              <span className="text-[#F5831F] text-2xl font-black">Updated</span>
              <span className="text-slate-400">Daily</span>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works & Dual Marketplace */}
      <section className="py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">How It Works</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">Whether you're looking for your next home or trying to fill a room, we've got the tools to make it happen instantly.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Find a Place */}
            <div className="bg-[#EFF6FF] p-10 rounded-3xl border border-[#4A7CC7]/10 hover:shadow-xl transition-all duration-500">
              <div className="w-14 h-14 bg-[#4A7CC7] text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-[#4A7CC7]/20">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-6">Find Your Next Place</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#4A7CC7] shrink-0 mt-0.5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
                  <p className="text-slate-700 font-medium leading-relaxed">Access hidden listings from 100+ private WhatsApp & FB groups</p>
                </li>
                <li className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#4A7CC7] shrink-0 mt-0.5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
                  <p className="text-slate-700 font-medium leading-relaxed">Filter by price, dates, and amenities across all sources</p>
                </li>
                <li className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#4A7CC7] shrink-0 mt-0.5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
                  <p className="text-slate-700 font-medium leading-relaxed">Get instant alerts when a match is posted anywhere</p>
                </li>
              </ul>
              <button onClick={handleSearchClick} className="mt-10 px-6 py-3 bg-white text-[#4A7CC7] font-bold rounded-xl shadow-sm border border-[#4A7CC7]/20 hover:shadow-md transition-all">
                Start Searching
              </button>
            </div>
            
            {/* Reach the Right Tenants */}
            <div className="bg-[#FFF7ED] p-10 rounded-3xl border border-[#F5831F]/10 hover:shadow-xl transition-all duration-500">
              <div className="w-14 h-14 bg-[#F5831F] text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-[#F5831F]/20">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-6">Reach the Right Tenants</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#F5831F] shrink-0 mt-0.5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
                  <p className="text-slate-700 font-medium leading-relaxed">One-click post to multiple groups and marketplaces</p>
                </li>
                <li className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#F5831F] shrink-0 mt-0.5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
                  <p className="text-slate-700 font-medium leading-relaxed">AI-powered listing optimizer for higher response rates</p>
                </li>
                <li className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#F5831F] shrink-0 mt-0.5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
                  <p className="text-slate-700 font-medium leading-relaxed">Centralized inbox to manage inquiries from all channels</p>
                </li>
              </ul>
              <button onClick={handlePostClick} className="mt-10 px-6 py-3 bg-white text-[#F5831F] font-bold rounded-xl shadow-sm border border-[#F5831F]/20 hover:shadow-md transition-all">
                Create Listing
              </button>
            </div>
          </div>

          <div className="mt-24 overflow-hidden rounded-3xl border border-slate-200 shadow-xl bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-6 text-sm font-bold text-slate-500 uppercase tracking-wider">Key Advantages</th>
                    <th className="p-6 text-sm font-bold text-[#4A7CC7] uppercase tracking-wider text-center border-l border-slate-200">For Tenants</th>
                    <th className="p-6 text-sm font-bold text-[#F5831F] uppercase tracking-wider text-center border-l border-slate-200">For Landlords</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-6 font-semibold text-slate-900 border-r border-slate-100">Discovery & Reach</td>
                    <td className="p-6 text-slate-600 text-center border-r border-slate-100 bg-[#EFF6FF]/30">Access exclusive, unlisted Facebook/WhatsApp rentals.</td>
                    <td className="p-6 text-slate-600 text-center bg-[#FFF7ED]/30">Broadcast your post to 50+ hyper-local groups instantly.</td>
                  </tr>
                  <tr>
                    <td className="p-6 font-semibold text-slate-900 border-r border-slate-100">Speed</td>
                    <td className="p-6 text-slate-600 text-center border-r border-slate-100 bg-[#EFF6FF]/30">Real-time alerts mean you're always the first to apply.</td>
                    <td className="p-6 text-slate-600 text-center bg-[#FFF7ED]/30">Fill vacancies 3x faster with AI-optimized descriptions.</td>
                  </tr>
                  <tr>
                    <td className="p-6 font-semibold text-slate-900 border-r border-slate-100">Efficiency</td>
                    <td className="p-6 text-slate-600 text-center border-r border-slate-100 bg-[#EFF6FF]/30">One unified map. No more scrolling through messy feeds.</td>
                    <td className="p-6 text-slate-600 text-center bg-[#FFF7ED]/30">Manage all chats in one inbox. No more platform hopping.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Sources footer-like bar */}
      <div className="py-16 bg-slate-50 border-y border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">We aggregate data from across the web</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 hover:opacity-100 transition-all duration-500">
            <div className="flex items-center gap-2 font-bold text-2xl text-slate-600 drop-shadow-sm">
              <span className="text-blue-600">Facebook</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-2xl text-slate-600 drop-shadow-sm">
              <span className="text-green-500">WhatsApp</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-2xl text-slate-600 drop-shadow-sm">
              <span className="text-blue-400">Telegram</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-slate-300 py-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <img src="/logo.png" alt="SubHub Logo" className="h-16 w-auto mix-blend-screen opacity-90" />
              </div>
              <p className="text-slate-500 leading-relaxed">
                Connecting people with the perfect home by bringing all fragmented rental posts into one unified platform.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Platform</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Search Map</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Pricing Plans</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Mobile App</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Support</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Safety Tips</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Subscribe</h4>
              <p className="text-sm text-slate-400 mb-4 font-medium">Get the latest rental tips and news.</p>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Enter email" 
                  className="bg-slate-800/50 border border-slate-700 rounded-l-lg text-sm w-full focus:ring-1 focus:ring-[#4A7CC7] px-4 py-3 outline-none text-white placeholder-slate-500"
                />
                <button className="bg-[#4A7CC7] text-white px-5 py-3 rounded-r-lg hover:bg-[#4A7CC7]/90 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-500">
            <p>© 2026 SubHub Technologies Inc. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}
    </div>
  );
}
