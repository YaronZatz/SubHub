/**
 * Stage 7 — Title (Gemini call #2)
 *
 * Generates an Airbnb-style title for the listing in all supported languages.
 * Skipped for listings with pin_status == 'rejected'.
 *
 * Pre-generates for: en, he, es, de
 * Stores in listings.titles_by_lang (map field).
 * Logs to gemini_calls.
 *
 * Triggered when listings.pipeline_stage == 'scored' AND pin_status != 'rejected'.
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import type { GeminiCallLog } from '../types.js';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const TITLE_PROMPT_VERSION = 'v1.0';
const TITLE_MODEL = 'gemini-2.5-flash';

/** Languages to pre-generate at publish time */
const SUPPORTED_LANGUAGES = ['en', 'he', 'es', 'de'] as const;

const db = getFirestore();

export const titleStage = onDocumentWritten(
  {
    document: 'listings/{listingId}',
    region: 'us-central1',
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (event) => {
    const after = event.data?.after.data();
    if (!after || after['pipeline_stage'] !== 'scored') return;
    if (after['pin_status'] === 'rejected') {
      // Rejected listings don't need titles — advance to publish stage so Stage 8 can handle
      // Actually rejected listings should stop here. Skip entirely.
      return;
    }

    const listingRef = event.data!.after.ref;
    const listingId = event.params['listingId'];

    const city: string = typeof after['city'] === 'string' ? after['city'] : '';
    const neighborhood: string = typeof after['neighborhood'] === 'string' ? after['neighborhood'] : '';
    const street: string = typeof after['street'] === 'string' ? after['street'] : '';
    const pinStatus: string = typeof after['pin_status'] === 'string' ? after['pin_status'] : '';
    const originalText: string = typeof after['original_text'] === 'string' ? after['original_text'] : '';

    const locationSummary = [street, neighborhood, city].filter(Boolean).join(', ');

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    const prompt = buildTitlePrompt(locationSummary, pinStatus, originalText);

    const startMs = Date.now();
    let rawOutput = '';
    let titlesByLang: Record<string, string> = {};

    try {
      const response = await ai.models.generateContent({
        model: TITLE_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
          responseSchema: buildTitleSchema(),
        },
      });

      const parts: Array<{ text?: string; thought?: boolean }> =
        (response.candidates?.[0]?.content?.parts as Array<{ text?: string; thought?: boolean }>) ?? [];
      rawOutput = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join('') ||
        response.text || '{}';

      const parsed = JSON.parse(rawOutput) as Record<string, string>;
      titlesByLang = sanitizeTitles(parsed);
    } catch (err) {
      console.error(`[Title] listing ${listingId}: Gemini call failed`, err);
      // Generate a simple fallback title rather than failing the pipeline
      titlesByLang = { en: locationSummary || 'Sublet Available' };
    }

    const latencyMs = Date.now() - startMs;

    const callLog: GeminiCallLog = {
      listing_id: listingId,
      call_type: 'title',
      prompt_version: TITLE_PROMPT_VERSION,
      model_version: TITLE_MODEL,
      input: prompt,
      output: rawOutput,
      latency_ms: latencyMs,
      created_at: Date.now(),
    };
    await db.collection('gemini_calls').add(callLog);

    await listingRef.update({
      pipeline_stage: 'titled',
      titles_by_lang: titlesByLang,
    });

    console.log(`[Title] listing ${listingId}: generated titles for ${Object.keys(titlesByLang).join(', ')}`);
  }
);

// ── Prompt ─────────────────────────────────────────────────────────────────────

function buildTitlePrompt(location: string, pinStatus: string, postText: string): string {
  const locationDesc = location || 'an unspecified location';
  const pinNote = pinStatus === 'approximate'
    ? 'The location is approximate — focus on the neighborhood or area, not a specific address.'
    : '';

  // Truncate post text to avoid token overflow
  const truncated = postText.length > 800 ? postText.slice(0, 800) + '…' : postText;

  return `Generate an Airbnb-style listing title for this sublet at ${locationDesc}. ${pinNote}

Rules:
- 6–10 words per title
- Evocative, positive, factual — highlight what makes this place appealing
- Do NOT mention price or dates
- Do NOT make up amenities not mentioned in the post
- Each title must be in the target language

POST TEXT (for context):
"${truncated}"

Return a JSON object with titles for these languages:
${SUPPORTED_LANGUAGES.map((l) => `"${l}": [title in ${langName(l)}]`).join('\n')}`;
}

function buildTitleSchema(): object {
  const props: Record<string, object> = {};
  for (const lang of SUPPORTED_LANGUAGES) {
    props[lang] = { type: Type.STRING };
  }
  return {
    type: Type.OBJECT,
    properties: props,
    required: [...SUPPORTED_LANGUAGES],
  };
}

function sanitizeTitles(raw: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const lang of SUPPORTED_LANGUAGES) {
    const v = raw[lang];
    if (typeof v === 'string' && v.trim().length > 0 && v.length < 200) {
      result[lang] = v.trim();
    }
  }
  return result;
}

function langName(code: string): string {
  const names: Record<string, string> = { en: 'English', he: 'Hebrew', es: 'Spanish', de: 'German' };
  return names[code] ?? code;
}
