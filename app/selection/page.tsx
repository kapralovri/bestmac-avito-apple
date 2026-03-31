import type { Metadata } from 'next';
import Selection from '@/views/Selection';

export const metadata: Metadata = {
  title: 'Подбор техники Apple под ваши задачи',
  description: 'Подбор идеальной техники Apple. Ответьте на несколько вопросов — мы подберём MacBook, iMac или iPhone под ваши задачи.',
  alternates: { canonical: '/selection' },
};

export default function SelectionPage() {
  return <Selection />;
}
