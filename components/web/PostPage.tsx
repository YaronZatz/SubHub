'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { extractListingFromText } from '@/actions/gemini';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  const isHigh = score >= 70;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
        isHigh ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'
      }`}
      title={isHigh ? `AI confidence: ${score}%` : `Low confidence (${score}%) — please verify this field`}
    >
      {score}%
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4A7CC7] focus:ring-2 focus:ring-[#4A7CC7]/10 transition-colors ${props.className ?? ''}`}
    />
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

// ─── AI extracted fields ──────────────────────────────────────────────────────

function AiExtractedFields({
  result,
  form,
  onFormChange,
  images,
}: {
  result: GeminiResult;
  form: FormState;
  onFormChange: (patch: Partial<FormState>) => void;
  images: string[];
}) {
  const conf = result.confidence;

  const field = (
    label: string,
    key: keyof FormState,
    confScore: number | undefined,
    type = 'text'
  ) => (
    <div key={key}>
      <div className="flex items-center gap-1.5 mb-1">
        <Label>{label}</Label>
        {confScore !== undefined && <ConfidenceBadge score={confScore} />}
        {confScore !== undefined && confScore < 70 && (
          <span className="text-[10px] text-orange-500 font-medium">Please verify</span>
        )}
      </div>
      <Input
        type={type}
        value={form[key] as string}
        onChange={e => onFormChange({ [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="mt-4 bg-[#4A7CC7]/5 border border-[#4A7CC7]/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-600 font-bold text-sm">✓ AI extracted</span>
        <span className="text-slate-400 text-xs">— edit any field if needed</span>
      </div>

      {images.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {images.slice(0, 5).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt=""
              className="h-20 w-28 object-cover rounded-lg shrink-0 border border-slate-200"
            />
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {field('Location', 'location', conf?.location)}
        {field('Price', 'price', conf?.price, 'number')}
        {field('Available from', 'startDate', conf?.dates, 'date')}
        {field('Available until', 'endDate', conf?.dates, 'date')}
        <div className="col-span-2">
          <Label>Title (auto-generated — edit freely)</Label>
          <Input
            value={form.title}
            onChange={e => onFormChange({ title: e.target.value })}
            placeholder="e.g. Bright 2BR in Florentin, July–Aug"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function WebPostPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [pasteUrl, setPasteUrl] = useState('');

  // AI result
  const [aiResult, setAiResult] = useState<GeminiResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [extractedImages, setExtractedImages] = useState<string[]>([]);

  // Form
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const patchForm = (p: Partial<FormState>) => setForm(f => ({ ...f, ...p }));

  // Contact
  const [contactMode, setContactMode] = useState<'profile' | 'custom'>('profile');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // ── AI analyze ──────────────────────────────────────────────────────────────

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
      // Pre-fill form with AI values
      setForm({
        type: result.type ?? SubletType.ENTIRE,
        title: result.extractedTitle
          ?? (result.location ? `${result.type ?? 'Place'} in ${result.location}` : ''),
        location: result.location ?? '',
        price: result.price ? String(result.price) : '',
        currency: result.currency ?? 'ILS',
        startDate: result.startDate ?? '',
        endDate: result.endDate ?? '',
        description: result.extractedDescription ?? '',
      });
    } catch {
      setAiError('Analysis failed. Please check the URL and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Publish ─────────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    const firebaseUser = auth?.currentUser;
    if (!user || !firebaseUser) {
      setPublishError('You must be signed in to publish a listing.');
      return;
    }

    if (!form.location.trim()) {
      setPublishError('Please enter a location.');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setPublishError('Please enter a valid price.');
      return;
    }

    setIsPublishing(true);
    setPublishError('');

    // Geocode location
    const coords = await geocodeAddress(form.location);
    if (!coords) {
      setPublishError("We couldn't find this location. Please be more specific.");
      setIsPublishing(false);
      return;
    }

    const listing: Sublet = {
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
      ai_summary: form.description || undefined,
      city: aiResult?.city || undefined,
      // ownership fields written to Firestore
      ...({ userId: firebaseUser.uid, userEmail: firebaseUser.email ?? '', userDisplayName: firebaseUser.displayName ?? '' } as any),
    } as Sublet;

    try {
      const saved = await persistenceService.saveListing(listing);
      setPublishedId(saved.id);
    } catch {
      setPublishError('Failed to save your listing. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────────

  if (publishedId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 bg-[#4A7CC7] rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Your listing is under review</h2>
            <p className="text-sm text-slate-500 mt-1">We'll notify you once it's live on the map.</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => { setPublishedId(null); setForm(BLANK_FORM); setPasteUrl(''); setAiResult(null); }}
              className="w-full py-2.5 rounded-lg border border-[#4A7CC7] text-[#4A7CC7] text-sm font-bold hover:bg-blue-50 transition-colors"
            >
              Post another listing
            </button>
            <Link
              href="/map"
              className="w-full py-2.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold text-center hover:bg-slate-200 transition-colors"
            >
              Back to map
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[660px] mx-auto px-4 py-10 space-y-5">

        <div>
          <h1 className="text-2xl font-black text-slate-900">Create a listing</h1>
          <p className="text-sm text-slate-500 mt-0.5">Renters across the city will find your place on the map.</p>
        </div>

        {/* ── Card 1: Post type ── */}
        <Card>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">I want to…</p>
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#4A7CC7] text-white text-sm font-bold">
              🏠 List my place
            </button>
            <button disabled className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-100 text-slate-400 text-sm font-medium cursor-not-allowed">
              🔍 Find a place
              <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">Soon</span>
            </button>
          </div>
        </Card>

        {/* ── Card 2: URL input ── */}
        <Card>
          <div className="space-y-2 mb-4">
            <Label>Listing or post URL</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔗</span>
              <Input
                value={pasteUrl}
                onChange={e => setPasteUrl(e.target.value)}
                placeholder="https://facebook.com/groups/... or https://www.yad2.co.il/..."
                className="pl-8"
              />
            </div>
            <p className="text-xs text-slate-400">Paste any public URL — Facebook, Airbnb, Yad2, Madlan, and more</p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !pasteUrl.trim()}
            className="px-5 py-2.5 bg-[#4A7CC7] text-white text-sm font-bold rounded-lg hover:bg-[#3b66a6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Fetching and analyzing...
              </>
            ) : 'Fetch & Analyze'}
          </button>

          {aiError && <p className="text-xs text-red-500 mt-2 font-medium">{aiError}</p>}

          {aiResult && (
            <AiExtractedFields result={aiResult} form={form} onFormChange={patchForm} images={extractedImages} />
          )}
        </Card>

        {/* ── Card 4: Contact ── */}
        <Card>
          <p className="text-sm font-bold text-slate-800 mb-3">Contact info</p>
          <div className="space-y-2">
            {([
              ['profile', `Use my profile (${user?.email ?? 'your account'})`],
              ['custom', 'Add different contact info'],
            ] as const).map(([mode, label]) => (
              <label key={mode} className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => setContactMode(mode)}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    contactMode === mode ? 'border-[#4A7CC7]' : 'border-slate-300'
                  }`}
                >
                  {contactMode === mode && <div className="w-2 h-2 rounded-full bg-[#4A7CC7]" />}
                </div>
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
          {contactMode === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <Label>Phone</Label>
                <Input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+972 50 000 0000" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>
          )}
        </Card>

        {/* ── Confirmation checkbox ── */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
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

        {/* ── Actions ── */}
        {publishError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-medium">
            {publishError}
          </div>
        )}

        <div className="flex gap-3 pb-10">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-lg border border-[#4A7CC7] text-[#4A7CC7] text-sm font-bold hover:bg-blue-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing || !confirmed}
            className="flex-1 py-3 rounded-lg bg-[#4A7CC7] text-white text-sm font-bold hover:bg-[#3b66a6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isPublishing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing...
              </>
            ) : 'Publish listing'}
          </button>
        </div>
      </div>
    </div>
  );
}
