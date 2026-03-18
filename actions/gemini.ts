'use server';

import { parsePostWithGemini, parseImageListingWithGemini, type GeminiResult } from '../services/geminiService';

/**
 * Server Action: Parse text or URL with Gemini.
 * Returns extracted listing fields with per-field confidence scores.
 */
export async function extractListingFromText(input: string): Promise<GeminiResult> {
  try {
    return await parsePostWithGemini(input);
  } catch (error) {
    console.error('Gemini extraction error:', error);
    throw error;
  }
}

/**
 * Server Action: Parse image (screenshot) with Gemini.
 */
export async function extractListingFromImage(base64Image: string, mimeType: string): Promise<GeminiResult> {
  try {
    return await parseImageListingWithGemini(base64Image, mimeType);
  } catch (error) {
    console.error('Gemini image extraction error:', error);
    throw error;
  }
}
