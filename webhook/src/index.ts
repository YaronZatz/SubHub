/**
 * SubHub Cloud Functions — 8-stage ingestion pipeline
 *
 * Stage flow (each stage is a Firestore-triggered Cloud Function):
 *
 *   [1] Ingest  — Next.js webhook writes raw_posts (pipeline_stage: 'ingested')
 *   [2] Filter  — cheap rejections before LLM cost
 *   [3] Dedupe  — deduplication before extraction
 *   [4] Extract — Gemini location + metadata extraction
 *   [5] Geocode — Google Maps lat/lng + location_type
 *   [6] Score   — decision table → pin_status
 *   [7] Title   — Gemini Airbnb-style title in multiple languages
 *   [8] Publish — finalize listing, upload images to Storage
 *
 * See each stage file under src/stages/ for detailed documentation.
 */

import { initializeApp } from 'firebase-admin/app';
initializeApp();

// Re-export all stage Cloud Functions so firebase deploy picks them up
export { apifyWebhook } from './stages/ingest.js';
export { filterStage } from './stages/filter.js';
export { dedupeStage } from './stages/dedupe.js';
export { extractStage } from './stages/extract.js';
export { geocodeStage } from './stages/geocode.js';
export { scoreStage } from './stages/score.js';
export { titleStage } from './stages/title.js';
export { publishStage } from './stages/publish.js';
