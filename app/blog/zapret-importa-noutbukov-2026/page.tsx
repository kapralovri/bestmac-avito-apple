import type { Metadata } from 'next';
import ZapretImportaNoutbukov2026 from '@/views/blog/ZapretImportaNoutbukov2026';

export const metadata: Metadata = {
  title: 'Запрет импорта ноутбуков 2026 — почему выгоднее MacBook',
  description: 'С 27 мая 2026 Минпромторг исключил из параллельного импорта ноутбуки Asus, HP, Acer, Intel, Samsung. Apple не затронут. Почему б/у MacBook — рациональный выбор в 2026.',
  alternates: { canonical: '/blog/zapret-importa-noutbukov-2026' },
};

export default function ZapretImportaNoutbukov2026Page() {
  return <ZapretImportaNoutbukov2026 />;
}
