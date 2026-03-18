'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { extractListingFromText } from '@/actions/gemini';
import { geocodeAddress } from '@/services/geocodingService';
import { persistenceService } from '@/services/persistenceService';
import { storage, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { type GeminiResult } from '@/services/geminiService';
import { SubletType, ListingStatus, type Sublet } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotoUpload {
  id: string;
  file: File;
  preview: string;
  progress: number;
  url: string | null;
  error: string | null;
}

interface FormState {
  type: SubletType;
  title: string;
  location: string;
  price: string;
  currency: string;
  startDate: string;
  endDate: string;
  description: string;
}

const BLANK_FORM: FormState = {
  type: SubletType.ENTIRE,
  title: '',
  location: '',
  price: '',
  currency: 'ILS',
  startDate: '',
  endDate: '',
  description: '',
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function ConfBadge({ score }: { score: number }) {
  const hi = score >= 70;
  return (
    <span
      className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${hi ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}
      title={hi ? `AI confidence: ${score}%` : `Low confidence (${score}%) — please verify`}
    >
      {score}%
    </span>
  );
}

function MobileInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4A7CC7] focus:ring-2 focus:ring-[#4A7CC7]/10 transition-colors ${props.className ?? ''}`}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{children}</p>;
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={`rounded-full transition-all duration-300 ${
            s === step
              ? 'w-6 h-2 bg-[#4A7CC7]'
              : s < step
              ? 'w-2 h-2 bg-[#4A7CC7]/40'
              : 'w-2 h-2 bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Photo strip (mobile) ─────────────────────────────────────────────────────

function MobilePhotoStrip({
  photos,
  onChange,
}: {
  photos: PhotoUpload[];
  onChange: React.Dispatch<React.SetStateAction<PhotoUpload[]>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const MAX = 8;

  const uploadFile = useCallback(async (photo: PhotoUpload) => {
    if (!storage) {
      onChange(prev => prev.map(p => p.id === photo.id ? { ...p, error: 'Storage unavailable', progress: 0 } : p));
      return;
    }
    const storageRef = ref(storage, `listing-photos/${Date.now()}-${photo.file.name}`);
    const task = uploadBytesResumable(storageRef, photo.file);
    task.on(
      'state_changed',
      snap => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onChange(prev => prev.map(p => p.id === photo.id ? { ...p, progress: pct } : p));
      },
      err => {
        onChange(prev => prev.map(p => p.id === photo.id ? { ...p, error: err.message, progress: 0 } : p));
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange(prev => prev.map(p => p.id === photo.id ? { ...p, url, progress: 100 } : p));
      }
    );
  }, [onChange]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX - photos.length;
    const toAdd = Array.from(files).slice(0, remaining);
    const newPhotos: PhotoUpload[] = await Promise.all(
      toAdd.map(async file => {
        if (file.size > 5 * 1024 * 1024) {
          return { id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), progress: 0, url: null, error: 'Too large (max 5MB)' };
        }
        const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
        return { id: crypto.randomUUID(), file: compressed, preview: URL.createObjectURL(compressed), progress: 0, url: null, error: null };
      })
    );
    const updated = [...photos, ...newPhotos];
    onChange(updated);
    newPhotos.filter(p => !p.error).forEach(p => uploadFile(p));
  }, [photos, onChange, uploadFile]);

  return (
    <div>
      <FieldLabel>Photos (optional, max {MAX})</FieldLabel>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {photos.map(p => (
          <div key={p.id} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-slate-100">
            <img src={p.preview} alt="" className="w-full h-full object-cover" />
            {p.progress < 100 && !p.error && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{p.progress}%</span>
              </div>
            )}
            {p.error && (
              <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center p-1">
                <span className="text-white text-[9px] text-center leading-tight">!</span>
              </div>
            )}
            <button
              onClick={() => onChange(prev => prev.filter(x => x.id !== p.id))}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {photos.length < MAX && (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-[#4A7CC7]/30 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-[#4A7CC7]/60 hover:bg-blue-50/30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[10px] font-medium">Add</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}

// ─── AI extracted fields (mobile) ────────────────────────────────────────────

function AiFields({
  result,
  form,
  onChange,
}: {
  result: GeminiResult;
  form: FormState;
  onChange: (p: Partial<FormState>) => void;
}) {
  const c = result.confidence;
  const field = (label: string, key: keyof FormState, score: number | undefined, type = 'text') => (
    <div key={key}>
      <div className="flex items-center mb-1">
        <FieldLabel>{label}</FieldLabel>
        {score !== undefined && <ConfBadge score={score} />}
      </div>
      <MobileInput
        type={type}
        value={form[key] as string}
        onChange={e => onChange({ [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="mt-3 bg-[#4A7CC7]/5 border border-[#4A7CC7]/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-green-600">✓ AI extracted</span>
        <span className="text-xs text-slate-400">— tap any field to edit</span>
      </div>
      {field('Location', 'location', c?.location)}
      {field('Price', 'price', c?.price, 'number')}
      {field('Available from', 'startDate', c?.dates, 'date')}
      {field('Available until', 'endDate', c?.dates, 'date')}
      <div>
        <FieldLabel>Title</FieldLabel>
        <MobileInput
          value={form.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="e.g. Bright 2BR in Florentin"
        />
      </div>
    </div>
  );
}

// ─── Manual form (mobile) ─────────────────────────────────────────────────────

function ManualFields({ form, onChange }: { form: FormState; onChange: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-3 mt-3">
      <div>
        <FieldLabel>Property type</FieldLabel>
        <select
          value={form.type}
          onChange={e => onChange({ type: e.target.value as SubletType })}
          className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#4A7CC7] focus:ring-2 focus:ring-[#4A7CC7]/10 transition-colors"
        >
          <option value={SubletType.ENTIRE}>Entire Place</option>
          <option value={SubletType.ROOMMATE}>Room / Roommate</option>
          <option value={SubletType.STUDIO}>Studio</option>
        </select>
      </div>
      <div>
        <FieldLabel>Title</FieldLabel>
        <MobileInput value={form.title} onChange={e => onChange({ title: e.target.value })} placeholder="e.g. Bright 2BR in Florentin" maxLength={80} />
      </div>
      <div>
        <FieldLabel>Location</FieldLabel>
        <MobileInput value={form.location} onChange={e => onChange({ location: e.target.value })} placeholder="Neighborhood or full address" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <FieldLabel>Price / month</FieldLabel>
          <MobileInput type="number" value={form.price} onChange={e => onChange({ price: e.target.value })} placeholder="0" min={0} />
        </div>
        <div className="w-24">
          <FieldLabel>Currency</FieldLabel>
          <select
            value={form.currency}
            onChange={e => onChange({ currency: e.target.value })}
            className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#4A7CC7] focus:ring-2 focus:ring-[#4A7CC7]/10 transition-colors"
          >
            <option value="ILS">₪ ILS</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <FieldLabel>From</FieldLabel>
          <MobileInput type="date" value={form.startDate} onChange={e => onChange({ startDate: e.target.value })} />
        </div>
        <div className="flex-1">
          <FieldLabel>Until</FieldLabel>
          <MobileInput type="date" value={form.endDate} onChange={e => onChange({ endDate: e.target.value })} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Description</FieldLabel>
          <span className="text-[11px] text-slate-400">{form.description.length}/500</span>
        </div>
        <textarea
          value={form.description}
          maxLength={500}
          onChange={e => onChange({ description: e.target.value })}
          rows={4}
          placeholder="Describe the apartment, vibe, rules, what's included..."
          className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4A7CC7] focus:ring-2 focus:ring-[#4A7CC7]/10 transition-colors resize-none"
        />
      </div>
    </div>
  );
}

// ─── Preview card ─────────────────────────────────────────────────────────────

function PreviewCard({
  form,
  aiResult,
  photos,
  user,
}: {
  form: FormState;
  aiResult: GeminiResult | null;
  photos: PhotoUpload[];
  user: { name: string; email: string } | null;
}) {
  const coverUrl = photos.find(p => p.url)?.url ?? photos[0]?.preview ?? null;
  const currencySymbol: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };
  const sym = currencySymbol[form.currency] ?? form.currency;

  const typeLabel: Record<SubletType, string> = {
    [SubletType.ENTIRE]: 'Entire Place',
    [SubletType.ROOMMATE]: 'Room',
    [SubletType.STUDIO]: 'Studio',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Image */}
      <div className="w-full h-44 relative" style={{ backgroundColor: '#d0dff5' }}>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-[#4A7CC7]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {aiResult && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-black text-white rounded-full" style={{ backgroundColor: '#F5831F' }}>
            AI PARSED
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-base leading-tight truncate">
              {form.title || form.location || 'Your listing'}
            </p>
            <p className="text-sm text-slate-500 mt-0.5 truncate">
              {form.location || '—'}
            </p>
          </div>
          <p className="text-lg font-black shrink-0" style={{ color: '#4A7CC7' }}>
            {sym}{form.price ? Number(form.price).toLocaleString() : '—'}
            <span className="text-xs font-medium text-slate-400">/mo</span>
          </p>
        </div>

        {(form.startDate || form.endDate) && (
          <p className="text-xs text-slate-400">
            {form.startDate && new Date(form.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {form.startDate && form.endDate && ' — '}
            {form.endDate && new Date(form.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}

        <span className="inline-block px-2.5 py-0.5 bg-[#4A7CC7]/10 text-[#4A7CC7] text-[11px] font-bold rounded-full">
          {typeLabel[form.type]}
        </span>
      </div>

      {/* Contact summary */}
      {user && (
        <div className="mx-4 mb-4 px-3 py-2.5 bg-slate-50 rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#4A7CC7] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MobilePostScreen() {
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputTab, setInputTab] = useState<'ai' | 'manual'>('ai');
  const [pasteUrl, setPasteUrl] = useState('');

  const [aiResult, setAiResult] = useState<GeminiResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');

  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const patchForm = (p: Partial<FormState>) => setForm(f => ({ ...f, ...p }));

  const [photos, setPhotos] = useState<PhotoUpload[]>([]);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [published, setPublished] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // ── AI analyze ─────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    const input = pasteUrl.trim();
    if (!input) return;
    setIsAnalyzing(true);
    setAiError('');
    setAiResult(null);
    try {
      const result = await extractListingFromText(input);
      setAiResult(result);
      setForm({
        type: result.type ?? SubletType.ENTIRE,
        title: result.extractedTitle
          ?? (result.location ? `${result.type ?? 'Place'} in ${result.location}` : ''),
        location: result.location ?? '',
        price: result.price ? String(result.price) : '',
        currency: result.currency ?? 'ILS',
        startDate: result.startDate ?? '',
        description: result.extractedDescription ?? '',
        endDate: result.endDate ?? '',
      });
    } catch {
      setAiError('Analysis failed. Try again or fill manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Publish ────────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    const firebaseUser = auth?.currentUser;
    if (!user || !firebaseUser) {
      setPublishError('You must be signed in to publish a listing.');
      return;
    }

    const stillUploading = photos.some(p => p.progress < 100 && !p.error);
    if (stillUploading) { setPublishError('Please wait for photos to finish uploading.'); return; }
    if (!form.location.trim()) { setPublishError('Please enter a location.'); return; }
    if (!form.price || Number(form.price) <= 0) { setPublishError('Please enter a valid price.'); return; }

    setIsPublishing(true);
    setPublishError('');

    const coords = await geocodeAddress(form.location);
    if (!coords) {
      setPublishError("We couldn't find this location. Please be more specific.");
      setIsPublishing(false);
      return;
    }

    const imageUrls = photos.filter(p => p.url).map(p => p.url as string);

    const listing = {
      id: 'new',
      sourceUrl: '',
      originalText: pasteUrl || '',
      price: Number(form.price),
      currency: form.currency,
      startDate: form.startDate,
      endDate: form.endDate,
      location: form.location,
      lat: coords.lat,
      lng: coords.lng,
      type: form.type,
      status: 'pending_review' as unknown as ListingStatus,
      createdAt: Date.now(),
      ownerId: firebaseUser.uid,
      authorName: firebaseUser.displayName ?? user.name,
      images: imageUrls,
      city: aiResult?.city || undefined,
      ...({ userId: firebaseUser.uid, userEmail: firebaseUser.email ?? '', userDisplayName: firebaseUser.displayName ?? '' } as any),
    } as Sublet;

    try {
      await persistenceService.saveListing(listing);
      setPublished(true);
    } catch {
      setPublishError('Failed to save. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setForm(BLANK_FORM);
    setPasteUrl('');
    setAiResult(null);
    setPhotos([]);
    setPublished(false);
    setPublishError('');
  };

  // ── Success state ──────────────────────────────────────────────────────────

  if (published) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white px-6 pb-24 text-center">
        <div className="w-16 h-16 rounded-full bg-[#4A7CC7] flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-slate-900">Your listing is under review</h2>
        <p className="text-sm text-slate-500 mt-1 mb-8">We'll notify you once it's live on the map.</p>
        <div className="w-full space-y-3">
          <button
            onClick={handleReset}
            className="w-full py-3 rounded-2xl border border-[#4A7CC7] text-[#4A7CC7] text-sm font-bold hover:bg-blue-50 transition-colors"
          >
            Post another listing
          </button>
          <Link href="/map" className="block w-full py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-semibold text-center hover:bg-slate-200 transition-colors">
            Back to map
          </Link>
        </div>
      </div>
    );
  }

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 px-4 pt-4 pb-3 shrink-0 flex items-center justify-between">
        <div className="w-8">
          {step > 1 && (
            <button
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              className="w-8 h-8 flex items-center justify-center text-slate-500 rounded-full hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-sm font-black text-slate-900">Create Post</p>
        <ProgressDots step={step} />
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 pb-32 space-y-4">

          {/* ════════════════ STEP 1 ════════════════ */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-lg font-black text-slate-900">What are you posting?</p>

              {/* Option A — selected */}
              <div className="bg-white border-2 border-[#4A7CC7] rounded-2xl p-4 flex items-start gap-4" style={{ backgroundColor: '#f0f5ff' }}>
                <div className="w-12 h-12 rounded-xl bg-[#4A7CC7]/15 flex items-center justify-center text-2xl shrink-0">🏠</div>
                <div>
                  <p className="font-black text-slate-900 text-sm">I have a place to rent</p>
                  <p className="text-xs text-slate-500 mt-0.5">List your flat, sublet or room</p>
                </div>
                <div className="ml-auto mt-0.5 w-5 h-5 rounded-full border-2 border-[#4A7CC7] flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#4A7CC7]" />
                </div>
              </div>

              {/* Option B — disabled */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-4 opacity-50">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">🔍</div>
                <div>
                  <p className="font-bold text-slate-500 text-sm">I'm looking for a place</p>
                  <p className="text-xs text-slate-400 mt-0.5">Post what you're searching for</p>
                </div>
                <span className="ml-auto mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-full shrink-0">Soon</span>
              </div>
            </div>
          )}

          {/* ════════════════ STEP 2 ════════════════ */}
          {step === 2 && (
            <div>
              {/* Main tabs */}
              <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
                {([['ai', '✨ AI'], ['manual', 'Manual']] as const).map(([t, l]) => (
                  <button
                    key={t}
                    onClick={() => setInputTab(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      inputTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {inputTab === 'ai' ? (
                <div className="space-y-3">
                  {/* AI badge */}
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-[#4A7CC7]/10 text-[#4A7CC7] text-xs font-black rounded-full">✨ Gemini AI</span>
                    <span className="text-xs text-slate-400">powered extraction</span>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Listing or post URL</FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔗</span>
                      <MobileInput
                        value={pasteUrl}
                        onChange={e => setPasteUrl(e.target.value)}
                        placeholder="https://facebook.com/groups/..."
                        className="pl-8"
                      />
                    </div>
                    <p className="text-xs text-slate-400">Paste any public URL — Facebook, Airbnb, Yad2, Madlan, and more</p>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !pasteUrl.trim()}
                    className="w-full py-3 bg-[#4A7CC7] text-white text-sm font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : 'Fetch & Analyze'}
                  </button>

                  {aiError && <p className="text-xs text-red-500 font-medium">{aiError}</p>}

                  {aiResult && (
                    <>
                      <AiFields result={aiResult} form={form} onChange={patchForm} />
                      <p className="mt-3 text-xs text-slate-400">
                        📷 Add photos after publishing from your listing page
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <ManualFields form={form} onChange={patchForm} />
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <MobilePhotoStrip photos={photos} onChange={setPhotos} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════════════ STEP 3 ════════════════ */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-500">Review before publishing</p>
              <PreviewCard form={form} aiResult={aiResult} photos={photos} user={user} />

              {/* Confirmation checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none bg-slate-50 rounded-2xl p-4">
                <div
                  onClick={() => setConfirmed(v => !v)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                    confirmed ? 'bg-[#4A7CC7] border-[#4A7CC7]' : 'border-slate-300 bg-white'
                  }`}
                >
                  {confirmed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-slate-600 leading-snug">
                  I confirm this is my listing and I have the right to publish it. I agree to SubHub's{' '}
                  <span className="text-[#4A7CC7] font-semibold">terms of service</span>.
                </span>
              </label>

              {publishError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                  {publishError}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Sticky footer ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 pt-3 pb-6 flex gap-3 shrink-0">
        {step === 1 && (
          <button
            onClick={() => setStep(2)}
            className="flex-1 py-3.5 rounded-2xl bg-[#4A7CC7] text-white text-sm font-bold transition-colors hover:bg-[#3b66a6]"
          >
            Next →
          </button>
        )}

        {step === 2 && (
          <>
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3.5 rounded-2xl bg-[#4A7CC7] text-white text-sm font-bold transition-colors hover:bg-[#3b66a6]"
            >
              Preview →
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing || !confirmed}
              className="flex-1 py-3.5 rounded-2xl bg-[#4A7CC7] text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isPublishing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publishing...
                </>
              ) : 'Publish ✓'}
            </button>
          </>
        )}
      </div>

    </div>
  );
}
