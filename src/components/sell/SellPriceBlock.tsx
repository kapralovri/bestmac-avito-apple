import Link from 'next/link';
import { configLabel, formatRub, type SellModelPrices } from '@/lib/sell-prices';

const TELEGRAM_URL = 'https://t.me/romanmanro';

interface Props {
  shortName: string;
  prices: SellModelPrices;
  updatedLabel: string;
  cenyHref: string;
}

/**
 * GST-78: цены модели в серверном HTML. Калькулятор выше — клиентский, и
 * поисковик раньше видел страницу выкупа без единой цифры.
 */
export default function SellPriceBlock({ shortName, prices, updatedLabel, cenyHref }: Props) {
  const has = prices.reliable.length > 0;
  return (
    <section className="container mx-auto px-4 pb-12" id="ceny-vykupa">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
          Цены выкупа {shortName}{has ? ` — до ${formatRub(prices.maxBuyout)}` : ''}
        </h2>
        {has ? (
          <>
            <p className="text-center text-muted-foreground mb-6">
              По {prices.reliableSamples} объявлениям на Авито за последние 30 дней
              {updatedLabel ? `, обновлено ${updatedLabel}` : ''}
            </p>
            <table className="w-full border border-border/60 rounded-xl overflow-hidden">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold">Конфигурация</th>
                  <th className="text-right p-3 font-semibold">Выкуп</th>
                </tr>
              </thead>
              <tbody>
                {prices.reliable.map((c) => (
                  <tr key={`${c.ram}/${c.ssd}`} className="border-t border-border/60">
                    <td className="p-3">{configLabel(c)}</td>
                    <td className="p-3 text-right font-medium">до {formatRub(c.buyoutPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-center text-muted-foreground mb-4">
            Свежих данных по этой модели мало — назовём цену по фото за 15 минут.
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm">
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Отправить фото в Telegram
          </a>
          <Link href={cenyHref} className="text-primary underline">
            Рыночные цены на Авито
          </Link>
        </div>
      </div>
    </section>
  );
}
