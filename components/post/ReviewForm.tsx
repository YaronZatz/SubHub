'use client';

import React, { useState } from 'react';
import { SubletType, RentalDuration, Language } from '../../types';
import { translations } from '../../translations';
import PhotoUploader from './PhotoUploader';
import AmenitiesGrid from './AmenitiesGrid';
import type { AmenityKey } from './AmenitiesGrid';
import type { ReviewFormData, ReviewFormErrors } from './reviewFormTypes';
import { FL, SectionHeading, ic, icErr } from './formPrimitives';

export default function ReviewForm({
  data, onChange, photos, onPhotosChange, errors, t, pm, amenityLabels, subletTypeLabels, photosReadOnly,
}: {
  data: ReviewFormData; onChange: (d: ReviewFormData) => void;
  photos: string[]; onPhotosChange: (p: string[]) => void;
  errors: ReviewFormErrors;
  t: (typeof translations)[Language];
  pm: (typeof translations)[Language]['postModal'];
  amenityLabels: Record<AmenityKey, string>;
  subletTypeLabels: Record<SubletType, string>;
  photosReadOnly?: boolean;
}) {
  const s = <K extends keyof ReviewFormData>(k: K, v: ReviewFormData[K]) => onChange({ ...data, [k]: v });
  const te = (v?: string) => !v ? undefined : v === 'required' ? pm.fieldRequired : v === 'end_before_start' ? pm.endDateBeforeStart : v;
  const [photoErr, setPhotoErr] = useState<string | null>(null);

  // suppress unused variable warning — t is kept in props for future use
  void t;

  return (
    <div className="space-y-7">
      {/* Location section */}
      <div>
        <SectionHeading>{pm.locationLabel}</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          <FL label={pm.locationLabel} required error={te(errors.location)}>
            <input value={data.location} onChange={e => s('location', e.target.value)} className={errors.location ? icErr : ic} placeholder="12 Rothschild Blvd" />
          </FL>
          <FL label={pm.cityLabel} required error={te(errors.city)}>
            <input value={data.city} onChange={e => s('city', e.target.value)} className={errors.city ? icErr : ic} placeholder="Tel Aviv" />
          </FL>
          <FL label={pm.neighborhoodLabel}>
            <input value={data.neighborhood} onChange={e => s('neighborhood', e.target.value)} className={ic} />
          </FL>
        </div>
      </div>

      {/* Price & Type */}
      <div>
        <SectionHeading>{pm.priceLabel} & {pm.typeLabel}</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          <FL label={pm.priceLabel} required error={te(errors.price)}>
            <input type="number" min={0} value={data.price} onChange={e => s('price', e.target.value)} className={errors.price ? icErr : ic} placeholder="5000" />
          </FL>
          <FL label={pm.currencyLabel} required>
            <select value={data.currency} onChange={e => s('currency', e.target.value as ReviewFormData['currency'])} className={ic + ' cursor-pointer'}>
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
      </div>

      {/* Dates */}
      <div>
        <SectionHeading>{pm.startDateLabel}</SectionHeading>
        <div className="grid grid-cols-2 gap-3 mb-3">
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

      {/* Amenities */}
      <div>
        <SectionHeading>{pm.amenitiesLabel}</SectionHeading>
        <AmenitiesGrid selected={data.amenities} onChange={a => s('amenities', a)} labels={amenityLabels} />
      </div>

      {/* Description & URL */}
      <div>
        <SectionHeading>{pm.descriptionLabel}</SectionHeading>
        <div className="space-y-3">
          <FL label={pm.descriptionLabel}>
            <textarea value={data.description} onChange={e => s('description', e.target.value)} rows={3} className="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all resize-none" />
          </FL>
          <FL label={pm.sourceUrlLabel}>
            <input type="url" value={data.sourceUrl} onChange={e => s('sourceUrl', e.target.value)} placeholder="https://…" className={ic} />
          </FL>
        </div>
      </div>

      {/* Photos */}
      <div>
        <SectionHeading>{pm.photosLabel}</SectionHeading>
        {photosReadOnly ? (
          <div className="flex flex-wrap gap-2">
            {photos.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => onPhotosChange(photos.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/80 transition-colors">×</button>
              </div>
            ))}
          </div>
        ) : (
          <PhotoUploader photos={photos} onChange={onPhotosChange} subtitle={pm.photosSubtitle} error={photoErr} onError={msg => { setPhotoErr(msg); setTimeout(() => setPhotoErr(null), 4000); }} />
        )}
      </div>
    </div>
  );
}
