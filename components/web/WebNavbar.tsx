'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CurrencyCode } from '@/types';
import AuthModal from '@/components/shared/AuthModal';

// ─── Small pill dropdown (currency / language) ────────────────────────────────

interface PillOption {
  value: string;
  label: string;          // text shown in button + dropdown
  display?: React.ReactNode; // optional richer content for the button only
}

function PillDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: PillOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors bg-slate-100"
      >
        {selected?.display ?? selected?.label ?? value}
        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 min-w-[110px] overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 ${
                opt.value === value ? 'bg-[#4A7CC7]/10 text-[#4A7CC7]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {opt.display ?? opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────

interface TabBarProps {
  pathname: string;
  isLoggedIn: boolean;
  onAuthRequired: () => void;
  onPostClick?: () => void;
}

function MobileTabBar({ pathname, isLoggedIn, onAuthRequired, onPostClick }: TabBarProps) {
  const router = useRouter();

  const tab = (href: string, label: string, requiresAuth: boolean, icon: React.ReactNode) => {
    const isActive = pathname === href || pathname.startsWith(href + '/');
    const cls = `flex flex-col items-center gap-0.5 flex-1 min-h-[44px] py-2 text-[10px] font-bold transition-colors ${isActive ? 'text-[#4A7CC7]' : 'text-slate-500'}`;
    const handleClick = () => {
      if (requiresAuth && !isLoggedIn) { onAuthRequired(); return; }
      router.push(href);
    };
    return <button key={href} onClick={handleClick} className={cls}>{icon}{label}</button>;
  };

  const handlePost = () => {
    if (onPostClick) {
      onPostClick();
    } else if (isLoggedIn) {
      router.push('/post');
    } else {
      onAuthRequired();
    }
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[9999] bg-white border-t border-slate-200 flex md:hidden safe-area-bottom">
      {tab('/map', 'Explore', false, <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>)}
      {tab('/saved', 'Saved', true, <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>)}
      <button onClick={handlePost} className="flex flex-col items-center gap-0.5 flex-1 min-h-[44px] py-2 text-[10px] font-bold text-slate-500">
        <div className="w-10 h-10 -mt-5 rounded-full bg-gradient-to-br from-[#2F6EA8] to-[#F97316] flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        </div>
        Post
      </button>
      {tab('/messages', 'Messages', true, <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>)}
      {tab('/profile', 'Profile', true, <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>)}
    </nav>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

// Flag image helper
function Flag({ code, className = 'w-6 h-4 rounded-[2px] object-cover shadow-sm' }: { code: string; className?: string }) {
  return <img src={`https://flagcdn.com/w40/${code}.png`} alt={code} className={className} />;
}

// Currency: symbol colored + code
function CurrencyDisplay({ symbol, code, color }: { symbol: string; code: string; color: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="font-black" style={{ color }}>{symbol}</span>
      <span>{code}</span>
    </span>
  );
}

const CURRENCY_OPTIONS: PillOption[] = [
  { value: CurrencyCode.ILS, label: '₪ ILS', display: <CurrencyDisplay symbol="₪" code="ILS" color="#4A7CC7" /> },
  { value: CurrencyCode.USD, label: '$ USD', display: <CurrencyDisplay symbol="$" code="USD" color="#4A7CC7" /> },
  { value: CurrencyCode.EUR, label: '€ EUR', display: <CurrencyDisplay symbol="€" code="EUR" color="#4A7CC7" /> },
  { value: CurrencyCode.GBP, label: '£ GBP', display: <CurrencyDisplay symbol="£" code="GBP" color="#4A7CC7" /> },
];

const LANGUAGE_OPTIONS: PillOption[] = [
  { value: 'en', label: 'EN', display: <><Flag code="us" /> EN</> },
  { value: 'he', label: 'HE', display: <><Flag code="il" /> HE</> },
  { value: 'fr', label: 'FR', display: <><Flag code="fr" /> FR</> },
  { value: 'ru', label: 'RU', display: <><Flag code="ru" /> RU</> },
  { value: 'es', label: 'ES', display: <><Flag code="es" /> ES</> },
  { value: 'de', label: 'DE', display: <><Flag code="de" /> DE</> },
  { value: 'pt', label: 'PT', display: <><Flag code="pt" /> PT</> },
  { value: 'uk', label: 'UK', display: <><Flag code="ua" /> UK</> },
  { value: 'it', label: 'IT', display: <><Flag code="it" /> IT</> },
  { value: 'zh', label: 'ZH', display: <><Flag code="cn" /> ZH</> },
];

const LANG_CURRENCY: Record<string, CurrencyCode> = {
  he: CurrencyCode.ILS,
  en: CurrencyCode.USD,
  fr: CurrencyCode.EUR,
  de: CurrencyCode.EUR,
  it: CurrencyCode.EUR,
  pt: CurrencyCode.EUR,
  es: CurrencyCode.USD,
  ru: CurrencyCode.USD,
  uk: CurrencyCode.GBP,
  zh: CurrencyCode.USD,
};

export default function WebNavbar({ onPostClick }: { onPostClick?: () => void } = {}) {
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isOnMap = pathname === '/map';
  const isOnHome = pathname === '/';

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as import('@/types').Language);
    const matched = LANG_CURRENCY[lang];
    if (matched) setCurrency(matched);
  };

  // Close user dropdown on outside click
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(searchQuery.trim() ? `/map?q=${encodeURIComponent(searchQuery.trim())}` : '/map');
  };

  const firebaseUser = user as (typeof user & { photoURL?: string; displayName?: string }) | null;
  const displayName = firebaseUser?.displayName || (user as any)?.name || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-20">

            {/* Logo — larger */}
            <Link href="/" className="shrink-0 flex items-center">
              <img src="/logo.png" alt="SubHub" className="h-16 w-auto mix-blend-multiply" />
            </Link>

            {/* Search bar — non-home, non-map pages */}
            {!isOnHome && !isOnMap ? (
              <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xs">
                <div className="relative w-full">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => { if (!searchQuery) router.push('/map'); }}
                    placeholder="Search neighborhoods..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 hover:bg-slate-200 focus:bg-white border border-transparent focus:border-slate-300 rounded-full text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-[#4A7CC7]/20"
                  />
                </div>
              </form>
            ) : (
              <div className="flex-1 hidden md:block" />
            )}

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">

              {/* How it Works */}
              <Link
                href="/how-it-works"
                className="hidden lg:block text-sm font-semibold text-slate-600 hover:text-[#4A7CC7] transition-colors px-3 py-2 whitespace-nowrap"
              >
                How it Works
              </Link>

              {/* Post a Listing */}
              <Link
                href="/post"
                className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A7CC7] text-white text-sm font-bold hover:bg-[#3b66a6] transition-colors whitespace-nowrap shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Post a Listing
              </Link>

              {/* Saved Listings — always visible in header */}
              <Link
                href="/saved"
                className="hidden md:flex items-center gap-1.5 px-2 py-2 text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors whitespace-nowrap group"
              >
                <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Saved Listings
              </Link>

              {/* Currency picker */}
              <div className="hidden sm:block">
                <PillDropdown
                  value={currency}
                  options={CURRENCY_OPTIONS}
                  onChange={v => setCurrency(v as CurrencyCode)}
                />
              </div>

              {/* Language picker */}
              <div className="hidden sm:block">
                <PillDropdown
                  value={language}
                  options={LANGUAGE_OPTIONS}
                  onChange={handleLanguageChange}
                />
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-6 bg-slate-200 mx-1" />

              {user ? (
                /* ── Logged-in avatar + dropdown ── */
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(v => !v)}
                    className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
                    aria-label="Account menu"
                  >
                    {firebaseUser?.photoURL ? (
                      <img src={firebaseUser.photoURL} alt={displayName} className="w-10 h-10 rounded-full shadow-sm object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#4A7CC7] text-white flex items-center justify-center font-bold text-sm shadow-sm select-none">
                        {initials}
                      </div>
                    )}
                    <svg className="w-3.5 h-3.5 text-slate-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>

                      <Link href="/messages" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Messages
                      </Link>

                      <Link href="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Profile
                      </Link>

                      <div className="border-t border-slate-100 mt-1">
                        <button
                          onClick={() => { logout(); setIsUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Logged-out buttons ── */
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-5 py-2.5 text-sm font-black text-white bg-gradient-to-r from-[#4A7CC7] to-[#3a63a8] hover:from-[#3b66a6] hover:to-[#2d5090] rounded-xl shadow-sm transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <MobileTabBar
        pathname={pathname}
        isLoggedIn={!!user}
        onAuthRequired={() => setIsAuthModalOpen(true)}
        onPostClick={onPostClick}
      />

      {isAuthModalOpen && (
        <AuthModal
          reason="general"
          initialMode="signup"
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </>
  );
}
