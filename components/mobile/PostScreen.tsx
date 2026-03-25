'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { extractListingFromText, extractListingFromImage } from '@/actions/gemini';
import { geocodeAddress } from '@/services/geocodingService';
import { persistenceService } from '@/services/persistenceService';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { type GeminiResult } from '@/services/geminiService';
import { SubletType, ListingStatus, type Sublet } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

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
              ? 'w-6 h-2 bg-gradient-to-r from-[#2F6EA8] to-[#F97316]'
              : s < step
              ? 'w-2 h-2 bg-[#2F6EA8]/40'
              : 'w-2 h-2 bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

// ─── AI extracted fields (mobile) ────────────────────────────────────────────

function AiFields({
  result,
  form,
  onChange,
  images,
}: {
  result: GeminiResult;
  form: FormState;
  onChange: (p: Partial<FormState>) => void;
  images: string[];
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

      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {images.slice(0, 4).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt=""
              className="h-16 w-24 object-cover rounded-xl shrink-0 border border-[#4A7CC7]/20"
            />
          ))}
        </div>
      )}
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

// ─── Preview card ─────────────────────────────────────────────────────────────

function PreviewCard({
  form,
  aiResult,
  user,
  images,
}: {
  form: FormState;
  aiResult: GeminiResult | null;
  user: { name: string; email: string } | null;
  images?: string[];
}) {
  const currencySymbol: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };
  const sym = currencySymbol[form.currency] ?? form.currency;

  const typeLabel: Record<SubletType, string> = {
    [SubletType.ENTIRE]: 'Entire Place',
    [SubletType.ROOMMATE]: 'Room',
    [SubletType.STUDIO]: 'Studio',
  };

  const hasPhotos = images && images.length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Image */}
      <div className="w-full h-44 relative" style={{ backgroundColor: '#d0dff5' }}>
        {hasPhotos ? (
          <img src={images[0]} alt="Listing preview" className="w-full h-full object-cover" />
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
        {hasPhotos && images.length > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            +{images.length - 1} more
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
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pasteUrl, setPasteUrl] = useState('');

  const [aiResult, setAiResult] = useState<GeminiResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [extractedImages, setExtractedImages] = useState<string[]>([]);

  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const patchForm = (p: Partial<FormState>) => setForm(f => ({ ...f, ...p }));

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [published, setPublished] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          const MAX = 1000;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const max = 10 - extractedImages.length;
    const toProcess = Array.from(files).slice(0, max);
    const newImages: string[] = [];
    for (const file of toProcess) {
      try {
        newImages.push(await processImage(file));
      } catch { /* skip failed */ }
    }
    setExtractedImages(prev => [...prev, ...newImages]);
    e.target.value = '';
  }, [extractedImages.length, processImage]);

  const handleScanUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    setAiError('');
    try {
      const base64 = await processImage(file);
      const result = await extractListingFromImage(base64, 'image/jpeg');
      setAiResult(result);
      setExtractedImages(prev => [...prev, base64]);
      setForm(f => ({
        ...f,
        type: result.type ?? f.type,
        title: result.extractedTitle ?? result.location ?? f.title,
        location: result.location ?? f.location,
        price: result.price ? String(result.price) : f.price,
        currency: result.currency ?? f.currency,
        startDate: result.startDate ?? f.startDate,
        endDate: result.endDate ?? f.endDate,
        description: result.extractedDescription ?? f.description,
      }));
    } catch {
      setAiError('Failed to extract from image. Fill details manually.');
    } finally {
      setIsAnalyzing(false);
    }
    e.target.value = '';
  }, [processImage]);

  const removeImage = useCallback((idx: number) => {
    setExtractedImages(prev => prev.filter((_, i) => i !== idx));
  }, []);

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
      setExtractedImages(result.imageUrls ?? []);
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
      setAiError('Analysis failed. Please check the URL and try again.');
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

    const listing = {
      id: 'new',
      sourceUrl: pasteUrl.trim(),
      originalText: pasteUrl.trim(),
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
      images: extractedImages,
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
    setExtractedImages([]);
    setPublished(false);
    setPublishError('');
  };

  // ── Success state ──────────────────────────────────────────────────────────

  if (published) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-white px-6 pb-24 text-center">
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
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 px-4 pt-4 pb-3 shrink-0 flex items-center justify-between">
        <div className="w-11">
          {step === 1 ? (
            <button
              onClick={() => router.back()}
              className="w-11 h-11 flex items-center justify-center text-slate-500 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors -ml-1.5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              className="w-11 h-11 flex items-center justify-center text-slate-500 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors -ml-1.5"
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
            <div className="space-y-4">
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
                className="w-full min-h-[44px] py-3 bg-[#4A7CC7] text-white text-sm font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 active:scale-[0.97]"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Fetching and analyzing...
                  </>
                ) : 'Fetch & Analyze'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs font-bold text-slate-400 uppercase">or upload photos</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Photo upload section */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => scanInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="flex-1 min-h-[48px] py-3 bg-[#F97316] text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {isAnalyzing ? 'Scanning...' : 'Scan Screenshot'}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 min-h-[48px] py-3 bg-white border-2 border-slate-200 text-slate-700 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add Photos
                  </button>
                </div>
                <input type="file" ref={scanInputRef} onChange={handleScanUpload} accept="image/*" capture="environment" className="hidden" />
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" multiple className="hidden" />

                {extractedImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x" style={{ scrollbarWidth: 'none' }}>
                    {extractedImages.map((url, i) => (
                      <div key={i} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden snap-start">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 min-w-[24px] min-h-[24px] flex items-center justify-center text-xs"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {extractedImages.length < 10 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 active:bg-slate-50"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {aiError && <p className="text-xs text-red-500 font-medium">{aiError}</p>}

              {aiResult && (
                <AiFields result={aiResult} form={form} onChange={patchForm} images={extractedImages} />
              )}
            </div>
          )}

          {/* ════════════════ STEP 3 ════════════════ */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-500">Review before publishing</p>
              <PreviewCard form={form} aiResult={aiResult} user={user} images={extractedImages} />

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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 pt-3 pb-6 flex gap-3 shrink-0 safe-area-bottom">
        {step === 1 && (
          <button
            onClick={() => setStep(2)}
            className="flex-1 min-h-[48px] py-3.5 rounded-2xl bg-[#4A7CC7] text-white text-sm font-bold transition-colors active:scale-[0.97]"
          >
            Next →
          </button>
        )}

        {step === 2 && (
          <>
            <button
              onClick={() => setStep(1)}
              className="px-6 min-h-[48px] py-3.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold active:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 min-h-[48px] py-3.5 rounded-2xl bg-[#4A7CC7] text-white text-sm font-bold transition-colors active:scale-[0.97]"
            >
              Preview →
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <button
              onClick={() => setStep(2)}
              className="px-6 min-h-[48px] py-3.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold active:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing || !confirmed}
              className="flex-1 min-h-[48px] py-3.5 rounded-2xl bg-[#4A7CC7] text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 active:scale-[0.97]"
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
