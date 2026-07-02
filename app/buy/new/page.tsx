import type { Metadata } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';
import BuyNew from '@/views/BuyNew';
import BuyNewSeo, { type NewProductsSeoData } from '@/components/seo/BuyNewSeo';

export const metadata: Metadata = {
  title: 'Новая техника Apple в Москве — цены сегодня на MacBook и iPhone | BestMac',
  description: 'Купить новую технику Apple в Москве: MacBook Air/Pro, iPhone, iMac. Цены обновляются ежедневно, проверка при получении, гарантия. Дешевле сетевой розницы.',
  alternates: { canonical: '/buy/new' },
};

// Серверное чтение каталога новинок: контент попадает в SSR-HTML
// (страница была исключена Яндексом как «малоценная» из-за пустого HTML).
async function loadNewProducts(): Promise<NewProductsSeoData | null> {
  try {
    const filePath = path.join(process.cwd(), 'public/data/new-products.json');
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as NewProductsSeoData;
  } catch {
    return null;
  }
}

export default async function BuyNewPage() {
  const data = await loadNewProducts();
  return (
    <>
      <BuyNew />
      {data && <BuyNewSeo data={data} />}
    </>
  );
}
