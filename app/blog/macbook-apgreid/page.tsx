import type { Metadata } from 'next';
import MacbookApgreid from '@/views/blog/MacbookApgreid';

export const metadata: Metadata = {
  title: 'Апгрейд MacBook — что можно улучшить | BestMac',
  description: 'Возможности апгрейда MacBook. Замена SSD, оперативной памяти.',
  alternates: { canonical: '/blog/macbook-apgreid' },
};

export default function MacbookApgreidPage() {
  return <MacbookApgreid />;
}
