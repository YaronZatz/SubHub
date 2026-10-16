'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import ListingCarousel from '@/components/ListingCarousel';
import PhotoGallery from '@/components/PhotoGallery';
import { isDirectImageUrl, enhanceImageUrl } from '@/utils/imageUtils';
import AuthModal, { type AuthModalReason } from '@/components/shared/AuthModal';
import Toast from '@/components/shared/Toast';
import { persistenceService, type FetchListingByIdResult } from '@/services/persistenceService';
import { useAuth } from '@/contexts/AuthContext';
import { useSaved } from '@/contexts/SavedContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/translations';
import { useRouter } from 'next/navigation';
import { localizedLocation, listingTitle } from '@/lib/locationUtils';
import EditListingModal from '@/components/EditListingModal';
import ListingActionMenu from '@/components/ListingActionMenu';
import { TranslatedText } from '@/components/TranslatedText';
import { translateText } from '@/lib/translationService';
import { formatPrice, formatDate } from '@/utils/formatters';
import { getActiveAmenities } from '@/utils/amenityHelpers';
import { Sublet, ListingStatus, CurrencyCode } from '@/types';
import { homeCopy } from '@/lib/homeCopy';
import { formatDateRange, timelineWindow } from '@/lib/dateWindow';
import AmenityIcon from '@/components/shared/AmenityIcon';
import { Bath, BedDouble, Calendar, ChevronDown, ChevronLeft, ExternalLink, Heart, House, MapPin, Ruler, Share2, SearchX, TriangleAlert } from 'lucide-react';

export type ListingDetailServerResult = 'found' | 'missing' | 'error';

export interface ListingDetailClientProps {
  listingId: string;
  initialListing: Sublet | null;
  serverResult: ListingDetailServerResult;
  serverErrorMessage?: string | null;
}

// Google Maps mini-map (client-only, uses window)
const MiniMap = dynamic(() => import('@/components/listing/MiniMap'), { ssr: false });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPageTitle(s: Sublet, lang: string): string {
  return listingTitle(s, lang);
}

function getDateRange(s: Sublet, t: { availableNow: string }, locale: string): string {
  const range = formatDateRange(s.startDate, s.endDate, locale);
  if (range) return range;
  if (s.immediateAvailability) return t.availableNow;
  return '';
}

function getBeds(s: Sublet): number | null {
  return s.parsedRooms?.bedrooms ?? s.rooms?.bedrooms ?? null;
}

/** Direction for user-generated text so Hebrew posts read RTL while the UI stays English/LTR. */
function contentTextDir(text: string | undefined | null): 'rtl' | 'ltr' {
  if (!text?.trim()) return 'ltr';
  const he = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const lat = (text.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  if (he === 0 && lat === 0) return 'ltr';
  return he > lat ? 'rtl' : 'ltr';
}

function contentBodyClass(dir: 'rtl' | 'ltr', base: string): string {
  return dir === 'rtl' ? `${base} font-sans` : base;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-3 h-5 w-32 rounded bg-brand-50" />
      <div className="mb-6 h-10 w-2/3 rounded bg-brand-50" />
      <div className="mb-8 aspect-[16/9] w-full rounded-2xl bg-brand-50 md:aspect-[21/8]" />
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-24 rounded-2xl bg-brand-50" />
          <div className="h-4 w-full rounded bg-brand-50" />
          <div className="h-4 w-4/5 rounded bg-brand-50" />
        </div>
        <div className="h-72 rounded-2xl bg-brand-50" />
      </div>
    </div>
  );
}

// ─── Not Found ────────────────────────────────────────────────────────────────

function NotFound() {
  const { language } = useLanguage();
  const t = translations[language];
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <SearchX className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">
        {t.listingNotFound}
      </h1>
      <p className="mb-8 text-muted">{homeCopy(language).notFoundBody}</p>
      <Link
        href="/map"
        className="flex h-12 items-center rounded-xl bg-brand-600 px-6 font-semibold text-white transition-colors hover:bg-brand-700"
      >
        {t.browse} →
      </Link>
    </div>
  );
}

function FetchErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { language } = useLanguage();
  const t = translations[language];
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
        <TriangleAlert className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">{t.listingLoadError}</h1>
      <p className="mb-2 max-w-md text-muted">{message}</p>
      <p className="mb-8 text-sm text-muted">{homeCopy(language).errorHint}</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex h-12 items-center rounded-xl bg-brand-600 px-6 font-semibold text-white transition-colors hover:bg-brand-700"
      >
        {t.tryAgain}
      </button>
      <Link href="/map" className="mt-6 text-sm font-semibold text-brand-700 hover:underline">
        {t.browse} →
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ListingDetailClient({
  listingId,
  initialListing,
  serverResult,
  serverErrorMessage,
}: ListingDetailClientProps) {
  const { user } = useAuth();
  const { currency } = useCurrency();

  const { savedIds, toggle: toggleSavedById, showSignInModal: savedAuthModal, closeSignInModal: closeSavedAuthModal } = useSaved();

  const [sublet, setSublet] = useState<Sublet | null>(() =>
    serverResult === 'found' ? initialListing : null,
  );
  const [isLoading, setIsLoading] = useState(() => serverResult === 'error');
  const [notFound, setNotFound] = useState(
    () => serverResult === 'missing' || listingId === '',
  );
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authReason, setAuthReason] = useState<AuthModalReason>('general');
  const [pendingAction, setPendingAction] = useState<'contact' | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  const isSaved = listingId ? savedIds.has(listingId) : false;
  const { language: lang } = useLanguage();
  const t = translations[lang];
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(
    () => initialListing?.summaryTranslations?.[lang] ?? null
  );
  const [summaryTranslating, setSummaryTranslating] = useState(false);

  useEffect(() => {
    const summary = sublet?.ai_summary;
    if (!summary) { setTranslatedSummary(null); return; }
    // Use cached translation from Firestore if available (including 'en' for old listings with non-English summaries)
    const cached = sublet.summaryTranslations?.[lang];
    if (cached) { setTranslatedSummary(cached); return; }
    // For English, fall back to raw ai_summary (which is always English for new listings)
    if (lang === 'en') { setTranslatedSummary(null); return; }
    setSummaryTranslating(true);
    translateText(summary, lang, sublet.id)
      .then(result => setTranslatedSummary(result && result.trim() !== summary.trim() ? result : null))
      .catch(() => setTranslatedSummary(null))
      .finally(() => setSummaryTranslating(false));
  }, [sublet?.ai_summary, sublet?.summaryTranslations, lang]);

  const loadFromClient = useCallback(async () => {
    if (!listingId) return;
    setIsLoading(true);
    setFetchError(null);
    const result: FetchListingByIdResult = await persistenceService.fetchListingById(listingId);
    switch (result.ok) {
      case true:
        setSublet(result.listing);
        setNotFound(false);
        setFetchError(null);
        break;
      case false:
        if (result.reason === 'missing') {
          setSublet(null);
          setNotFound(true);
          setFetchError(null);
        } else {
          setSublet(null);
          setNotFound(false);
          const msg =
            result.reason === 'no_db'
              ? 'Firestore is not available in this browser session.'
              : result.error instanceof Error
                ? result.error.message
                : 'Something went wrong while loading this listing.';
          setFetchError(msg);
          if (process.env.NODE_ENV === 'development') {
            console.warn('[ListingDetail] fetchListingById failed', listingId, result);
          }
        }
        break;
    }
    setIsLoading(false);
  }, [listingId]);

  useEffect(() => {
    if (!listingId) return;
    if (serverResult === 'found' || serverResult === 'missing') return;
    void loadFromClient();
  }, [listingId, serverResult, loadFromClient]);

  const handleAuthSuccess = useCallback(() => {
    if (pendingAction === 'contact') {
      if (sublet?.sourceUrl) window.open(sublet.sourceUrl, '_blank', 'noopener');
    }
    setPendingAction(null);
  }, [pendingAction, sublet]);

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!listingId) return;
    const wasSaved = savedIds.has(listingId);
    toggleSavedById(listingId);
    if (!wasSaved && user) setToastMessage('Saved ♡');
  }, [listingId, user, savedIds, toggleSavedById]);

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
        await navigator.share({ title: sublet ? getPageTitle(sublet, lang) : 'SubHub listing', url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      // cancelled by user
    }
  }, [sublet, lang]);

  const isTaken = sublet?.status === ListingStatus.TAKEN;
  // Owners manage their listing here (this used to live only on the old /listings overlay).
  const isOwner = !!user && !!sublet?.ownerId && sublet.ownerId === user.id;
  const canEdit = isOwner && !!sublet && ![
    ListingStatus.FILLED, ListingStatus.DELETED, ListingStatus.TAKEN, ListingStatus.EXPIRED,
  ].includes(sublet.status);
  const amenities = sublet ? getActiveAmenities(sublet) : [];
  const beds = sublet ? getBeds(sublet) : null;
  const dateRange = sublet ? getDateRange(sublet, t, lang) : '';
  const hasAI = !!(sublet?.ai_summary || sublet?.parsedAmenities || sublet?.parsedRooms);
  const pageTitleText = sublet ? getPageTitle(sublet, lang) : '';
  const pageTitleDir = contentTextDir(sublet ? pageTitleText : null);
  const addressLine = sublet ? (sublet.fullAddress || localizedLocation(sublet, lang) || '') : '';
  // Hide the address line when it just repeats the title.
  const showAddress = !!addressLine && addressLine.trim().toLowerCase() !== (sublet ? getPageTitle(sublet, lang) : '').trim().toLowerCase();
  const addressDir = contentTextDir(addressLine || null);
  const summaryDir = contentTextDir(translatedSummary ?? sublet?.ai_summary ?? null);
  const originalDir = contentTextDir(sublet?.originalText ?? null);
  const isUiRTL = lang === 'he';
  const priceLocale = isUiRTL ? 'he-IL' : 'en-US';

  const copy = homeCopy(lang);
  const timeline = sublet ? timelineWindow(sublet.startDate, sublet.endDate, lang) : null;
  const postTs = sublet ? (sublet.postedAt ? (new Date(sublet.postedAt).getTime() || sublet.createdAt) : sublet.createdAt) : 0;
  const hoursAgo = Math.max(0, Math.floor((Date.now() - postTs) / (60 * 60 * 1000)));
  const daysAgo = Math.max(1, Math.floor(hoursAgo / 24));
  const isNew = hoursAgo < 24;
  const freshLabel = isNew
    ? t.addedXhAgo.replace('{x}', String(hoursAgo))
    : t.addedXdAgo.replace('{x}', String(daysAgo > 30 ? '30+' : daysAgo));
  const priceText = sublet && sublet.price > 0
    ? formatPrice(sublet.price, currency as CurrencyCode, priceLocale, sublet.currency)
    : null;

  const facts = sublet ? [
    dateRange ? { key: 'dates', icon: Calendar, label: copy.factDates, value: dateRange } : null,
    beds !== null ? { key: 'beds', icon: BedDouble, label: copy.factBedrooms, value: String(beds) } : null,
    sublet.parsedRooms?.bathrooms ? { key: 'baths', icon: Bath, label: copy.factBathrooms, value: String(sublet.parsedRooms.bathrooms) } : null,
    sublet.parsedRooms?.floorArea ? { key: 'size', icon: Ruler, label: copy.factSize, value: `${sublet.parsedRooms.floorArea} ${sublet.parsedRooms.floorAreaUnit || t.sqm}` } : null,
    { key: 'type', icon: House, label: copy.factType, value: t.subletTypes[sublet.type] },
  ].filter(Boolean) as { key: string; icon: typeof Calendar; label: string; value: string }[] : [];

  const sectionTitle = 'font-display text-[22px] font-extrabold tracking-tight text-ink';
  const outlineBtn = 'flex h-10 items-center gap-1.5 rounded-[10px] border border-line bg-white px-3 text-sm font-semibold text-ink transition-colors hover:border-brand-200';
  const contactBtn = 'flex h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div
      className="min-h-screen bg-white font-sans text-ink"
      dir={isUiRTL ? 'rtl' : 'ltr'}
      lang={isUiRTL ? 'he' : 'en'}
    >
      <WebNavbar />

      {/* ── Action bar (sits under the sticky navbar) ── */}
      <div className="sticky top-16 z-40 border-b border-line bg-white md:top-[72px]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <Link href="/map" className="flex h-10 items-center gap-1 rounded-[10px] px-2 text-sm font-semibold text-ink hover:bg-brand-50">
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
            {t.backToMap}
          </Link>
          {sublet && (
            <div className="flex items-center gap-2">
              <button onClick={handleSave} className={`${outlineBtn} ${isSaved ? 'border-accent-200 bg-accent-50 text-accent-700' : ''}`}>
                <Heart className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} strokeWidth={2} aria-hidden="true" />
                {isSaved ? t.saved : t.saveListing}
              </button>
              <button onClick={handleShare} className={outlineBtn}>
                <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                {shareCopied ? t.copied : copy.share}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-[1200px] px-4 pb-44 pt-6 md:px-6 lg:pb-16">
        {isLoading ? (
          <DetailSkeleton />
        ) : fetchError ? (
          <FetchErrorState message={fetchError} onRetry={loadFromClient} />
        ) : notFound || !sublet ? (
          <NotFound />
        ) : (
          <>
            {/* Title */}
            <header className="mb-5 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">{t.subletTypes[sublet.type]}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isNew ? 'bg-accent-100 text-accent-700' : 'bg-brand-50 text-ink'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isNew ? 'bg-accent-500' : 'bg-brand-200'}`} />
                  {freshLabel}
                </span>
                {isTaken && (
                  <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-white">{t.taken}</span>
                )}
              </div>
              <h1
                className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.025em] md:text-[40px]"
                dir={pageTitleDir}
                {...(pageTitleDir === 'rtl' ? { lang: 'he' as const } : {})}
              >
                {pageTitleText}
              </h1>
              {showAddress && (
                <p className="flex items-center gap-1.5 self-start text-[15px] text-muted" dir={addressDir} {...(addressDir === 'rtl' ? { lang: 'he' as const } : {})}>
                  <MapPin className="h-4 w-4 shrink-0 text-brand-600" strokeWidth={2} aria-hidden="true" />
                  {addressLine}
                </p>
              )}
            </header>

            {/* Photo Gallery */}
            {(() => {
              const galleryImages = (sublet.images ?? []).filter(isDirectImageUrl).map(enhanceImageUrl);
              return galleryImages.length > 0 ? (
                <div className="mb-8">
                  <PhotoGallery
                    images={galleryImages}
                    alt={sublet.location}
                    sourceUrl={sublet.sourceUrl}
                    onShowAll={() => { setLightboxIndex(0); setShowLightbox(true); }}
                    onImageClick={(i) => { setLightboxIndex(i); setShowLightbox(true); }}
                  />
                </div>
              ) : (
                <div className="mb-8 overflow-hidden rounded-2xl">
                  <ListingCarousel
                    id={sublet.id}
                    images={sublet.images}
                    sourceUrl={sublet.sourceUrl}
                    photoCount={sublet.photoCount}
                    aspectRatio="aspect-[16/9] md:aspect-[21/8]"
                  />
                </div>
              );
            })()}

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
              {/* ── Main column ── */}
              <div className="flex flex-col gap-10 lg:col-span-2">

                {/* Key facts */}
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {facts.map(f => (
                    <div key={f.key} className={`flex flex-col gap-1 rounded-2xl border border-line p-4 ${f.key === 'dates' ? 'col-span-2 sm:col-span-3' : ''}`}>
                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                        <f.icon className="h-4 w-4 text-brand-600" strokeWidth={2} aria-hidden="true" />
                        {f.label}
                      </span>
                      <span className="text-[17px] font-semibold text-ink">{f.value}</span>
                      {f.key === 'dates' && timeline && (
                        <div className="mt-2 flex flex-col gap-1.5" aria-hidden="true">
                          <div className="relative h-2 rounded-full bg-brand-100">
                            <div className="absolute inset-y-0 rounded-full bg-brand-600" style={{ insetInlineStart: `${timeline.left}%`, width: `${timeline.width}%` }} />
                          </div>
                          <div className="flex justify-between text-[11px] uppercase text-muted">
                            {timeline.months.map(m => <span key={m}>{m}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </section>

                {/* About */}
                <section className="flex flex-col gap-4">
                  <h2 className={sectionTitle}>{t.aboutThisPlace}</h2>
                  {sublet.ai_summary ? (
                    summaryTranslating ? (
                      <div className="space-y-2" aria-busy="true">
                        <div className="h-4 w-full animate-pulse rounded bg-brand-50" />
                        <div className="h-4 w-4/5 animate-pulse rounded bg-brand-50" />
                      </div>
                    ) : (
                      <p
                        className="whitespace-pre-line text-base leading-relaxed text-ink"
                        dir={summaryDir}
                        {...(summaryDir === 'rtl' ? { lang: 'he' as const } : {})}
                      >
                        {translatedSummary ?? sublet.ai_summary}
                      </p>
                    )
                  ) : null}

                  {sublet.originalText?.trim() ? (
                    <details className="group rounded-2xl border border-line" open={!sublet.ai_summary}>
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                        <svg className="h-5 w-5 shrink-0 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-sm font-semibold text-ink">
                            <span className="group-open:hidden">{copy.showOriginal}</span>
                            <span className="hidden group-open:inline">{copy.hideOriginal}</span>
                          </span>
                          {sublet.sourceGroupName && (
                            <span className="truncate text-xs text-muted">{copy.postedIn} {sublet.sourceGroupName}</span>
                          )}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" strokeWidth={2.2} aria-hidden="true" />
                      </summary>
                      <div className="flex flex-col gap-3 border-t border-line px-4 py-4">
                        <div dir={originalDir} {...(originalDir === 'rtl' ? { lang: 'he' as const } : {})}>
                          <TranslatedText text={sublet.originalText} language={lang} />
                        </div>
                        {sublet.sourceUrl && (
                          <a href={sublet.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-brand-700 hover:underline">
                            {t.viewPost}
                            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </details>
                  ) : null}
                </section>

                {/* Amenities */}
                {amenities.length > 0 && (
                  <section className="flex flex-col gap-4">
                    <h2 className={sectionTitle}>{t.whatThisPlaceOffers}</h2>
                    <ul className="grid grid-cols-2 gap-x-6 gap-y-3.5 md:grid-cols-3">
                      {amenities.map(item => (
                        <li key={item.key} className="flex items-center gap-3 text-[15px] text-ink">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                            <AmenityIcon amenity={item.key} className="h-[18px] w-[18px]" />
                          </span>
                          {(t as unknown as Record<string, string>)[item.tKey] || item.labelEn}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Location */}
                <section className="flex flex-col gap-3">
                  <h2 className={sectionTitle}>{t.locationHeading}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-[15px] text-muted">
                    <span>
                      {listingTitle(sublet, lang)}
                    </span>
                    {sublet.pin_status === 'approximate' && (
                      <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-accent-700">{copy.approxLocation}</span>
                    )}
                  </div>
                  {sublet.lat && sublet.lng ? (
                    <div className="overflow-hidden rounded-2xl border border-line">
                      <MiniMap lat={sublet.lat} lng={sublet.lng} price={sublet.price} currency={sublet.currency} />
                      <a
                        href={`https://www.google.com/maps?q=${sublet.lat},${sublet.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-end gap-1 border-t border-line px-4 py-2.5 text-[13px] font-medium text-brand-700 hover:underline"
                      >
                        {t.openInGoogleMaps}
                        <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                      </a>
                    </div>
                  ) : null}
                </section>
              </div>

              {/* ── Contact panel ── */}
              <aside className="hidden lg:block">
                <div className="sticky top-[150px] flex flex-col gap-5 rounded-2xl border border-line bg-white p-6 shadow-[0_12px_32px_rgba(17,26,36,0.08)]">
                  <div>
                    {priceText ? (
                      <p className="flex items-baseline gap-1">
                        <span className="text-[32px] font-bold tabular-nums tracking-tight text-ink">{priceText}</span>
                        <span className="text-muted">{copy.perMonth}</span>
                      </p>
                    ) : (
                      <p className="text-lg font-semibold text-muted">{copy.priceOnRequest}</p>
                    )}
                  </div>

                  {(formatDate(sublet.startDate) || formatDate(sublet.endDate)) && (
                    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line">
                      <div className="border-e border-line p-3">
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{t.fromLabel}</div>
                        <div className="font-semibold text-ink">{formatDate(sublet.startDate) || '—'}</div>
                      </div>
                      <div className="p-3">
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{t.untilLabel}</div>
                        <div className="font-semibold text-ink">{formatDate(sublet.endDate) || (sublet.datesFlexible ? copy.flexible : '—')}</div>
                      </div>
                    </div>
                  )}

                  {isOwner ? (
                    <div className="flex flex-col gap-2">
                      <span className="self-start rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{copy.yourListing}</span>
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <button onClick={() => setEditOpen(true)} className={contactBtn}>
                            {t.edit}
                          </button>
                        )}
                        <ListingActionMenu
                          listing={sublet}
                          language={lang}
                          onStatusChange={updated => setSublet(updated)}
                          onDelete={() => router.push('/profile')}
                          onToast={msg => setToastMessage(msg)}
                        />
                      </div>
                    </div>
                  ) : (
                    <button onClick={handleContact} disabled={isTaken} className={contactBtn}>
                      {isTaken ? t.noLongerAvailable : t.contactLandlord}
                    </button>
                  )}

                  <button
                    onClick={handleSave}
                    className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
                      isSaved ? 'border-accent-200 bg-accent-50 text-accent-700' : 'border-line bg-white text-ink hover:border-brand-200'
                    }`}
                  >
                    <Heart className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} strokeWidth={2} aria-hidden="true" />
                    {isSaved ? t.saved : t.saveListing}
                  </button>

                  <p className="text-center text-xs leading-relaxed text-muted">{t.feeNote}</p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      {/* ── Mobile contact bar — sits above the mobile tab bar ── */}
      {sublet && !isLoading && !notFound && !fetchError && (
        <div className="fixed inset-x-0 bottom-16 z-40 flex items-center gap-3 border-t border-line bg-white px-4 py-3 lg:hidden">
          <div className="min-w-0 flex-1">
            {priceText ? (
              <p className="text-lg font-bold tabular-nums text-ink">
                {priceText}<span className="text-sm font-normal text-muted"> {copy.perMonth}</span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-muted">{copy.priceOnRequest}</p>
            )}
            {dateRange && <p className="truncate text-xs text-muted">{dateRange}</p>}
          </div>
          {isOwner ? (
            <div className="flex shrink-0 items-center gap-2">
              {canEdit && (
                <button onClick={() => setEditOpen(true)} className="h-12 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white active:bg-brand-700">
                  {t.edit}
                </button>
              )}
              <ListingActionMenu
                listing={sublet}
                language={lang}
                onStatusChange={updated => setSublet(updated)}
                onDelete={() => router.push('/profile')}
                onToast={msg => setToastMessage(msg)}
              />
            </div>
          ) : (
            <button
              onClick={handleContact}
              disabled={isTaken}
              className="h-12 shrink-0 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition-colors active:bg-brand-700 disabled:opacity-50"
            >
              {isTaken ? t.unavailable : t.contactLandlord}
            </button>
          )}
        </div>
      )}

      {/* ── Lightbox ── */}
      {showLightbox && (() => {
        const imgs = (sublet?.images ?? []).filter(isDirectImageUrl).map(enhanceImageUrl);
        if (!imgs.length) return null;
        return (
          <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
              <button
                onClick={() => setShowLightbox(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="text-white/70 text-sm font-medium">{lightboxIndex + 1} / {imgs.length}</span>
              <div className="w-9" />
            </div>
            <div className="flex-1 flex items-center justify-center relative overflow-hidden px-12">
              <img
                src={imgs[lightboxIndex]}
                alt={`${sublet?.location} ${lightboxIndex + 1}`}
                className="max-h-full max-w-full object-contain select-none"
                referrerPolicy="no-referrer"
                draggable={false}
              />
              {imgs.length > 1 && (
                <>
                  <button
                    onClick={() => setLightboxIndex(i => (i - 1 + imgs.length) % imgs.length)}
                    className="absolute left-2 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    onClick={() => setLightboxIndex(i => (i + 1) % imgs.length)}
                    className="absolute right-2 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0 snap-x">
              {imgs.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`relative shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all snap-start ${lightboxIndex === i ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Auth Modal (contact flow) ── */}
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

      {/* ── Auth Modal (save flow — triggered by SavedContext) ── */}
      {savedAuthModal && !authModalOpen && (
        <AuthModal
          reason="save"
          initialMode="signup"
          onSuccess={closeSavedAuthModal}
          onClose={closeSavedAuthModal}
        />
      )}

      {/* ── Edit (owner) ── */}
      {editOpen && sublet && (
        <EditListingModal
          listing={sublet}
          language={lang}
          onClose={() => setEditOpen(false)}
          onUpdate={updated => setSublet(updated)}
          onSuccess={(msg, updated) => {
            setEditOpen(false);
            setSublet(updated);
            setToastMessage(msg);
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
