'use client';

import React, { useState, useRef } from 'react';
import { Sublet, ListingStatus, Language, SubletType, RentalDuration, RentTerm } from '../types';
import { translations } from '../translations';
import { geocodeAddress } from '../services/geocodingService';
import { getAuth } from 'firebase/auth';
import ReviewForm from './post/ReviewForm';
import type { ReviewFormData, ReviewFormErrors } from './post/reviewFormTypes';
import { subletToReviewFormData, validateReviewForm } from './post/reviewFormTypes';
import type { AmenityKey } from './post/AmenitiesGrid';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface EditListingModalProps {
  listing: Sublet;
  language: Language;
  onClose: () => void;
  onUpdate: (updated: Sublet) => void;
  onSuccess: (msg: string, updated: Sublet) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function rentalDurationToRentTerm(rd: RentalDuration | ''): RentTerm {
  return rd === RentalDuration.LONG_TERM ? RentTerm.LONG_TERM : RentTerm.SHORT_TERM;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function EditListingModal({ listing, language, onClose, onUpdate, onSuccess }: EditListingModalProps) {
  const t = translations[language];
  const pm = t.postModal;

  const amenityLabels: Record<AmenityKey, string> = {
    wifi: pm.amenityWifi, ac: pm.amenityAC, parking: pm.amenityParking,
    petFriendly: pm.amenityPetFriendly, balcony: pm.amenityBalcony,
    elevator: pm.amenityElevator, furnished: pm.amenityFurnished,
    billsIncluded: pm.amenityBillsIncluded,
  };
  const subletTypeLabels: Record<SubletType, string> = {
    [SubletType.ENTIRE]: t.subletTypes[SubletType.ENTIRE],
    [SubletType.ROOMMATE]: t.subletTypes[SubletType.ROOMMATE],
    [SubletType.STUDIO]: t.subletTypes[SubletType.STUDIO],
  };

  const initialFormData = subletToReviewFormData(listing);
  const initialPhotos = listing.images ?? [];
  const initialFormRef = useRef({ formData: initialFormData, photos: initialPhotos });

  const [formData, setFormData] = useState<ReviewFormData>(initialFormData);
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isBlocked = [
    ListingStatus.TAKEN,
    ListingStatus.EXPIRED,
    ListingStatus.FILLED,
    ListingStatus.DELETED,
  ].includes(listing.status);

  const isDirty = () =>
    JSON.stringify({ formData, photos }) !==
    JSON.stringify(initialFormRef.current);

  const handleClose = () => onClose();

  const handleSubmit = async () => {
    const errs = validateReviewForm(formData);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setIsSubmitting(true);

    let lat = listing.lat ?? 0;
    let lng = listing.lng ?? 0;
    if (formData.location !== listing.location) {
      const geoQuery = [formData.location, formData.city].filter(Boolean).join(', ');
      if (geoQuery) {
        try {
          const coords = await geocodeAddress(geoQuery);
          if (coords) { lat = coords.lat; lng = coords.lng; }
        } catch { /* leave coords unchanged */ }
      }
    }

    const updatedListing: Sublet = {
      ...listing,
      location: formData.location,
      city: formData.city || undefined,
      neighborhood: formData.neighborhood || undefined,
      price: Number(formData.price) || 0,
      currency: formData.currency,
      startDate: formData.startDate,
      endDate: formData.openEnded ? '' : formData.endDate,
      type: formData.type as SubletType,
      amenities: formData.amenities,
      images: photos,
      photoCount: photos.length,
      sourceUrl: formData.sourceUrl,
      originalText: formData.description,
      rentTerm: rentalDurationToRentTerm(formData.rentalDuration as RentalDuration | ''),
      lat, lng,
    };

    // Optimistic update
    onUpdate(updatedListing);

    // Persist in background
    (async () => {
      try {
        const user = getAuth().currentUser;
        const token = user ? await user.getIdToken() : null;
        const res = await fetch(`/api/listings/${listing.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(updatedListing),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        onSuccess(pm.successUpdated, updatedListing);
      } catch {
        setToastMsg(pm.persistenceError);
        setTimeout(() => setToastMsg(null), 4000);
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 pt-4 pb-20 md:p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">

          {/* ── Header ── */}
          <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">{pm.editModalTitle}</h2>
            <button type="button" onClick={handleClose} aria-label="Close" className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-xl leading-none">×</button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Status block — blocked if TAKEN or EXPIRED */}
            {isBlocked ? (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
                <p className="text-sm font-semibold text-amber-800">
                  {listing.status === ListingStatus.TAKEN
                    ? (pm as unknown as { editBlockedTaken: string }).editBlockedTaken
                    : (pm as unknown as { editBlockedExpired: string }).editBlockedExpired}
                </p>
              </div>
            ) : (
              <ReviewForm
                data={formData}
                onChange={setFormData}
                photos={photos}
                onPhotosChange={setPhotos}
                errors={errors}
                t={t}
                pm={pm}
                amenityLabels={amenityLabels}
                subletTypeLabels={subletTypeLabels}
              />
            )}
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex gap-3">
            <button type="button" onClick={handleClose} className="py-3.5 px-5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">
              {t.cancel}
            </button>
            {!isBlocked && (
              <button
                type="button"
                disabled={isSubmitting || !isDirty()}
                onClick={handleSubmit}
                className="flex-1 py-3.5 bg-cyan-600 text-white rounded-2xl font-black text-sm hover:bg-cyan-700 disabled:opacity-40 transition-all shadow-lg shadow-cyan-100/50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {pm.updateListingBtn}
              </button>
            )}
          </div>
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
