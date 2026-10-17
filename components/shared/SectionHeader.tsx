import React from 'react';
import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  /** Makes the title a link (e.g. city name → city page). */
  titleHref?: string;
  subtitle?: string;
  /** Small muted label next to the title (e.g. "19 listings"). */
  countLabel?: string;
  /** Right-hand (end-side) controls: "see all" link, arrows… */
  actions?: React.ReactNode;
  size?: 'md' | 'lg';
}

/** Heading row shared by the home carousels and the city page sections. */
export default function SectionHeader({ title, titleHref, subtitle, countLabel, actions, size = 'lg' }: SectionHeaderProps) {
  const lg = size === 'lg';
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2 className={`font-display font-extrabold tracking-tight text-ink ${lg ? 'text-[32px]' : 'text-[22px]'}`}>
            {titleHref ? <Link href={titleHref} className="hover:text-brand-700">{title}</Link> : title}
          </h2>
          {countLabel && <span className={`text-muted ${lg ? 'text-sm' : 'text-[13px]'}`}>{countLabel}</span>}
        </div>
        {subtitle && <p className={`text-muted ${lg ? 'text-base' : 'text-sm'}`}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
