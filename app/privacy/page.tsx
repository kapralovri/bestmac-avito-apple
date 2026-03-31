import type { Metadata } from 'next';
import Privacy from '@/views/Privacy';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — BestMac',
  description: 'Политика конфиденциальности сервиса BestMac.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return <Privacy />;
}
