#!/usr/bin/env node
/**
 * Extraction eval harness
 *
 * Runs the Stage 4 extractor against the eval set and reports:
 *   - Per-field accuracy (city, neighborhood, street, street_number)
 *   - extraction_confidence confusion matrix
 *   - Latency and cost estimates
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node eval/run-extract-eval.js
 *   GEMINI_API_KEY=xxx node eval/run-extract-eval.js --filter=he
 *   GEMINI_API_KEY=xxx node eval/run-extract-eval.js --case=he-exact-1
 *
 * Run this before shipping any prompt change.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const PROMPT_VERSION = 'v1.0';

// ─── Load eval set ─────────────────────────────────────────────────────────────

const evalSetPath = join(__dirname, 'extract-eval-set.json');
let evalSet = JSON.parse(readFileSync(evalSetPath, 'utf-8'));

// CLI filters
const args = process.argv.slice(2);
const filterLang = args.find(a => a.startsWith('--filter='))?.split('=')[1];
const filterCase = args.find(a => a.startsWith('--case='))?.split('=')[1];

if (filterCase) evalSet = evalSet.filter(c => c.id === filterCase);
else if (filterLang) evalSet = evalSet.filter(c => c.language === filterLang);

console.log(`\nRunning extraction eval: ${evalSet.length} cases (model=${GEMINI_MODEL}, prompt=${PROMPT_VERSION})\n`);

// ─── Run eval ─────────────────────────────────────────────────────────────────

const results = [];

for (const testCase of evalSet) {
  process.stdout.write(`  ${testCase.id.padEnd(25)} `);

  const start = Date.now();
  let actual;
  let error = null;

  try {
    actual = await callExtractor(testCase.post_text, GEMINI_API_KEY);
  } catch (err) {
    error = err.message;
    process.stdout.write(`ERROR: ${error}\n`);
    results.push({ ...testCase, actual: null, error, latencyMs: Date.now() - start });
    await sleep(2000);
    continue;
  }

  const latencyMs = Date.now() - start;

  const confidenceMatch = actual.extraction_confidence === testCase.expected.extraction_confidence;
  const cityMatch = normField(actual.city) === normField(testCase.expected.city);
  const neighborhoodMatch = normField(actual.neighborhood) === normField(testCase.expected.neighborhood);
  const streetMatch = normField(actual.street) === normField(testCase.expected.street);
  const streetNumMatch = normField(actual.street_number) === normField(testCase.expected.street_number);

  const allMatch = confidenceMatch && cityMatch && neighborhoodMatch && streetMatch && streetNumMatch;
  process.stdout.write(`${allMatch ? '✓' : '✗'}  conf=${actual.extraction_confidence}(${confidenceMatch ? 'ok' : `exp:${testCase.expected.extraction_confidence}`})  ${latencyMs}ms\n`);

  if (!allMatch) {
    if (!cityMatch) console.log(`    city:         got="${actual.city}" exp="${testCase.expected.city}"`);
    if (!neighborhoodMatch) console.log(`    neighborhood: got="${actual.neighborhood}" exp="${testCase.expected.neighborhood}"`);
    if (!streetMatch) console.log(`    street:       got="${actual.street}" exp="${testCase.expected.street}"`);
    if (!streetNumMatch) console.log(`    street_num:   got="${actual.street_number}" exp="${testCase.expected.street_number}"`);
  }

  results.push({ ...testCase, actual, latencyMs });
  await sleep(1500); // rate limit
}

// ─── Report ───────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════');
console.log('EVAL RESULTS');
console.log('═══════════════════════════════════════════════\n');

const valid = results.filter(r => r.actual && !r.error);
const total = valid.length;

const fieldAccuracy = (field) => {
  const correct = valid.filter(r => normField(r.actual[field]) === normField(r.expected[field])).length;
  return `${correct}/${total} (${Math.round(correct / total * 100)}%)`;
};

console.log('Per-field accuracy:');
console.log(`  extraction_confidence : ${fieldAccuracy('extraction_confidence')}`);
console.log(`  city                  : ${fieldAccuracy('city')}`);
console.log(`  neighborhood          : ${fieldAccuracy('neighborhood')}`);
console.log(`  street                : ${fieldAccuracy('street')}`);
console.log(`  street_number         : ${fieldAccuracy('street_number')}`);

// Confusion matrix for extraction_confidence
const levels = ['exact', 'street', 'neighborhood', 'none'];
console.log('\nextraction_confidence confusion matrix (rows=expected, cols=actual):');
console.log('           ' + levels.map(l => l.padEnd(13)).join(''));
for (const exp of levels) {
  const row = levels.map(act => {
    const count = valid.filter(r => r.expected.extraction_confidence === exp && r.actual.extraction_confidence === act).length;
    return String(count).padEnd(13);
  }).join('');
  console.log(`  ${exp.padEnd(13)}${row}`);
}

const avgLatency = Math.round(valid.reduce((sum, r) => sum + r.latencyMs, 0) / total);
console.log(`\nAvg latency: ${avgLatency}ms`);
console.log(`Errors: ${results.filter(r => r.error).length}`);

const overallCorrect = valid.filter(r =>
  normField(r.actual.extraction_confidence) === normField(r.expected.extraction_confidence) &&
  normField(r.actual.city) === normField(r.expected.city) &&
  normField(r.actual.neighborhood) === normField(r.expected.neighborhood) &&
  normField(r.actual.street) === normField(r.expected.street) &&
  normField(r.actual.street_number) === normField(r.expected.street_number)
).length;

console.log(`\nOverall accuracy (all fields correct): ${overallCorrect}/${total} (${Math.round(overallCorrect / total * 100)}%)\n`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normField(v) {
  if (v == null || v === '' || v === 'null' || v === 'undefined') return null;
  return String(v).trim().toLowerCase();
}

async function callExtractor(postText, apiKey) {
  const prompt = buildExtractionPrompt(postText);
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter(p => !p.thought && p.text).map(p => p.text).join('') || '{}';
  return JSON.parse(text);
}

function buildExtractionPrompt(postText) {
  const today = new Date().toISOString().slice(0, 10);
  return `Extract structured data from this sublet/rental Facebook post. Handle any language.

TODAY'S DATE: ${today}

Return strict JSON with these fields:
- language_detected: ISO 639-1 language code
- country: country name in English, or null
- city: city name in English, or null
- neighborhood: neighborhood/district name, or null (ONLY if explicitly stated)
- street: street name, or null (ONLY if explicitly stated)
- street_number: building number, or null (ONLY if stated alongside street)
- extraction_confidence:
    "exact"        = street name + number both stated
    "street"       = street name stated but no number
    "neighborhood" = only neighborhood/area stated, no street
    "none"         = city only, vague area, or no location
- extraction_notes: one sentence explaining confidence

CRITICAL: If uncertain, return null. Do NOT invent locations.

POST TEXT:
"${postText}"`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
