export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const LANGUAGE_NAMES: Record<string, string> = {
  he: 'Hebrew', es: 'Spanish', fr: 'French', it: 'Italian',
  ru: 'Russian', uk: 'Ukrainian', pt: 'Portuguese', de: 'German', zh: 'Chinese',
};

export async function POST(req: NextRequest) {
  const { text, targetLanguage } = await req.json();

  if (!text || !targetLanguage || !LANGUAGE_NAMES[targetLanguage]) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const langName = LANGUAGE_NAMES[targetLanguage];
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Translate the following text to ${langName}. Return ONLY the translated text, nothing else. If the text is already in ${langName}, return it unchanged.\n\n${text}`,
    });
    const translation = response.text?.trim() ?? null;
    return NextResponse.json({ translation });
  } catch {
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
