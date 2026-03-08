import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SubHub — One Map | Zero Noise';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c2340 100%)',
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
        {/* Accent circle */}
        <div
          style={{
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(51,130,201,0.15) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
          }}
        />

        {/* Logo text */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: '#3382C9',
            letterSpacing: '-3px',
            lineHeight: 1,
            display: 'flex',
          }}
        >
          SubHub
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 38,
            color: '#94a3b8',
            marginTop: 24,
            fontWeight: 500,
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
            color: '#475569',
            marginTop: 20,
            fontWeight: 400,
            display: 'flex',
          }}
        >
          AI-powered sublet aggregator
        </div>
      </div>
    ),
    { ...size }
  );
}
