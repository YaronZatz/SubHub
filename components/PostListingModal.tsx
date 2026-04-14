'use client';

import React, { useState, useRef } from 'react';
import { Sublet, ListingStatus, Language, SubletType, RentalDuration, RentTerm } from '../types';
import { translations } from '../translations';
import { geocodeAddress } from '../services/geocodingService';
import { getAuth } from 'firebase/auth';
import { extractListingPost } from '../actions/extractListingPost';
import type { ExtractedListingPost } from '../actions/extractListingPost';
import PhotoUploader from './post/PhotoUploader';
import AmenitiesGrid from './post/AmenitiesGrid';
import ListingSuccessScreen from './post/ListingSuccessScreen';
import ReviewForm from './post/ReviewForm';
import type { ReviewFormData, ReviewFormErrors } from './post/reviewFormTypes';
import { EMPTY_REVIEW_FORM } from './post/reviewFormTypes';
import type { AmenityKey } from './post/AmenitiesGrid';
import { FL, ic, icErr, SectionHeading } from './post/formPrimitives';
import { amenityArrayToParsedAmenities } from '../utils/amenityHelpers';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface PostListingModalProps {
  onAdd: (listing: Sublet) => void;
  onClose: () => void;
  onViewOnMap: (listing: Sublet) => void;
  language: Language;
  currentUserId: string;
  currentUserName: string;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'paste' | 'manual';
type PasteScreen = 'input' | 'extracting' | 'review' | 'success';
type ManualStep = 1 | 2 | 3 | 'review' | 'success';

interface Step1Data {
  location: string; city: string; neighborhood: string;
  price: string; currency: 'ILS' | 'USD' | 'EUR';
  type: SubletType | ''; rentalDuration: RentalDuration | '';
}
interface Step2Data { startDate: string; endDate: string; openEnded: boolean; }
interface Step3Data { amenities: string[]; description: string; sourceUrl: string; photos: string[]; }

const EMPTY_STEP1: Step1Data = { location: '', city: '', neighborhood: '', price: '', currency: 'ILS', type: '', rentalDuration: '' };
const EMPTY_STEP2: Step2Data = { startDate: '', endDate: '', openEnded: false };
const EMPTY_STEP3: Step3Data = { amenities: [], description: '', sourceUrl: '', photos: [] };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function rentalDurationToRentTerm(rd: RentalDuration | ''): RentTerm {
  return rd === RentalDuration.LONG_TERM ? RentTerm.LONG_TERM : RentTerm.SHORT_TERM;
}

function buildSublet(data: ReviewFormData, photos: string[], originalText: string, userId: string, userName: string, lat: number, lng: number): Sublet {
  return {
    id: crypto.randomUUID(),
    sourceUrl: data.sourceUrl,
    originalText: originalText || data.description,
    price: Number(data.price) || 0,
    currency: data.currency,
    startDate: data.startDate,
    endDate: data.openEnded ? '' : data.endDate,
    location: data.location,
    city: data.city || undefined,
    neighborhood: data.neighborhood || undefined,
    lat, lng,
    type: data.type as SubletType,
    // Use 'active' to match the Firestore query filter in persistenceService
    status: 'active' as unknown as ListingStatus,
    createdAt: Date.now(),
    ownerId: userId,
    authorName: userName,
    parsedAmenities: amenityArrayToParsedAmenities(data.amenities),
    amenities: amenityArrayToParsedAmenities(data.amenities),
    images: photos,
    photoCount: photos.length,
    rentTerm: rentalDurationToRentTerm(data.rentalDuration as RentalDuration | ''),
  };
}

function validateReviewForm(data: ReviewFormData): ReviewFormErrors {
  const e: ReviewFormErrors = {};
  if (!data.location.trim()) e.location = 'required';
  if (!data.city.trim()) e.city = 'required';
  if (!data.price || Number(data.price) <= 0) e.price = 'required';
  if (!data.startDate) e.startDate = 'required';
  if (!data.type) e.type = 'required';
  if (!data.rentalDuration) e.rentalDuration = 'required';
  if (!data.openEnded && data.endDate && data.startDate && data.endDate < data.startDate) e.endDate = 'end_before_start';
  return e;
}

function step1Errors(d: Step1Data): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.location.trim()) e.location = 'required';
  if (!d.city.trim()) e.city = 'required';
  if (!d.price || Number(d.price) <= 0) e.price = 'required';
  if (!d.type) e.type = 'required';
  if (!d.rentalDuration) e.rentalDuration = 'required';
  return e;
}
function step2Errors(d: Step2Data): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.startDate) e.startDate = 'required';
  if (!d.openEnded && d.endDate && d.startDate && d.endDate < d.startDate) e.endDate = 'end_before_start';
  return e;
}

// ─── Step progress bar ─────────────────────────────────────────────────────────

function StepBar({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i < step ? 'bg-cyan-600 w-6' : i === step - 1 ? 'bg-cyan-600 w-8' : 'bg-slate-200 w-4'}`} />
        ))}
      </div>
      <span className="text-xs text-slate-400 font-semibold">{label}</span>
    </div>
  );
}

// ─── Extracting animation ───────────────────────────────────────────────────────

const EXTRACT_FIELDS = ['fieldPrice', 'fieldLocation', 'fieldDates', 'fieldPropertyType', 'fieldAmenities'] as const;

function ExtractingScreen({ resolvedCount, labels }: { resolvedCount: number; labels: string[] }) {
  return (
    <div className="flex flex-col items-center py-10 space-y-8">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
        <div className="absolute inset-0 rounded-full border-4 border-t-cyan-500 border-r-cyan-300 border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
      </div>
      <div className="w-full max-w-xs space-y-3">
        {labels.map((label, i) => {
          const done = i < resolvedCount;
          const active = i === resolvedCount;
          return (
            <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all ${active ? 'bg-cyan-50 border border-cyan-100' : done ? 'bg-slate-50' : ''}`}>
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                {done ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : active ? (
                  <div className="w-4 h-4 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
                )}
              </div>
              <span className={`text-sm font-semibold ${done ? 'text-slate-600' : active ? 'text-cyan-700' : 'text-slate-300'}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main modal ─────────────────────────────────────────────────────────────────

export default function PostListingModal({ onAdd, onClose, onViewOnMap, language, currentUserId, currentUserName }: PostListingModalProps) {
  const t = translations[language];
  const pm = t.postModal;

  const amenityLabels: Record<AmenityKey, string> = { wifi: pm.amenityWifi, ac: pm.amenityAC, parking: pm.amenityParking, petFriendly: pm.amenityPetFriendly, balcony: pm.amenityBalcony, elevator: pm.amenityElevator, furnished: pm.amenityFurnished, billsIncluded: pm.amenityBillsIncluded };
  const subletTypeLabels: Record<SubletType, string> = { [SubletType.ENTIRE]: t.subletTypes[SubletType.ENTIRE], [SubletType.ROOMMATE]: t.subletTypes[SubletType.ROOMMATE], [SubletType.STUDIO]: t.subletTypes[SubletType.STUDIO] };
  const fieldLabels = EXTRACT_FIELDS.map(k => pm[k as keyof typeof pm] as string);

  // ── Tab ─────────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('paste');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // ── Path 1 ──────────────────────────────────────────────────────────────────
  const [pasteScreen, setPasteScreen] = useState<PasteScreen>('input');
  const [pasteText, setPasteText] = useState('');
  const [pastePhotos, setPastePhotos] = useState<string[]>([]);
  const [pasteTextError, setPasteTextError] = useState<string | null>(null);
  const [pastePhotoError, setPastePhotoError] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [pasteReviewData, setPasteReviewData] = useState<ReviewFormData>(EMPTY_REVIEW_FORM);
  const [pasteReviewErrors, setPasteReviewErrors] = useState<ReviewFormErrors>({});
  const [pasteReviewPhotos, setPasteReviewPhotos] = useState<string[]>([]);
  // Animation
  const [resolvedCount, setResolvedCount] = useState(0);
  const animTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // We drive the animation imperatively and transition to review in the same async function
  const extractedDataRef = useRef<ExtractedListingPost | null>(null);

  // ── Path 2 ──────────────────────────────────────────────────────────────────
  const [manualStep, setManualStep] = useState<ManualStep>(1);
  const [step1, setStep1] = useState<Step1Data>(EMPTY_STEP1);
  const [step2, setStep2] = useState<Step2Data>(EMPTY_STEP2);
  const [step3, setStep3] = useState<Step3Data>(EMPTY_STEP3);
  const [manualReviewData, setManualReviewData] = useState<ReviewFormData>(EMPTY_REVIEW_FORM);
  const [manualReviewErrors, setManualReviewErrors] = useState<ReviewFormErrors>({});
  const [step1Errs, setStep1Errs] = useState<Record<string, string>>({});
  const [step2Errs, setStep2Errs] = useState<Record<string, string>>({});
  const [manualReviewPhotos, setManualReviewPhotos] = useState<string[]>([]);

  // ── Shared ──────────────────────────────────────────────────────────────────
  const [submittedListing, setSubmittedListing] = useState<Sublet | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Extract (Path 1) ────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!pasteText.trim()) { setPasteTextError(pm.textareaRequired); return; }
    setPasteTextError(null);
    setExtractError(null);
    setResolvedCount(0);
    extractedDataRef.current = null;
    animTimersRef.current.forEach(clearTimeout);
    animTimersRef.current = [];

    // Switch to extracting screen immediately
    setPasteScreen('extracting');

    // Kick off API call and animation in parallel
    const TOTAL = EXTRACT_FIELDS.length;
    const ANIM_MS = 2000;

    // Fire the API call
    const apiPromise = extractListingPost(pasteText.trim());

    // Schedule animation ticks
    const animDonePromise = new Promise<void>(resolve => {
      for (let i = 1; i <= TOTAL; i++) {
        animTimersRef.current.push(
          setTimeout(() => {
            setResolvedCount(i);
            if (i === TOTAL) resolve();
          }, (i / TOTAL) * ANIM_MS)
        );
      }
    });

    // Wait for BOTH to finish before transitioning
    const [apiResult] = await Promise.allSettled([
      apiPromise,
      animDonePromise,
    ]);

    animTimersRef.current.forEach(clearTimeout);

    if (apiResult.status === 'rejected') {
      setPasteScreen('input');
      setExtractError(pm.extractionFailed);
      setResolvedCount(0);
      return;
    }

    const d: ExtractedListingPost = apiResult.value;
    extractedDataRef.current = d;

    // Pre-fill review form
    setPasteReviewData({
      location: d.location ?? '',
      city: d.city ?? '',
      neighborhood: d.neighborhood ?? '',
      price: d.price != null ? String(d.price) : '',
      currency: d.currency,
      startDate: d.startDate ?? '',
      endDate: d.endDate ?? '',
      openEnded: false,
      type: (d.type as SubletType) || '',
      rentalDuration: (d.rentalDuration as RentalDuration) || '',
      amenities: d.amenities,
      description: d.description ?? '',
      sourceUrl: '',
    });
    setPasteReviewPhotos([...pastePhotos]);
    setPasteReviewErrors({});
    setPasteScreen('review');
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (data: ReviewFormData, photos: string[], originalText: string) => {
    const errs = validateReviewForm(data);
    if (Object.keys(errs).length > 0) {
      if (tab === 'paste') setPasteReviewErrors(errs);
      else setManualReviewErrors(errs);
      return;
    }
    setIsSubmitting(true);

    let lat = 0;
    let lng = 0;
    const geoQuery = [data.location, data.city].filter(Boolean).join(', ');
    if (geoQuery) {
      try {
        const coords = await geocodeAddress(geoQuery);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      } catch { /* leave unchanged */ }
    }

    const listing = buildSublet(data, photos, originalText, currentUserId, currentUserName, lat, lng);
    onAdd(listing);
    setSubmittedListing(listing);
    if (tab === 'paste') setPasteScreen('success');
    else setManualStep('success');
    setIsSubmitting(false);

    // Save via API route (client SDK cannot write directly due to Firestore rules).
    // The API route uploads base64 images to Firebase Storage and saves public URLs.
    (async () => {
      try {
        const user = getAuth().currentUser;
        const token = user ? await user.getIdToken() : null;
        const res = await fetch('/api/listings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(listing),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
      } catch {
        setToastMsg(pm.persistenceError);
        setTimeout(() => setToastMsg(null), 4000);
      }
    })();
  };

  // ── Discard guard ────────────────────────────────────────────────────────────
  const isDirty = () => {
    if (tab === 'paste') return pasteText.length > 0 || pastePhotos.length > 0;
    return !!(step1.location || step1.price || step2.startDate);
  };
  const isSuccess = (tab === 'paste' && pasteScreen === 'success') || (tab === 'manual' && manualStep === 'success');

  const handleClose = () => {
    if (!isDirty() || isSuccess) { onClose(); return; }
    setShowDiscardConfirm(true);
  };

  // ── Manual: step 3 → review ──────────────────────────────────────────────────
  const goToManualReview = () => {
    setManualReviewData({
      location: step1.location, city: step1.city, neighborhood: step1.neighborhood,
      price: step1.price, currency: step1.currency,
      startDate: step2.startDate, endDate: step2.endDate, openEnded: step2.openEnded,
      type: step1.type, rentalDuration: step1.rentalDuration,
      amenities: step3.amenities, description: step3.description, sourceUrl: step3.sourceUrl,
    });
    setManualReviewPhotos([...step3.photos]);
    setManualReviewErrors({});
    setManualStep('review');
  };

  const translateError = (v?: string) => !v ? undefined : v === 'required' ? pm.fieldRequired : v === 'end_before_start' ? pm.endDateBeforeStart : v;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 pt-4 pb-20 md:p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">

          {/* ── Header ── */}
          <div className="shrink-0 px-6 pt-5 pb-0 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">{pm.modalTitle}</h2>
              <button type="button" onClick={handleClose} aria-label="Close" className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-xl leading-none">×</button>
            </div>

            {!isSuccess && (
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                {(['paste', 'manual'] as Tab[]).map(tk => (
                  <button key={tk} type="button" onClick={() => setTab(tk)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === tk ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {tk === 'paste' ? pm.pasteAPost : pm.manualEntry}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Discard confirmation */}
            {showDiscardConfirm && (
              <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-bold text-amber-800">{pm.unsavedChanges}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowDiscardConfirm(false)} className="flex-1 py-2.5 bg-white border border-amber-200 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-50 transition-colors">{pm.keepEditing}</button>
                  <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors">{pm.discard}</button>
                </div>
              </div>
            )}

            {/* ══════════ PATH 1 ══════════ */}
            {tab === 'paste' && (
              <>
                {/* Screen 1: Input */}
                {pasteScreen === 'input' && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pm.pastePostLabel}</label>
                      <textarea
                        value={pasteText}
                        onChange={e => { setPasteText(e.target.value); setPasteTextError(null); setExtractError(null); }}
                        rows={8}
                        placeholder={pm.pastePostPlaceholder}
                        className={`w-full px-4 py-3.5 rounded-2xl text-sm leading-relaxed resize-none outline-none transition-all focus:ring-4 ${pasteTextError ? 'bg-red-50 border border-red-300 focus:ring-red-500/10 focus:border-red-500' : 'bg-slate-50 border border-slate-200 focus:ring-cyan-500/10 focus:border-cyan-500'}`}
                      />
                      {pasteTextError && <p className="text-[11px] text-red-500 font-medium">{pasteTextError}</p>}
                    </div>

                    <PhotoUploader
                      photos={pastePhotos}
                      onChange={setPastePhotos}
                      label={pm.addPhotos}
                      subtitle={pm.photosSubtitle}
                      error={pastePhotoError}
                      onError={msg => { setPastePhotoError(msg); setTimeout(() => setPastePhotoError(null), 4000); }}
                    />

                    {extractError && (
                      <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                        <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>
                        <p className="text-xs text-red-600 font-semibold">{extractError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Screen 2: Extracting */}
                {pasteScreen === 'extracting' && (
                  <ExtractingScreen resolvedCount={resolvedCount} labels={fieldLabels} />
                )}

                {/* Screen 3: Review */}
                {pasteScreen === 'review' && (
                  <>
                    <div className="flex items-center gap-2.5 mb-5 p-3.5 bg-green-50 border border-green-100 rounded-xl">
                      <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-800">{pm.aiExtractedBanner}</p>
                        <p className="text-[11px] text-green-600">{pm.aiExtractedSub}</p>
                      </div>
                    </div>
                    <ReviewForm data={pasteReviewData} onChange={setPasteReviewData} photos={pasteReviewPhotos} onPhotosChange={setPasteReviewPhotos} errors={pasteReviewErrors} t={t} pm={pm} amenityLabels={amenityLabels} subletTypeLabels={subletTypeLabels} photosReadOnly />
                  </>
                )}

                {/* Screen 4: Success */}
                {pasteScreen === 'success' && submittedListing && (
                  <ListingSuccessScreen listing={submittedListing} onViewOnMap={() => { onViewOnMap(submittedListing); onClose(); }} onPostAnother={() => { setPasteText(''); setPastePhotos([]); setPasteReviewData(EMPTY_REVIEW_FORM); setSubmittedListing(null); setPasteScreen('input'); }} onDone={onClose} t={{ successTitle: pm.successTitle, viewOnMap: pm.viewOnMap, postAnother: pm.postAnother, done: pm.done }} />
                )}
              </>
            )}

            {/* ══════════ PATH 2 ══════════ */}
            {tab === 'manual' && (
              <>
                {manualStep === 1 && (
                  <div>
                    <StepBar step={1} total={3} label={pm.step1of3} />
                    <ManualStep1 data={step1} onChange={setStep1} errors={step1Errs} te={translateError} pm={pm} subletTypeLabels={subletTypeLabels} />
                  </div>
                )}
                {manualStep === 2 && (
                  <div>
                    <StepBar step={2} total={3} label={pm.step2of3} />
                    <ManualStep2 data={step2} onChange={setStep2} errors={step2Errs} te={translateError} pm={pm} />
                  </div>
                )}
                {manualStep === 3 && (
                  <div>
                    <StepBar step={3} total={3} label={pm.step3of3} />
                    <ManualStep3 data={step3} onChange={setStep3} pm={pm} amenityLabels={amenityLabels} />
                  </div>
                )}
                {manualStep === 'review' && (
                  <>
                    <div className="flex items-center gap-2.5 mb-5 p-3.5 bg-cyan-50 border border-cyan-100 rounded-xl">
                      <svg className="w-5 h-5 text-cyan-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      <p className="text-sm font-bold text-cyan-800">{pm.reviewBanner}</p>
                    </div>
                    <ReviewForm data={manualReviewData} onChange={setManualReviewData} photos={manualReviewPhotos} onPhotosChange={setManualReviewPhotos} errors={manualReviewErrors} t={t} pm={pm} amenityLabels={amenityLabels} subletTypeLabels={subletTypeLabels} />
                  </>
                )}
                {manualStep === 'success' && submittedListing && (
                  <ListingSuccessScreen listing={submittedListing} onViewOnMap={() => { onViewOnMap(submittedListing); onClose(); }} onPostAnother={() => { setStep1(EMPTY_STEP1); setStep2(EMPTY_STEP2); setStep3(EMPTY_STEP3); setManualReviewData(EMPTY_REVIEW_FORM); setSubmittedListing(null); setManualStep(1); }} onDone={onClose} t={{ successTitle: pm.successTitle, viewOnMap: pm.viewOnMap, postAnother: pm.postAnother, done: pm.done }} />
                )}
              </>
            )}
          </div>

          {/* ── Footer ── */}
          {!isSuccess && pasteScreen !== 'extracting' && (
            <div className="shrink-0 px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex gap-3">

              {/* Path 1 — Input */}
              {tab === 'paste' && pasteScreen === 'input' && (
                <button type="button" onClick={handleExtract} disabled={!pasteText.trim()} className="flex-1 py-3.5 bg-cyan-600 text-white rounded-2xl font-black text-sm hover:bg-cyan-700 disabled:opacity-40 transition-all shadow-lg shadow-cyan-100/50 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  {pm.extractWithAI}
                </button>
              )}

              {/* Path 1 — Review */}
              {tab === 'paste' && pasteScreen === 'review' && (
                <>
                  <button type="button" onClick={() => setPasteScreen('input')} className="py-3.5 px-5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">{pm.back}</button>
                  <button type="button" disabled={isSubmitting} onClick={() => handleSubmit(pasteReviewData, pasteReviewPhotos, pasteText)} className="flex-1 py-3.5 bg-cyan-600 text-white rounded-2xl font-black text-sm hover:bg-cyan-700 disabled:opacity-40 transition-all shadow-lg shadow-cyan-100/50 flex items-center justify-center gap-2">
                    {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {pm.postListingBtn}
                  </button>
                </>
              )}

              {/* Path 2 — Numeric steps */}
              {tab === 'manual' && typeof manualStep === 'number' && (
                <>
                  {manualStep > 1 && (
                    <button type="button" onClick={() => setManualStep((manualStep - 1) as ManualStep)} className="py-3.5 px-5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">{pm.back}</button>
                  )}
                  <button type="button" onClick={() => {
                    if (manualStep === 1) {
                      const e = step1Errors(step1);
                      if (Object.keys(e).length) { setStep1Errs(e); return; }
                      setStep1Errs({}); setManualStep(2);
                    } else if (manualStep === 2) {
                      const e = step2Errors(step2);
                      if (Object.keys(e).length) { setStep2Errs(e); return; }
                      setStep2Errs({}); setManualStep(3);
                    } else {
                      goToManualReview();
                    }
                  }} className="flex-1 py-3.5 bg-cyan-600 text-white rounded-2xl font-black text-sm hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-100/50">
                    {pm.next}
                  </button>
                </>
              )}

              {/* Path 2 — Review */}
              {tab === 'manual' && manualStep === 'review' && (
                <>
                  <button type="button" onClick={() => setManualStep(3)} className="py-3.5 px-5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">{pm.back}</button>
                  <button type="button" disabled={isSubmitting} onClick={() => {
                    const orig = [manualReviewData.type && `${manualReviewData.type} in ${manualReviewData.location}, ${manualReviewData.city}`, manualReviewData.description].filter(Boolean).join('. ');
                    handleSubmit(manualReviewData, manualReviewPhotos, orig);
                  }} className="flex-1 py-3.5 bg-cyan-600 text-white rounded-2xl font-black text-sm hover:bg-cyan-700 disabled:opacity-40 transition-all shadow-lg shadow-cyan-100/50 flex items-center justify-center gap-2">
                    {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {pm.postListingBtn}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[130] pointer-events-none">
          <div className="bg-amber-700 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-2xl">{toastMsg}</div>
        </div>
      )}
    </>
  );
}

// ─── Manual step sub-components ────────────────────────────────────────────────

function ManualStep1({ data, onChange, errors, te, pm, subletTypeLabels }: {
  data: Step1Data; onChange: (d: Step1Data) => void; errors: Record<string, string>;
  te: (v?: string) => string | undefined; pm: Record<string, string>; subletTypeLabels: Record<SubletType, string>;
}) {
  const s = <K extends keyof Step1Data>(k: K, v: Step1Data[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><FL label={pm.locationLabel} required error={te(errors.location)}>
        <input value={data.location} onChange={e => s('location', e.target.value)} className={errors.location ? icErr : ic} placeholder="12 Rothschild Blvd" />
      </FL></div>
      <FL label={pm.cityLabel} required error={te(errors.city)}>
        <input value={data.city} onChange={e => s('city', e.target.value)} className={errors.city ? icErr : ic} placeholder="Tel Aviv" />
      </FL>
      <FL label={pm.neighborhoodLabel}>
        <input value={data.neighborhood} onChange={e => s('neighborhood', e.target.value)} className={ic} />
      </FL>
      <FL label={pm.priceLabel} required error={te(errors.price)}>
        <input type="number" min={0} value={data.price} onChange={e => s('price', e.target.value)} className={errors.price ? icErr : ic} placeholder="5000" />
      </FL>
      <FL label={pm.currencyLabel} required>
        <select value={data.currency} onChange={e => s('currency', e.target.value as Step1Data['currency'])} className={ic + ' cursor-pointer'}>
          <option value="ILS">{pm.currencyILS}</option>
          <option value="USD">{pm.currencyUSD}</option>
          <option value="EUR">{pm.currencyEUR}</option>
        </select>
      </FL>
      <FL label={pm.typeLabel} required error={te(errors.type)}>
        <select value={data.type} onChange={e => s('type', e.target.value as SubletType | '')} className={(errors.type ? 'border-red-300 bg-red-50 ' : 'border-slate-200 bg-white ') + 'w-full px-3.5 py-3 rounded-xl text-sm border focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all cursor-pointer'}>
          <option value="">—</option>
          {Object.values(SubletType).map(v => <option key={v} value={v}>{subletTypeLabels[v]}</option>)}
        </select>
      </FL>
      <FL label={pm.rentalDurationLabel} required error={te(errors.rentalDuration)}>
        <select value={data.rentalDuration} onChange={e => s('rentalDuration', e.target.value as RentalDuration | '')} className={(errors.rentalDuration ? 'border-red-300 bg-red-50 ' : 'border-slate-200 bg-white ') + 'w-full px-3.5 py-3 rounded-xl text-sm border focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all cursor-pointer'}>
          <option value="">—</option>
          <option value={RentalDuration.SUBLET}>{pm.rentalDurationSublet}</option>
          <option value={RentalDuration.SHORT_TERM}>{pm.rentalDurationShortTerm}</option>
          <option value={RentalDuration.LONG_TERM}>{pm.rentalDurationLongTerm}</option>
        </select>
      </FL>
    </div>
  );
}

function ManualStep2({ data, onChange, errors, te, pm }: {
  data: Step2Data; onChange: (d: Step2Data) => void; errors: Record<string, string>;
  te: (v?: string) => string | undefined; pm: Record<string, string>;
}) {
  const s = <K extends keyof Step2Data>(k: K, v: Step2Data[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FL label={pm.startDateLabel} required error={te(errors.startDate)}>
          <input type="date" value={data.startDate} onChange={e => s('startDate', e.target.value)} onClick={e => e.currentTarget.showPicker?.()} className={(errors.startDate ? icErr : ic) + ' cursor-pointer appearance-none'} />
        </FL>
        {!data.openEnded && (
          <FL label={pm.endDateLabel} error={te(errors.endDate)}>
            <input type="date" value={data.endDate} onChange={e => s('endDate', e.target.value)} onClick={e => e.currentTarget.showPicker?.()} className={(errors.endDate ? icErr : ic) + ' cursor-pointer appearance-none'} />
          </FL>
        )}
      </div>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div onClick={() => s('openEnded', !data.openEnded)} className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${data.openEnded ? 'bg-cyan-600' : 'bg-slate-200'}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${data.openEnded ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
        <span className="text-sm text-slate-600 font-medium">{pm.openEndedLabel}</span>
      </label>
    </div>
  );
}

function ManualStep3({ data, onChange, pm, amenityLabels }: {
  data: Step3Data; onChange: (d: Step3Data) => void; pm: Record<string, string>; amenityLabels: Record<AmenityKey, string>;
}) {
  const s = <K extends keyof Step3Data>(k: K, v: Step3Data[K]) => onChange({ ...data, [k]: v });
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading>{pm.amenitiesLabel}</SectionHeading>
        <AmenitiesGrid selected={data.amenities} onChange={a => s('amenities', a)} labels={amenityLabels} />
      </div>
      <FL label={pm.descriptionLabel}>
        <textarea value={data.description} onChange={e => s('description', e.target.value)} rows={3} className="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all resize-none" />
      </FL>
      <FL label={pm.sourceUrlLabel}>
        <input type="url" value={data.sourceUrl} onChange={e => s('sourceUrl', e.target.value)} placeholder="https://…" className={ic} />
      </FL>
      <PhotoUploader photos={data.photos} onChange={p => s('photos', p)} label={pm.photosLabel} subtitle={pm.photosSubtitle} error={photoErr} onError={msg => { setPhotoErr(msg); setTimeout(() => setPhotoErr(null), 4000); }} />
    </div>
  );
}
