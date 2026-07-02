import type { Metadata } from 'next';
import Link from 'next/link';
import SellMacStudioSeo from '@/components/seo/SellMacStudioSeo';
import { loadAvitoPricesServer } from '@/lib/server-prices';

export const metadata: Metadata = {
  title: 'Выкуп Mac Studio в Москве дорого — M1/M2/M4 Max и Ultra | BestMac',
  description: 'Выкуп Mac Studio (Max, Ultra) в Москве: безопасная сделка в офисе, проверка при вас, деньги сразу. Цены обновляются ежедневно по объявлениям Авито.',
  alternates: { canonical: '/sell/mac-studio' },
};

export default async function SellMacStudioPage() {
  const data = await loadAvitoPricesServer();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 pt-10">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Выкуп Mac Studio в Москве</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Дорогая профессиональная техника требует безопасной сделки: проверка при вас,
            договор, деньги сразу. Оцените свою конфигурацию в{' '}
            <Link href="/sell" className="text-primary hover:underline">онлайн-калькуляторе</Link>{' '}
            или по телефону.
          </p>
        </div>
      </div>
      {data && <SellMacStudioSeo data={data} />}
    </div>
  );
}
