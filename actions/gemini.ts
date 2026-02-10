'use server';

import { parsePostWithGemini, parseImageListingWithGemini } from '../services/geminiService';

/**
 * Server Action: Parse Facebook link or post text with Gemini.
 * Runs on the server so API key is never exposed to the client.
 */
export async function extractListingFromText(input: string) {
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
export async function extractListingFromImage(base64Image: string, mimeType: string) {
  try {
    return await parseImageListingWithGemini(base64Image, mimeType);
  } catch (error) {
    console.error('Gemini image extraction error:', error);
    throw error;
  }
}
