export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const config = process.env.ADMIN_SDK_CONFIG;

  // Try to parse and report structure without exposing private key
  let parseResult = 'not attempted';
  let hasClientEmail = false;
  let hasPrivateKey = false;
  let parseError = '';
  if (config) {
    try {
      const parsed = JSON.parse(config) as Record<string, unknown>;
      parseResult = 'valid JSON';
      hasClientEmail = 'client_email' in parsed;
      hasPrivateKey = 'private_key' in parsed;
    } catch (e) {
      parseResult = 'invalid JSON';
      parseError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    hasConfig: !!config,
    configLength: config?.length ?? 0,
    configPreview: config?.slice(0, 80) ?? 'MISSING',
    parseResult,
    hasClientEmail,
    hasPrivateKey,
    parseError,
    relevantEnvKeys: Object.keys(process.env).filter(k =>
      k.includes('ADMIN') || k.includes('FIREBASE') || k.includes('APIFY') || k.includes('GEMINI')
    ),
  });
}
