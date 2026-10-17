import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CityPageClient from '@/components/city/CityPageClient';
import { getCity } from '@/lib/areas/cities';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = getCity(slug);
  return { title: city ? `Sublets in ${city.en} — SubHub` : 'SubHub' };
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getCity(slug)) notFound();
  return <CityPageClient slug={slug} />;
}
