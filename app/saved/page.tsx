'use client';

import React from 'react';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import AuthGuard from '@/components/shared/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

function SavedContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f6f7f8]">
      <WebNavbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 md:pb-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900">Saved Listings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Your shortlist — all in one place.
          </p>
        </div>

        {/* Empty state */}
        <div className="bg-white rounded-2xl border border-slate-200 py-20 flex flex-col items-center text-center px-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">No saved listings yet</h2>
          <p className="text-sm text-slate-500 max-w-xs mb-8">
            Tap the ♡ on any listing to save it here. We'll keep your shortlist ready whenever you come back.
          </p>
          <Link
            href="/map"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4A7CC7] text-white font-bold rounded-xl hover:bg-[#3b66a6] transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Browse the map
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SavedPage() {
  return (
    <AuthGuard>
      <SavedContent />
    </AuthGuard>
  );
}
