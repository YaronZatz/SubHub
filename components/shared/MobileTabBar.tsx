'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/shared/AuthModal';

export type MobileTabBarVariant = 'fixed' | 'embedded';

export interface MobileTabBarProps {
  /** fixed: viewport bottom (most pages). embedded: in-flow at bottom of flex column (e.g. map). */
  variant?: MobileTabBarVariant;
  /** If set, Post uses this instead of navigating to /post. */
  onPostClick?: () => void;
  /** When set, guest-gated actions call this instead of opening an internal AuthModal (e.g. WebNavbar). */
  onAuthRequired?: () => void;
}

export default function MobileTabBar({ variant = 'fixed', onPostClick, onAuthRequired }: MobileTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const requireAuth = () => {
    if (onAuthRequired) onAuthRequired();
    else setAuthOpen(true);
  };

  const tab = (href: string, label: string, requiresAuth: boolean, icon: React.ReactNode) => {
    const isActive = pathname === href || pathname.startsWith(href + '/');
    const cls = `flex flex-col items-center gap-0.5 flex-1 min-h-[44px] justify-end py-1.5 text-[10px] font-bold transition-colors ${
      isActive ? 'text-[#4A7CC7]' : 'text-slate-500'
    }`;
    const handleClick = () => {
      if (requiresAuth && !user) {
        requireAuth();
        return;
      }
      router.push(href);
    };
    return (
      <button key={href} type="button" onClick={handleClick} className={cls}>
        {icon}
        {label}
      </button>
    );
  };

  const handlePost = () => {
    if (onPostClick) {
      onPostClick();
    } else if (user) {
      router.push('/post');
    } else {
      requireAuth();
    }
  };

  const navBase =
    'w-full bg-white border-t border-slate-200 flex md:hidden items-end justify-around';
  const navClass =
    variant === 'fixed'
      ? `${navBase} fixed bottom-0 left-0 right-0 z-[9999]`
      : `${navBase} shrink-0`;

  return (
    <>
      <nav
        className={navClass}
        style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))' }}
      >
        {tab(
          '/map',
          'Explore',
          false,
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>,
        )}
        {tab(
          '/saved',
          'Saved',
          true,
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>,
        )}
        <button
          type="button"
          onClick={handlePost}
          className="flex flex-col items-center gap-0.5 flex-1 min-h-[44px] justify-end py-1.5 text-[10px] font-bold text-slate-500"
        >
          <div className="w-8 h-8 rounded-full bg-[#4A7CC7] flex items-center justify-center shadow-md shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          Post
        </button>
        {tab(
          '/messages',
          'Messages',
          true,
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>,
        )}
        {tab(
          '/profile',
          'Profile',
          true,
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>,
        )}
      </nav>

      {authOpen && !onAuthRequired && (
        <AuthModal reason="general" initialMode="signup" onClose={() => setAuthOpen(false)} />
      )}
    </>
  );
}
