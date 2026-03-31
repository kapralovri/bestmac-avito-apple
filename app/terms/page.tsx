import type { Metadata } from 'next';
import Terms from '@/views/Terms';

export const metadata: Metadata = {
  title: 'Условия использования — BestMac',
  description: 'Условия использования сервиса BestMac.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <Terms />;
}
