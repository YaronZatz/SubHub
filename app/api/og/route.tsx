import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logoBuffer = readFileSync(join(process.cwd(), 'public', 'logo.png'));
  const logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Top gradient bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 10,
            background: '#3382C9',
            display: 'flex',
          }}
        />

        {/* Logo */}
        <img
          src={logoSrc}
          style={{ width: 300, height: 300, objectFit: 'contain' }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 38,
            color: '#334155',
            marginTop: 12,
            fontWeight: 600,
            letterSpacing: '1px',
            display: 'flex',
          }}
        >
          One Map · Zero Noise
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: 22,
            color: '#94a3b8',
            marginTop: 10,
            fontWeight: 400,
            display: 'flex',
          }}
        >
          AI-powered sublet aggregator
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 10,
            background: '#F5821F',
            display: 'flex',
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
