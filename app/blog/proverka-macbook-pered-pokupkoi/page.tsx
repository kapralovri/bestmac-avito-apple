import type { Metadata } from 'next';
import ProverkaMacbookPeredPokupkoi from '@/views/blog/ProverkaMacbookPeredPokupkoi';

export const metadata: Metadata = {
  title: 'Проверка MacBook перед покупкой — чек-лист',
  description: 'Как проверить MacBook б/у перед покупкой. Полный чек-лист проверки.',
  alternates: { canonical: '/blog/proverka-macbook-pered-pokupkoi' },
};

export default function ProverkaMacbookPeredPokupkoiPage() {
  return <ProverkaMacbookPeredPokupkoi />;
}
