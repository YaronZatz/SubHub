'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import AuthGuard from '@/components/shared/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/translations';

function ProfileContent() {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) return null;

  // Firebase users may expose photoURL / displayName beyond the User type
  const firebaseUser = user as typeof user & { photoURL?: string; displayName?: string };
  const displayName = firebaseUser.displayName || user.name || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await logout();
    // AuthGuard will redirect to /map after logout (user becomes null → modal appears)
    // Better UX: navigate to / directly
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#f6f7f8]">
      <WebNavbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 md:pb-10">

        <h1 className="text-2xl font-black text-slate-900 mb-8">{t.profile}</h1>

        {/* Avatar + identity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <div className="flex items-center gap-5">
            {firebaseUser.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={displayName}
                className="w-16 h-16 rounded-full shadow-sm object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#4A7CC7] text-white flex items-center justify-center text-xl font-black shadow-sm">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-slate-900 truncate">{displayName}</p>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">Member since {memberSince}</p>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 mb-4">
          <Link
            href="/saved"
            className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-slate-400 group-hover:text-[#4A7CC7] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700">{t.savedListings}</span>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/messages"
            className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-slate-400 group-hover:text-[#4A7CC7] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700">{t.messages}</span>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center gap-3 px-6 py-4 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 text-left"
          >
            {isSigningOut ? (
              <div className="w-5 h-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
            <span className="text-sm font-semibold">
              {isSigningOut ? 'Signing out…' : t.signOut}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
