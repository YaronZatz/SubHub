'use client';

import React from 'react';
import { SubletType, RentalDuration } from '../../types';
import AmenitiesGrid, { type AmenityKey } from './AmenitiesGrid';
import PhotoUploader from './PhotoUploader';
import type { ReviewFormData, ReviewFormErrors } from './reviewFormTypes';

interface PostModalTranslations {
  locationLabel: string;
  cityLabel: string;
  neighborhoodLabel: string;
  priceLabel: string;
  currencyLabel: string;
  startDateLabel: string;
  endDateLabel: string;
  openEndedLabel: string;
  typeLabel: string;
  rentalDurationLabel: string;
  amenitiesLabel: string;
  descriptionLabel: string;
  sourceUrlLabel: string;
  photosLabel: string;
  photosSubtitle: string;
  photoLimit: string;
  photoSize: string;
  currencyILS: string;
  currencyUSD: string;
  currencyEUR: string;
  rentalDurationSublet: string;
  rentalDurationShortTerm: string;
  rentalDurationLongTerm: string;
  amenityLabels: Record<AmenityKey, string>;
  subletTypeLabels: Record<SubletType, string>;
}

interface ListingReviewFormProps {
  data: ReviewFormData;
  onChange: (data: ReviewFormData) => void;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  errors: ReviewFormErrors;
  t: PostModalTranslations;
  /** When true the photo section is read-only (no adding, only removing) */
  photosReadOnly?: boolean;
}

function FieldWrapper({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {children}
      {error && <p className="text-[11px] text-red-500 font-semibold">{error}</p>}
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

const inputCls =
  'w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all';
const inputErrCls =
  'w-full p-3 bg-red-50 border border-red-300 rounded-xl text-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all';

export default function ListingReviewForm({
  data,
  onChange,
  photos,
  onPhotosChange,
  errors,
  t,
  photosReadOnly = false,
}: ListingReviewFormProps) {
  const set = <K extends keyof ReviewFormData>(key: K, value: ReviewFormData[K]) =>
    onChange({ ...data, [key]: value });

  const [photoError, setPhotoError] = React.useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Location section */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
          {t.locationLabel}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper error={errors.location}>
            <Label required>{t.locationLabel}</Label>
            <input
              type="text"
              value={data.location}
              onChange={(e) => set('location', e.target.value)}
              className={errors.location ? inputErrCls : inputCls}
              placeholder="12 Rothschild Blvd"
            />
          </FieldWrapper>
          <FieldWrapper error={errors.city}>
            <Label required>{t.cityLabel}</Label>
            <input
              type="text"
              value={data.city}
              onChange={(e) => set('city', e.target.value)}
              className={errors.city ? inputErrCls : inputCls}
              placeholder="Tel Aviv"
            />
          </FieldWrapper>
          <FieldWrapper error={errors.neighborhood}>
            <Label>{t.neighborhoodLabel}</Label>
            <input
              type="text"
              value={data.neighborhood}
              onChange={(e) => set('neighborhood', e.target.value)}
              className={inputCls}
            />
          </FieldWrapper>
        </div>
      </section>

      {/* Price & Type section */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
          {t.priceLabel} & {t.typeLabel}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper error={errors.price}>
            <Label required>{t.priceLabel}</Label>
            <input
              type="number"
              min={0}
              value={data.price}
              onChange={(e) => set('price', e.target.value)}
              className={errors.price ? inputErrCls : inputCls}
              placeholder="5000"
            />
          </FieldWrapper>
          <FieldWrapper error={errors.currency}>
            <Label required>{t.currencyLabel}</Label>
            <select
              value={data.currency}
              onChange={(e) => set('currency', e.target.value as ReviewFormData['currency'])}
              className={inputCls + ' cursor-pointer'}
            >
              <option value="ILS">{t.currencyILS}</option>
              <option value="USD">{t.currencyUSD}</option>
              <option value="EUR">{t.currencyEUR}</option>
            </select>
          </FieldWrapper>
          <FieldWrapper error={errors.type}>
            <Label required>{t.typeLabel}</Label>
            <select
              value={data.type}
              onChange={(e) => set('type', e.target.value as SubletType | '')}
              className={(errors.type ? 'bg-red-50 border-red-300 ' : 'bg-slate-50 border-slate-200 ') + 'w-full p-3 rounded-xl text-sm border focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all cursor-pointer'}
            >
              <option value="">—</option>
              {Object.values(SubletType).map((v) => (
                <option key={v} value={v}>{t.subletTypeLabels[v]}</option>
              ))}
            </select>
          </FieldWrapper>
          <FieldWrapper error={errors.rentalDuration}>
            <Label required>{t.rentalDurationLabel}</Label>
            <select
              value={data.rentalDuration}
              onChange={(e) => set('rentalDuration', e.target.value as RentalDuration | '')}
              className={(errors.rentalDuration ? 'bg-red-50 border-red-300 ' : 'bg-slate-50 border-slate-200 ') + 'w-full p-3 rounded-xl text-sm border focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all cursor-pointer'}
            >
              <option value="">—</option>
              <option value={RentalDuration.SUBLET}>{t.rentalDurationSublet}</option>
              <option value={RentalDuration.SHORT_TERM}>{t.rentalDurationShortTerm}</option>
              <option value={RentalDuration.LONG_TERM}>{t.rentalDurationLongTerm}</option>
            </select>
          </FieldWrapper>
        </div>
      </section>

      {/* Timeline section */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
          {t.startDateLabel} & {t.endDateLabel}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper error={errors.startDate}>
            <Label required>{t.startDateLabel}</Label>
            <input
              type="date"
              value={data.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className={(errors.startDate ? inputErrCls : inputCls) + ' cursor-pointer appearance-none'}
            />
          </FieldWrapper>
          {!data.openEnded && (
            <FieldWrapper error={errors.endDate}>
              <Label>{t.endDateLabel}</Label>
              <input
                type="date"
                value={data.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className={(errors.endDate ? inputErrCls : inputCls) + ' cursor-pointer appearance-none'}
              />
            </FieldWrapper>
          )}
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            onClick={() => set('openEnded', !data.openEnded)}
            className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${data.openEnded ? 'bg-cyan-600' : 'bg-slate-200'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${data.openEnded ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm text-slate-600">{t.openEndedLabel}</span>
        </label>
      </section>

      {/* Amenities section */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
          {t.amenitiesLabel}
        </h3>
        <AmenitiesGrid
          selected={data.amenities}
          onChange={(a) => set('amenities', a)}
          labels={t.amenityLabels}
        />
      </section>

      {/* Description & Source URL */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
          {t.descriptionLabel}
        </h3>
        <FieldWrapper>
          <Label>{t.descriptionLabel}</Label>
          <textarea
            value={data.description}
            onChange={(e) => set('description', e.target.value)}
            className="w-full h-28 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all"
          />
        </FieldWrapper>
        <FieldWrapper>
          <Label>{t.sourceUrlLabel}</Label>
          <input
            type="url"
            value={data.sourceUrl}
            onChange={(e) => set('sourceUrl', e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
        </FieldWrapper>
      </section>

      {/* Photos section */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
          {t.photosLabel}
        </h3>
        {photosReadOnly ? (
          <div className="flex flex-wrap gap-2">
            {photos.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm bg-slate-100 group shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onPhotosChange(photos.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-xs leading-none hover:bg-black/80 transition-colors"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <PhotoUploader
            photos={photos}
            onChange={onPhotosChange}
            error={photoError}
            onError={(msg) => {
              setPhotoError(msg);
              setTimeout(() => setPhotoError(null), 4000);
            }}
            subtitle={t.photosSubtitle}
          />
        )}
      </section>
    </div>
  );
}
