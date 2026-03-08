import { ImageResponse } from 'next/og';

export const alt = 'SubHub — One Map | Zero Noise';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: '#3382C9',
            display: 'flex',
          }}
        />

        {/* Logo */}
        <div
          style={{
            fontSize: 100,
            fontWeight: 900,
            color: '#3382C9',
            letterSpacing: '-4px',
            lineHeight: 1,
            display: 'flex',
          }}
        >
          SubHub
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 40,
            color: '#94a3b8',
            marginTop: 28,
            fontWeight: 500,
            letterSpacing: '2px',
            display: 'flex',
          }}
        >
          One Map · Zero Noise
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: 24,
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
