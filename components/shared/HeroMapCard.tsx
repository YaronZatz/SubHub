import React from 'react';
import Link from 'next/link';

/**
 * Decorative map card (street grid + price pins) that links to the real map. Size comes from `className`.
 * Prices are written in full (no "k") so the card reads the same in every language.
 */
export default function HeroMapCard({ label, className = '', showCluster = true }: {
  label: string;
  className?: string;
  /** The dark "12" cluster bubble; turn off where it would read as a random number. */
  showCluster?: boolean;
}) {
  const pin = 'absolute rounded-full bg-white px-2.5 py-1 text-[13px] font-bold tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.16)]';
  return (
    <Link
      href="/map"
      aria-label={label}
      className={`relative block min-w-0 overflow-hidden rounded-[20px] border border-brand-100 bg-[#F5F6F7] transition-shadow hover:shadow-[0_12px_32px_rgba(17,26,36,0.10)] ${className}`}
    >
      <svg viewBox="0 0 560 380" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M0 0 L120 0 L95 120 L70 240 L40 380 L0 380 Z" className="fill-brand-200" />
        <rect x="300" y="40" width="110" height="70" rx="10" className="fill-brand-100" />
        <rect x="420" y="250" width="90" height="80" rx="10" className="fill-brand-100" />
        <g stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round">
          <path d="M160 0 L130 380" /><path d="M250 0 L235 380" /><path d="M370 0 L380 380" /><path d="M480 0 L520 380" />
          <path d="M110 80 L560 60" /><path d="M100 170 L560 165" /><path d="M85 260 L560 275" />
        </g>
        <g stroke="#fff" strokeWidth="4" fill="none">
          <path d="M200 0 L185 380" /><path d="M310 0 L305 380" /><path d="M430 0 L450 380" />
          <path d="M120 125 L560 115" /><path d="M95 215 L560 222" /><path d="M70 320 L560 330" />
        </g>
      </svg>
      <span className={pin} style={{ left: '26%', top: '18%' }} dir="ltr">₪4,500</span>
      <span className={pin} style={{ left: '54%', top: '30%' }} dir="ltr">₪6,800</span>
      <span className="absolute rounded-full bg-accent-500 px-3.5 py-1.5 text-[15px] font-bold tabular-nums text-accent-ink shadow-[0_6px_16px_rgba(0,0,0,0.2)]" style={{ left: '36%', top: '50%' }} dir="ltr">₪3,200</span>
      <span className={pin} style={{ left: '70%', top: '62%' }} dir="ltr">₪9,000</span>
      {showCluster ? (
        <span className="absolute rounded-full bg-brand-900 px-2.5 py-1 text-[13px] font-bold text-white" style={{ left: '22%', top: '74%' }}>12</span>
      ) : (
        <span className={pin} style={{ left: '20%', top: '74%' }} dir="ltr">₪5,200</span>
      )}
    </Link>
  );
}
