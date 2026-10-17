import React, { useId } from 'react';

/*
 * Spot illustrations in SubHub's map language (street grid + pins, same as the
 * hero map card). Only brand/accent token classes and white — no new colors —
 * and no text, so they work in every language. Mirrored in RTL so the "flow"
 * reads in the page's direction.
 */

/** Teardrop map pin whose tip sits at (x, y). */
function Pin({ x, y, size = 1, className }: { x: number; y: number; size?: number; className: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <ellipse cx="0" cy="2" rx="11" ry="3.5" className="fill-brand-900/15" />
      <path d="M0 0 C-5 -9 -17 -19 -17 -31 A17 17 0 1 1 17 -31 C17 -19 5 -9 0 0 Z" className={className} />
      <circle cx="0" cy="-31" r="6.5" className="fill-white" />
    </g>
  );
}

/** Small price-pin pill without a number (abstract, language-neutral). */
function PricePill({ x, y, active = false }: { x: number; y: number; active?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-22" y="-11" width="44" height="22" rx="11" className={active ? 'fill-accent-500' : 'fill-white'} />
      <rect x="-12" y="-2.5" width="24" height="5" rx="2.5" className={active ? 'fill-accent-ink/40' : 'fill-brand-200'} />
    </g>
  );
}

/** A post card turning into a pin on the map — for "Posting a sublet". */
export function PostToPinSpot({ className = '' }: { className?: string }) {
  const clip = useId();
  return (
    <svg viewBox="0 0 360 220" className={`rtl:-scale-x-100 ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}><rect x="150" y="16" width="196" height="188" rx="20" /></clipPath>
      </defs>

      {/* map tile */}
      <rect x="150" y="16" width="196" height="188" rx="20" className="fill-brand-100" />
      <g clipPath={`url(#${clip})`}>
        <rect x="292" y="30" width="40" height="44" rx="8" className="fill-brand-200" />
        <g className="stroke-white" strokeWidth="9" fill="none" strokeLinecap="round">
          <path d="M214 10 L204 214" /><path d="M286 10 L296 214" />
          <path d="M140 92 L356 84" /><path d="M140 160 L356 166" />
        </g>
        <g className="stroke-white" strokeWidth="4" fill="none">
          <path d="M250 10 L250 214" /><path d="M140 126 L356 124" />
        </g>
      </g>
      <PricePill x={318} y={110} />
      <PricePill x={226} y={180} />
      <Pin x={250} y={124} size={1.05} className="fill-accent-500" />

      {/* post card */}
      <g transform="rotate(-6 92 110)">
        <rect x="18" y="46" width="150" height="132" rx="16" className="fill-brand-200/60" transform="translate(4 6)" />
        <rect x="18" y="46" width="150" height="132" rx="16" className="fill-white" />
        <circle cx="42" cy="72" r="11" className="fill-brand-200" />
        <rect x="60" y="64" width="64" height="7" rx="3.5" className="fill-brand-200" />
        <rect x="60" y="76" width="40" height="5" rx="2.5" className="fill-brand-100" />
        <rect x="32" y="98" width="120" height="6" rx="3" className="fill-brand-100" />
        <rect x="32" y="112" width="104" height="6" rx="3" className="fill-brand-100" />
        <rect x="32" y="126" width="116" height="6" rx="3" className="fill-brand-100" />
        <rect x="32" y="140" width="72" height="6" rx="3" className="fill-brand-100" />
        <rect x="32" y="156" width="34" height="10" rx="5" className="fill-accent-100" />
      </g>

      {/* the hop from post to pin */}
      <path d="M160 70 C 190 40 215 44 236 70" className="stroke-accent-500" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" fill="none" />
      <path d="M196 30 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" className="fill-accent-500" />
    </svg>
  );
}

/** Map with a home pin and a few listings around it — for the closing call to action. */
export function HomePinSpot({ className = '' }: { className?: string }) {
  const clip = useId();
  return (
    <svg viewBox="0 0 360 200" className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}><rect x="0" y="0" width="360" height="200" rx="24" /></clipPath>
      </defs>
      <rect x="0" y="0" width="360" height="200" rx="24" className="fill-brand-100" />
      <g clipPath={`url(#${clip})`}>
        <path d="M0 0 L58 0 L44 80 L30 200 L0 200 Z" className="fill-brand-200" />
        <rect x="236" y="22" width="64" height="42" rx="8" className="fill-brand-200" />
        <g className="stroke-white" strokeWidth="9" fill="none" strokeLinecap="round">
          <path d="M104 -10 L92 210" /><path d="M200 -10 L196 210" /><path d="M312 -10 L326 210" />
          <path d="M40 76 L370 66" /><path d="M30 146 L370 152" />
        </g>
        <g className="stroke-white" strokeWidth="4" fill="none">
          <path d="M150 -10 L144 210" /><path d="M256 -10 L262 210" /><path d="M36 112 L370 110" />
        </g>
      </g>

      <PricePill x={92} y={44} />
      <PricePill x={288} y={96} />
      <PricePill x={112} y={170} />
      <PricePill x={290} y={170} active />

      {/* home pin */}
      <g transform="translate(198 132)">
        <ellipse cx="0" cy="3" rx="26" ry="7" className="fill-none stroke-accent-500" strokeWidth="2.5" />
        <ellipse cx="0" cy="3" rx="12" ry="3.5" className="fill-brand-900/20" />
        <path d="M0 0 C-8 -14 -28 -30 -28 -50 A28 28 0 1 1 28 -50 C28 -30 8 -14 0 0 Z" className="fill-brand-600" />
        <path d="M-11 -46 L0 -57 L11 -46 L11 -36 L-11 -36 Z" className="fill-white" />
        <rect x="-3.5" y="-44" width="7" height="8" rx="1" className="fill-brand-600" />
      </g>
    </svg>
  );
}
