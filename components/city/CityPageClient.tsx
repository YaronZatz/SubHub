'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import SiteFooter from '@/components/shared/SiteFooter';
import AuthModal from '@/components/shared/AuthModal';
import CityCarousel from '@/components/shared/CityCarousel';
import HomeListingCard from '@/components/web/HomeListingCard';
import PopularAreas from '@/components/city/PopularAreas';
import PropertyTypeRow from '@/components/city/PropertyTypeRow';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useSaved } from '@/contexts/SavedContext';
import { usePlatform } from '@/hooks/usePlatform';
import { persistenceService } from '@/services/persistenceService';
import { getCity } from '@/lib/areas/cities';
import { homeCopy } from '@/lib/homeCopy';
import type { CityBrowseResponse } from '@/lib/areas/browse';
import type { Sublet } from '@/types';

function SectionSkeleton({ featured }: { featured?: boolean }) {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-hidden="true">
      <div className="h-7 w-48 rounded bg-brand-50" />
      <div className="h-4 w-72 max-w-full rounded bg-brand-50" />
      {featured ? (
        <div className="grid grid-cols-2 gap-3 md:gap-5">
          <div className="col-span-2 aspect-[16/9] rounded-2xl bg-brand-50 md:aspect-[3/1]" />
          <div className="aspect-[4/3] rounded-2xl bg-brand-50 md:aspect-[2/1]" />
          <div className="aspect-[4/3] rounded-2xl bg-brand-50 md:aspect-[2/1]" />
        </div>
      ) : (
        <div className="flex gap-3">
          {[0, 1, 2].map(i => <div key={i} className="h-[120px] w-[156px] shrink-0 rounded-2xl bg-brand-50" />)}
        </div>
      )}
    </div>
  );
}

export default function CityPageClient({ slug }: { slug: string }) {
  const city = getCity(slug)!;
  const { language } = useLanguage();
  const { currency } = useCurrency();
  const { savedIds, toggle, showSignInModal, closeSignInModal } = useSaved();
  const { isMobile } = usePlatform();
  const copy = homeCopy(language);
  const size = isMobile ? 'md' : 'lg';

  const [browse, setBrowse] = useState<CityBrowseResponse | null>(null);
  const [browseError, setBrowseError] = useState(false);
  const [fresh, setFresh] = useState<Sublet[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cities/${slug}/browse`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: CityBrowseResponse) => { if (!cancelled) setBrowse(d); })
      .catch(() => { if (!cancelled) setBrowseError(true); });
    persistenceService.fetchListingsByCity(city.firestoreCity, 20)
      .then(l => { if (!cancelled) setFresh(l); })
      .catch(() => { if (!cancelled) setFresh([]); });
    return () => { cancelled = true; };
  }, [slug, city.firestoreCity]);

  const cityName = language === 'he' ? city.he : city.en;

  return (
    <div className="min-h-screen bg-white font-sans text-ink">
      <WebNavbar />

      {/* City heading — same tinted band as the home hero, compact */}
      <section className="bg-brand-50">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-4 px-4 py-7 md:px-6 md:py-10">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] md:text-[52px]">{cityName}</h1>
            <p className="text-[15px] text-muted md:text-[17px]">
              {browse ? copy.cityAvailableNow(browse.total) : <span className="inline-block h-4 w-44 animate-pulse rounded bg-brand-100 align-middle" />}
            </p>
          </div>
          <Link
            href={`/map?city=${slug}`}
            className="flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {copy.cityShowOnMap}
          </Link>
        </div>
      </section>

      {/* pb-28 on mobile keeps the last cards clear of the fixed bottom tab bar */}
      <main className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 pb-28 pt-7 md:gap-12 md:px-6 md:pb-16 md:pt-10">
        {browse ? (
          <>
            <PopularAreas citySlug={slug} areas={browse.areas} language={language} size={size} />
            <PropertyTypeRow citySlug={slug} types={browse.types} language={language} size={size} />
          </>
        ) : browseError ? (
          <p className="rounded-2xl border border-line bg-brand-50 p-4 text-sm text-muted">{copy.cityLoadError}</p>
        ) : (
          <>
            <SectionSkeleton featured />
            <SectionSkeleton />
          </>
        )}

        {fresh && fresh.length > 0 && (
          <CityCarousel
            title={copy.justAddedTitle}
            seeAllLabel={copy.seeAllOnMap}
            onSeeAll={() => { window.location.href = `/map?city=${slug}`; }}
            prevLabel={copy.previous}
            nextLabel={copy.next}
            showArrows={!isMobile}
            size={size}
          >
            {fresh.map(s => (
              <HomeListingCard
                key={s.id}
                sublet={s}
                size={size}
                isSaved={savedIds.has(s.id)}
                onToggleSave={e => { e.stopPropagation(); toggle(s.id); }}
                currency={currency}
                language={language}
              />
            ))}
          </CityCarousel>
        )}
      </main>

      <div className="hidden md:block">
        <SiteFooter />
      </div>

      {showSignInModal && (
        <AuthModal reason="save" initialMode="signup" onSuccess={closeSignInModal} onClose={closeSignInModal} />
      )}
    </div>
  );
}
