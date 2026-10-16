'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import AuthGuard from '@/components/shared/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/translations';
import { persistenceService } from '@/services/persistenceService';
import type { Sublet } from '@/types';
import { ListingStatus } from '@/types';
import EditListingModal from '@/components/EditListingModal';
import ListingActionMenu from '@/components/ListingActionMenu';
import Toast from '@/components/shared/Toast';

function ProfileContent() {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [myListings, setMyListings] = useState<Sublet[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [editListing, setEditListing] = useState<Sublet | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setListingsLoading(true);
    persistenceService.fetchListingsByOwner(user.id).then(listings => {
      setMyListings(listings);
      setListingsLoading(false);
    });
  }, [user?.id]);

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
    <div className="min-h-screen bg-white">
      <WebNavbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 md:pb-10">

        <h1 className="font-display text-2xl font-extrabold text-ink mb-8 tracking-tight">{t.profile}</h1>

        {/* Avatar + identity */}
        <div className="bg-white rounded-2xl border border-line p-6 mb-4">
          <div className="flex items-center gap-5">
            {firebaseUser.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={displayName}
                className="w-16 h-16 rounded-full shadow-sm object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center text-xl font-bold shadow-sm">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-ink truncate">{displayName}</p>
              <p className="text-sm text-muted truncate">{user.email}</p>
              <p className="text-xs text-muted mt-0.5">Member since {memberSince}</p>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-line divide-y divide-line mb-4">
          <Link
            href="/saved"
            className="flex items-center justify-between px-6 py-4 hover:bg-brand-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-muted group-hover:text-brand-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm font-semibold text-ink">{t.savedListings}</span>
            </div>
            <svg className="w-4 h-4 text-muted/60 group-hover:text-muted transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/messages"
            className="flex items-center justify-between px-6 py-4 hover:bg-brand-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-muted group-hover:text-brand-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-semibold text-ink">{t.messages}</span>
            </div>
            <svg className="w-4 h-4 text-muted/60 group-hover:text-muted transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* My Listings */}
        {(() => {
          const activeListings = myListings.filter(s =>
            s.status === ListingStatus.AVAILABLE || s.status === ListingStatus.PAUSED
          );
          const pastListings = myListings.filter(s => s.status === ListingStatus.FILLED);
          const tabListings = activeTab === 'active' ? activeListings : pastListings;

          const statusBadge = (status: ListingStatus) => {
            if (status === ListingStatus.AVAILABLE) return <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">{t.statusActive}</span>;
            if (status === ListingStatus.PAUSED)    return <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700">{t.statusPaused}</span>;
            if (status === ListingStatus.FILLED)    return <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-brand-50 text-muted">{t.statusFilled}</span>;
            return null;
          };

          return (
            <div className="bg-white rounded-2xl border border-line mb-4">
              {/* Header + Tabs */}
              <div className="px-6 pt-4 pb-0 border-b border-line">
                <h3 className="text-sm font-bold text-ink mb-3">{t.myListings}</h3>
                <div className="flex gap-1 -mb-px">
                  {(['active', 'past'] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors ${
                        activeTab === tab
                          ? 'border-brand-600 text-brand-700'
                          : 'border-transparent text-muted hover:text-muted'
                      }`}
                    >
                      {tab === 'active' ? t.activeListingsTab : t.pastListingsTab}
                      {tab === 'active' && activeListings.length > 0 && (
                        <span className="ml-1.5 bg-brand-50 text-muted text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeListings.length}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              {listingsLoading ? (
                <div className="px-6 py-4 flex items-center gap-2 text-sm text-muted">
                  <div className="w-4 h-4 border-2 border-line border-t-muted rounded-full animate-spin" />
                  Loading…
                </div>
              ) : tabListings.length === 0 ? (
                <div className="px-6 py-4 text-sm text-muted">{t.noListingsYet}</div>
              ) : (
                <div className="divide-y divide-line">
                  {tabListings.map(listing => {
                    const canEdit = listing.status !== ListingStatus.FILLED && listing.status !== ListingStatus.DELETED;
                    return (
                      <div key={listing.id} className="flex items-center gap-3 px-6 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">
                            {listing.location}{listing.city ? `, ${listing.city}` : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {statusBadge(listing.status)}
                          </div>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => setEditListing(listing)}
                            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border border-line text-muted hover:bg-brand-50 transition-colors"
                          >
                            {t.edit}
                          </button>
                        )}
                        <ListingActionMenu
                          listing={listing}
                          language={language}
                          onStatusChange={(updated) => setMyListings(prev => prev.map(s => s.id === updated.id ? updated : s))}
                          onDelete={(id) => setMyListings(prev => prev.filter(s => s.id !== id))}
                          onToast={(msg) => setToastMessage(msg)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Sign out */}
        <div className="bg-white rounded-2xl border border-line overflow-hidden">
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

      {/* Edit Listing Modal */}
      {editListing && (
        <EditListingModal
          listing={editListing}
          language={language}
          onClose={() => setEditListing(null)}
          onUpdate={(updated) => {
            setMyListings(prev => prev.map(s => s.id === updated.id ? updated : s));
          }}
          onSuccess={(msg, updated) => {
            setEditListing(null);
            setMyListings(prev => prev.map(s => s.id === updated.id ? updated : s));
            setToastMessage(msg);
          }}
        />
      )}

      {/* Toast */}
      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}
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
