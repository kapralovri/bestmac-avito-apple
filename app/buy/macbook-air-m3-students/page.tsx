import type { Metadata } from 'next';
import MacbookAirM3Students from '@/views/longtail/MacbookAirM3Students';

export const metadata: Metadata = {
  title: 'MacBook Air M3 для студентов | BestMac',
  description: 'MacBook Air M3 — лучший ноутбук для учёбы. Покупайте с гарантией.',
  alternates: { canonical: '/buy/macbook-air-m3-students' },
};

export default function MacbookAirM3StudentsPage() {
  return <MacbookAirM3Students />;
}
