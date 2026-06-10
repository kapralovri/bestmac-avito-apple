import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GEO_LANDINGS, getGeoLanding } from '@/data/geo-landings';
import GeoLanding from '@/views/geo/GeoLanding';

export function generateStaticParams() {
  return GEO_LANDINGS.map((g) => ({ district: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string }>;
}): Promise<Metadata> {
  const { district } = await params;
  const geo = getGeoLanding(district);
  if (!geo) return {};
  return {
    title: geo.metaTitle,
    description: geo.metaDescription,
    alternates: { canonical: `/moskva/${geo.slug}` },
  };
}

export default async function GeoDistrictPage({
  params,
}: {
  params: Promise<{ district: string }>;
}) {
  const { district } = await params;
  const geo = getGeoLanding(district);
  if (!geo) notFound();
  return (
    <GeoLanding
      district={geo.district}
      metroStation={geo.metroStation}
      slug={geo.slug}
      nearbyAreas={geo.nearbyAreas}
      landmarks={geo.landmarks}
      customDescription={geo.customDescription}
      heroTitle={geo.heroTitle}
      locative={geo.locative}
    />
  );
}
