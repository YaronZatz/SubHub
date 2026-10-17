import React from 'react';

/** Small deterministic hash so each area gets its own (stable) street pattern. */
function seed(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Neutral map-style placeholder for area cards without a photo.
 * Same visual language as the home hero map card, using only brand tint tokens.
 */
export default function AreaPlaceholder({ slug }: { slug: string }) {
  const h = seed(slug);
  const tilt = (h % 24) - 12;               // street grid angle
  const parkX = 40 + (h % 160);
  const parkY = 30 + ((h >> 5) % 90);
  const sea = h % 3 === 0;                  // some areas get a coastline
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full bg-brand-50" aria-hidden="true">
      {sea && <path d="M0 0 L70 0 L52 200 L0 200 Z" className="fill-brand-200" />}
      <rect x={parkX} y={parkY} width="70" height="46" rx="8" className="fill-brand-100" />
      <g transform={`rotate(${tilt} 160 100)`} className="stroke-white" fill="none" strokeLinecap="round">
        {[-40, 30, 100, 170, 240, 310].map(x => <path key={`v${x}`} d={`M${x} -60 L${x + 20} 260`} strokeWidth={x % 140 === 30 ? 9 : 5} />)}
        {[-10, 50, 110, 170, 230].map(y => <path key={`h${y}`} d={`M-60 ${y} L380 ${y + 8}`} strokeWidth={y === 110 ? 9 : 5} />)}
      </g>
    </svg>
  );
}
