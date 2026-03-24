'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import ListingCarousel from '@/components/ListingCarousel';
import AuthModal, { type AuthModalReason } from '@/components/shared/AuthModal';
import Toast from '@/components/shared/Toast';
import { persistenceService } from '@/services/persistenceService';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice, formatDate } from '@/utils/formatters';
import { getActiveAmenities } from '@/utils/amenityHelpers';
import { Sublet, ListingStatus, CurrencyCode } from '@/types';

// Google Maps mini-map (client-only, uses window)
const MiniMap = dynamic(() => import('@/components/listing/MiniMap'), { ssr: false });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPageTitle(s: Sublet): string {
  const parts = [s.neighborhood, s.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : (s.location || 'Listing');
}

function getDateRange(s: Sublet): string {
  const start = s.startDate ? formatDate(s.startDate) : '';
  const end = s.endDate ? formatDate(s.endDate) : '';
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (s.immediateAvailability) return 'Available now';
  return '';
}

function getBeds(s: Sublet): number | null {
  return s.parsedRooms?.bedrooms ?? s.rooms?.bedrooms ?? null;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[16/9] md:aspect-[21/8] w-full bg-slate-200 rounded-2xl mb-8" />
      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-8 bg-slate-200 rounded w-2/3" />
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-1/2 mt-4" />
          <div className="h-32 bg-slate-100 rounded-xl mt-6" />
        </div>
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    </div>
  );
}

// ─── Not Found ────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <div className="text-6xl mb-6">🏠</div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">
        Looks like this listing moved out
      </h1>
      <p className="text-slate-500 mb-8">This listing may no longer be available.</p>
      <Link
        href="/map"
        className="px-6 py-3 bg-[#4A7CC7] text-white font-bold rounded-xl hover:bg-[#3b66a6] transition-colors"
      >
        Browse available listings →
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { currency } = useCurrency();

  const [sublet, setSublet] = useState<Sublet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authReason, setAuthReason] = useState<AuthModalReason>('general');
  const [pendingAction, setPendingAction] = useState<'save' | 'contact' | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch listing
  useEffect(() => {
    if (!id) return;
    (async () => {
      setIsLoading(true);
      const listing = await persistenceService.fetchListingById(id);
      if (!listing) {
        setNotFound(true);
      } else {
        setSublet(listing);
      }
      setIsLoading(false);
    })();
  }, [id]);

  // Called by AuthModal after successful sign-in — complete the pending action
  const handleAuthSuccess = useCallback(() => {
    if (pendingAction === 'save') {
      setIsSaved(true);
      setToastMessage('Saved ♡');
    } else if (pendingAction === 'contact') {
      if (sublet?.sourceUrl) window.open(sublet.sourceUrl, '_blank', 'noopener');
    }
    setPendingAction(null);
  }, [pendingAction, sublet]);

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      setPendingAction('save');
      setAuthReason('save');
      setAuthModalOpen(true);
      return;
    }
    const willSave = !isSaved;
    setIsSaved(willSave);
    if (willSave) setToastMessage('Saved ♡');
  }, [user, isSaved]);

  const handleContact = useCallback(() => {
    if (!user) {
      setPendingAction('contact');
      setAuthReason('contact');
      setAuthModalOpen(true);
      return;
    }
    if (sublet?.sourceUrl) {
      window.open(sublet.sourceUrl, '_blank', 'noopener');
    }
  }, [user, sublet]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: sublet ? getPageTitle(sublet) : 'SubHub listing', url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      // cancelled by user
    }
  }, [sublet]);

  const isTaken = sublet?.status === ListingStatus.TAKEN;
  const amenities = sublet ? getActiveAmenities(sublet) : [];
  const beds = sublet ? getBeds(sublet) : null;
  const dateRange = sublet ? getDateRange(sublet) : '';
  const hasAI = !!(sublet?.ai_summary || sublet?.parsedAmenities || sublet?.parsedRooms);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <WebNavbar />

      {/* ── Breadcrumb / Action Bar ── */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 z-40 px-4 md:px-8 py-3 flex items-center justify-between">
        <Link
          href="/map"
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to map
        </Link>

        {sublet && (
          <div className="flex items-center gap-2">
            {/* Save */}
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                isSaved
                  ? 'bg-red-50 border-red-200 text-red-500'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {isSaved ? 'Saved' : 'Save'}
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:border-slate-400 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {shareCopied ? 'Copied!' : 'Share'}
            </button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-40 md:pb-10">
        {isLoading ? (
          <DetailSkeleton />
        ) : notFound || !sublet ? (
          <NotFound />
        ) : (
          <>
            {/* Title */}
            <div className="mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                  {getPageTitle(sublet)}
                </h1>
                {hasAI && (
                  <span className="bg-[#F5831F] text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                    AI Parsed
                  </span>
                )}
                {isTaken && (
                  <span className="bg-red-100 text-red-600 text-xs font-black px-3 py-1 rounded-full uppercase">
                    Taken
                  </span>
                )}
              </div>
              {sublet.fullAddress || sublet.location ? (
                <p className="text-slate-500 mt-1 text-sm">
                  {sublet.fullAddress || sublet.location}
                </p>
              ) : null}
            </div>

            {/* Photo Gallery */}
            <div className="mb-8 rounded-2xl overflow-hidden">
              <ListingCarousel
                id={sublet.id}
                images={sublet.images}
                sourceUrl={sublet.sourceUrl}
                photoCount={sublet.photoCount}
                aspectRatio="aspect-[16/9] md:aspect-[21/8]"
              />
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

              {/* ── Left Column ── */}
              <div className="lg:col-span-2 space-y-8">

                {/* Key Highlights */}
                <div className="flex flex-wrap gap-3 pb-8 border-b border-slate-100">
                  {dateRange && (
                    <div className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl bg-white">
                      <svg className="w-4 h-4 text-[#4A7CC7] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-semibold text-slate-700">{dateRange}</span>
                    </div>
                  )}
                  {beds !== null && (
                    <div className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl bg-white">
                      <svg className="w-4 h-4 text-[#4A7CC7] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className="text-sm font-semibold text-slate-700">
                        {beds} bedroom{beds !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {sublet.parsedRooms?.bathrooms && (
                    <div className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl bg-white">
                      <span className="text-base">🚿</span>
                      <span className="text-sm font-semibold text-slate-700">
                        {sublet.parsedRooms.bathrooms} bath{sublet.parsedRooms.bathrooms !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {sublet.parsedRooms?.floorArea && (
                    <div className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl bg-white">
                      <span className="text-base">📐</span>
                      <span className="text-sm font-semibold text-slate-700">
                        {sublet.parsedRooms.floorArea} {sublet.parsedRooms.floorAreaUnit || 'sqm'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl bg-white">
                    <span className="text-base">🏠</span>
                    <span className="text-sm font-semibold text-slate-700">{sublet.type}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">About this place</h2>
                  {sublet.ai_summary ? (
                    <>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">
                        {sublet.ai_summary}
                      </p>
                      {/* Collapsible original post */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setShowOriginal(v => !v)}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Show original post
                          </span>
                          <svg className={`w-4 h-4 transition-transform ${showOriginal ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showOriginal && (
                          <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
                              {sublet.originalText}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">
                      {sublet.originalText}
                    </p>
                  )}
                </div>

                {/* Amenities */}
                {amenities.length > 0 && (
                  <div className="space-y-4 pt-8 border-t border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">What this place offers</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {amenities.map(item => (
                        <div
                          key={item.key}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                        >
                          <span className="text-xl">{item.icon}</span>
                          <span className="text-sm font-medium text-slate-700">{item.labelEn}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="space-y-3 pt-8 border-t border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900">Location</h2>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                    <svg className="w-4 h-4 text-[#4A7CC7] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>
                      {[sublet.neighborhood, sublet.city, sublet.country].filter(Boolean).join(', ') || sublet.location}
                    </span>
                  </div>

                  {sublet.lat && sublet.lng ? (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                      <MiniMap lat={sublet.lat} lng={sublet.lng} price={sublet.price} currency={sublet.currency} />
                      <a
                        href={`https://www.google.com/maps?q=${sublet.lat},${sublet.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-end gap-1 px-4 py-2 text-xs text-slate-400 hover:text-[#4A7CC7] transition-colors border-t border-slate-100"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open in Google Maps
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 text-sm">{sublet.location}</span>
                    </div>
                  )}
                </div>

                {/* Source info */}
                {(sublet.sourceGroupName || sublet.sourceUrl) && (
                  <div className="pt-8 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <svg className="w-5 h-5 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Source</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {sublet.sourceGroupName || 'Facebook Group'}
                        </p>
                      </div>
                      {sublet.sourceUrl && (
                        <a
                          href={sublet.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-xs font-semibold text-[#1877F2] hover:underline"
                        >
                          View post →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Right Column — Booking Widget ── */}
              <div className="hidden lg:block">
                <div className="sticky top-[88px] bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-5">
                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">
                        {formatPrice(sublet.price, currency as CurrencyCode, 'en-US', sublet.currency)}
                      </span>
                      <span className="text-slate-500 font-medium">/mo</span>
                    </div>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-[#4A7CC7]/10 text-[#4A7CC7] text-[10px] font-black uppercase rounded tracking-wider">
                      {sublet.type}
                    </span>
                  </div>

                  {/* Date Range */}
                  {(sublet.startDate || sublet.endDate) && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                      <div className="grid grid-cols-2">
                        <div className="p-3 border-r border-slate-200">
                          <div className="font-black uppercase text-slate-400 text-[9px] tracking-widest mb-1">From</div>
                          <div className="text-slate-900 font-bold">{formatDate(sublet.startDate) || '—'}</div>
                        </div>
                        <div className="p-3">
                          <div className="font-black uppercase text-slate-400 text-[9px] tracking-widest mb-1">Until</div>
                          <div className="text-slate-900 font-bold">
                            {formatDate(sublet.endDate) || (sublet.datesFlexible ? 'Flexible' : '—')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Landlord */}
                  <button
                    onClick={handleContact}
                    disabled={isTaken}
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                      bg-gradient-to-r from-[#4A7CC7] to-[#5b8fd4] text-white shadow-lg shadow-[#4A7CC7]/25 hover:shadow-xl hover:shadow-[#4A7CC7]/30"
                  >
                    {isTaken ? 'No longer available' : 'Contact Landlord'}
                  </button>

                  {/* Save */}
                  <button
                    onClick={handleSave}
                    className={`w-full py-3 rounded-2xl font-bold text-sm border-2 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                      isSaved
                        ? 'border-red-200 bg-red-50 text-red-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {isSaved ? 'Saved' : 'Save listing'}
                  </button>

                  {/* Safety note */}
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    SubHub never charges fees. Contact is always direct.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Mobile Sticky Bottom Bar — sits above the mobile tab bar (bottom-16) ── */}
      {sublet && !isLoading && !notFound && (
        <div className="lg:hidden fixed bottom-16 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3 z-40">
          <div className="flex-1">
            <p className="font-black text-slate-900">
              {formatPrice(sublet.price, currency as CurrencyCode, 'en-US', sublet.currency)}
              <span className="text-slate-500 font-medium text-sm"> /mo</span>
            </p>
            {dateRange && <p className="text-xs text-slate-500">{dateRange}</p>}
          </div>
          <button
            onClick={handleContact}
            disabled={isTaken}
            className="px-6 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-[#4A7CC7] to-[#5b8fd4] shadow-lg disabled:opacity-50 active:scale-95 transition-all"
          >
            {isTaken ? 'Unavailable' : 'Contact Landlord'}
          </button>
        </div>
      )}

      {/* ── Floating "Back to map" button (mobile, visible after scrolling) ── */}
      <Link
        href="/map"
        className="lg:hidden fixed bottom-36 left-4 z-40 flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Map
      </Link>

      {/* ── Auth Modal ── */}
      {authModalOpen && (
        <AuthModal
          reason={authReason}
          initialMode="signup"
          onSuccess={handleAuthSuccess}
          onClose={() => {
            setAuthModalOpen(false);
            setPendingAction(null);
          }}
        />
      )}

      {/* ── Toast ── */}
      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  );
}
