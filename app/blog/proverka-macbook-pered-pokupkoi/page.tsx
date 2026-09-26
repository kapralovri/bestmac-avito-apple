import type { Metadata } from 'next';
import ProverkaMacbookPeredPokupkoi from '@/views/blog/ProverkaMacbookPeredPokupkoi';

export const metadata: Metadata = {
  title: 'Как проверить макбук при покупке — чек-лист для б/у и нового MacBook',
  description: 'Как проверить макбук при покупке с рук и в магазине: серийный номер и оригинальность, корпус и экран, аккумулятор, iCloud и MDM, проверка нового MacBook и на пункте выдачи.',
  alternates: { canonical: '/blog/proverka-macbook-pered-pokupkoi' },
};

export default function ProverkaMacbookPeredPokupkoiPage() {
  return <ProverkaMacbookPeredPokupkoi />;
}
