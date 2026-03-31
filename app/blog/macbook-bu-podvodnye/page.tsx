import type { Metadata } from 'next';
import MacbookBuPodvodnye from '@/views/blog/MacbookBuPodvodnye';

export const metadata: Metadata = {
  title: 'Подводные камни при покупке MacBook б/у',
  description: 'На что обратить внимание при покупке MacBook б/у. Скрытые дефекты и как их выявить.',
  alternates: { canonical: '/blog/macbook-bu-podvodnye' },
};

export default function MacbookBuPodvodnyePage() {
  return <MacbookBuPodvodnye />;
}
