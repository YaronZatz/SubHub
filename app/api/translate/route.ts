export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { adminDb } from '@/lib/firebase-admin';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  he: 'Hebrew', es: 'Spanish', fr: 'French', it: 'Italian',
  ru: 'Russian', uk: 'Ukrainian', pt: 'Portuguese', de: 'German', zh: 'Chinese',
};

export async function POST(req: NextRequest) {
  const { text, targetLanguage, listingId } = await req.json();

  if (!text || !targetLanguage || !LANGUAGE_NAMES[targetLanguage]) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Check Firestore cache first (only when a listingId is provided)
  if (listingId) {
    try {
      const docRef = adminDb.collection('listings').doc(listingId);
      const snap = await docRef.get();
      const cached = snap.exists ? snap.data()?.summaryTranslations?.[targetLanguage] : null;
      if (cached) {
        return NextResponse.json({ translation: cached });
      }
    } catch (err) {
      console.warn('[/api/translate] Firestore read failed, proceeding to translate:', err);
    }
  }

  const langName = LANGUAGE_NAMES[targetLanguage];
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate the following text to ${langName}. Return ONLY the translated text, nothing else. If the text is already in ${langName}, return it unchanged.\n\n${text}`,
    });
    const translation = response.text?.trim() ?? null;

    // Cache the translation in Firestore for future requests
    if (translation && listingId) {
      adminDb.collection('listings').doc(listingId).update({
        [`summaryTranslations.${targetLanguage}`]: translation,
      }).catch(err => console.warn('[/api/translate] Firestore cache write failed:', err));
    }

    return NextResponse.json({ translation });
  } catch (err) {
    console.error('[/api/translate] Gemini error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
