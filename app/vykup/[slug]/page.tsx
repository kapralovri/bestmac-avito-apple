import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VYKUP_LANDINGS, getLanding } from '@/data/vykup-landings';
import VykupLanding from '@/views/VykupLanding';

export function generateStaticParams() {
  return VYKUP_LANDINGS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const landing = getLanding(slug);
  if (!landing) return {};
  return {
    title: landing.title,
    description: landing.description,
    alternates: { canonical: `/vykup/${slug}` },
  };
}

export default async function VykupSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const landing = getLanding(slug);
  if (!landing) notFound();
  return <VykupLanding landing={landing} />;
}
