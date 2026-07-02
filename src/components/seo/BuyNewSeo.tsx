import Link from 'next/link';

/**
 * Server SEO block for /buy/new: renders real prices from
 * public/data/new-products.json into static HTML (the interactive catalog in
 * BuyNew.tsx fetches the same JSON client-side, so crawlers saw an empty
 * page — this component fixes the "low value page" exclusion). No "use client".
 */

export interface NewProductItem {
  name: string;
  price: number;
  source_price?: number;
  flags?: string[];
  is_activated?: boolean;
  category: string;
  category_display?: string;
  model?: string;
  storage?: string;
  storage_gb?: number;
  color?: string;
  chip?: string;
  ram?: string;
  ram_gb?: number;
  ssd?: string;
  ssd_gb?: number;
}

export interface NewProductsSeoData {
  updated_at: string | null;
  categories_found?: string[];
  items: NewProductItem[];
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

const fmtDate = (s?: string | null) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' :
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

function configLabel(p: NewProductItem): string {
  const parts: string[] = [];
  if (p.chip) parts.push(p.chip);
  if (p.ram && p.ssd) parts.push(`${p.ram} / ${p.ssd}`);
  else if (p.storage) parts.push(p.storage);
  if (p.color) parts.push(p.color);
  return parts.join(', ') || '—';
}

/** One row per unique position (name), lowest offer wins; up to `limit` rows. */
function topPositions(items: NewProductItem[], limit: number): NewProductItem[] {
  const best = new Map<string, NewProductItem>();
  for (const p of items) {
    if (!p.price || p.price <= 0) continue;
    const prev = best.get(p.name);
    if (!prev || p.price < prev.price) best.set(p.name, p);
  }
  return Array.from(best.values())
    .sort((a, b) =>
      (a.model || a.name).localeCompare(b.model || b.name, 'ru')
      || ((a.storage_gb ?? a.ssd_gb ?? 0) - (b.storage_gb ?? b.ssd_gb ?? 0))
      || (a.price - b.price))
    .slice(0, limit);
}

export default function BuyNewSeo({ data }: { data: NewProductsSeoData }) {
  const items = data.items || [];
  const rows = topPositions(items, 12);
  const updated = fmtDate(data.updated_at);
  const prices = items.map((p) => p.price).filter((n) => n > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const positionsCount = new Set(items.map((p) => p.name)).size;

  return (
    <section className="bg-background text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Сколько стоит новая техника Apple сегодня</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {updated && <>Прайс обновлён {updated}. </>}
            Цены привязаны к закупке и курсу валют, финальная стоимость фиксируется при подтверждении заказа.
          </p>

          {/* Answer-first: самодостаточный цитируемый абзац */}
          <p className="mb-8 leading-relaxed">
            Новая техника Apple в BestMac стоит ощутимо дешевле, чем в федеральных
            сетях, потому что мы привозим её напрямую небольшими партиями и не
            закладываем в цену аренду торговых залов и рекламу. Сейчас в
            каталоге {positionsCount > 0 ? fmt(positionsCount) : 'десятки'} позиций
            {minPrice > 0 && <> — от {fmt(minPrice)} ₽ за самую доступную конфигурацию</>};
            актуальные цены на топ-позиции собраны в таблице ниже, полный список с
            фильтрами по памяти и цвету — выше на этой странице. Все устройства
            новые и запечатанные; если конкретный экземпляр был активирован
            поставщиком, мы прямо помечаем это в карточке и снижаем цену. Прайс
            привязан к курсу валют и обновляется при каждой поставке, поэтому
            финальную стоимость мы подтверждаем перед оплатой — она не вырастет
            «на кассе». Забрать заказ можно в офисе у метро Киевская либо с
            доставкой по Москве: вы платите после того, как сами проверите
            серийный номер и комплект. Продавец — ИП Капралов Р.И.: мы восемь лет
            работаем с техникой Apple и отвечаем за каждое проданное устройство.
          </p>

          {rows.length > 0 && (
            <div className="mb-10">
              <h3 className="text-xl font-semibold mb-4">Топ-позиции в наличии — цены сегодня</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-4 py-3 font-medium">Модель</th>
                      <th className="px-4 py-3 font-medium">Конфигурация</th>
                      <th className="px-4 py-3 font-medium">Цена</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p, i) => (
                      <tr key={`${p.name}-${i}`} className="border-t border-border">
                        <td className="px-4 py-3">{p.model || p.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{configLabel(p)}</td>
                        <td className="px-4 py-3 font-semibold text-primary">{fmt(p.price)} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                В таблице — минимальная цена по каждой позиции. Наличие цветов и
                объёмов памяти меняется с поставками: точный остаток смотрите в
                каталоге выше или уточняйте в переписке.
              </p>
            </div>
          )}

          <h3 className="text-2xl font-bold mb-3">Почему у нас дешевле розницы</h3>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Никакой магии. С 2022 года Apple официально не поставляет технику в
            Россию, поэтому вся новая техника — у нас, у маркетплейсов и у крупных
            сетей — ввозится параллельным импортом. Разница только в наценке.
            Федеральная сеть закладывает в цену аренду магазинов в торговых
            центрах, зарплаты продавцов, маркетинг и длинную логистику через
            распределительные склады. Мы работаем иначе: небольшая команда, один
            офис в Дорогомилово вместо сети витрин, закупки под реальный спрос у
            поставщиков, с которыми сотрудничаем не первый год. Наша цена ближе к
            закупочной, а зарабатываем мы на обороте, а не на марже с одного
            устройства.
          </p>
          <p className="mb-10 leading-relaxed text-muted-foreground">
            Мы сознательно не называем себя «официальным ресейлером» — таких в
            России сейчас нет, и любой продавец, который утверждает обратное,
            лукавит. Зато за товар отвечает конкретный человек, а не колл-центр:
            тот же предприниматель, который восемь лет выкупает и продаёт
            Mac в Москве, оформляет чек и даёт собственную гарантию.
          </p>

          <h3 className="text-2xl font-bold mb-3">Новая или б/у: когда что выгоднее</h3>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Новое устройство оправдано, когда нужен свежий чип, нулевой износ
            аккумулятора и максимальный запас лет поддержки iOS или macOS: вы
            берёте технику «с чистого листа», без чужой истории эксплуатации.
            Б/у выгоднее, когда задачи умеренные — учёба, документы, браузер,
            монтаж «по выходным»: MacBook на M1 или M2 с проверенной батареей
            решает их так же уверенно, но заметно дешевле. Честный ориентир:
            чем короче ваш горизонт владения, тем разумнее б/у — меньше потеря
            на перепродаже.
          </p>
          <p className="mb-10 leading-relaxed text-muted-foreground">
            У нас есть обе витрины: <Link className="text-primary hover:underline" href="/buy">каталог проверенной б/у техники</Link> и
            эта страница с новой. А если вы обновляетесь — <Link className="text-primary hover:underline" href="/sell">продайте нам свой прежний Mac</Link>:
            онлайн-оценка занимает полминуты, платим до 80% от рыночной медианы,
            которую пересчитываем каждый день по объявлениям Авито, и эти деньги
            сразу закрывают часть стоимости новой машины. Отдельные страницы
            выкупа: <Link className="text-primary hover:underline" href="/sell/macbook-air">MacBook Air</Link>,{' '}
            <Link className="text-primary hover:underline" href="/sell/macbook-pro">MacBook Pro</Link>,{' '}
            <Link className="text-primary hover:underline" href="/sell/imac">iMac</Link>,{' '}
            <Link className="text-primary hover:underline" href="/sell/mac-mini">Mac mini</Link> и
            даже <Link className="text-primary hover:underline" href="/sell/broken">техника с дефектами</Link>.
            Перед сделкой полезно прочитать, <Link className="text-primary hover:underline" href="/blog/kak-prodat-macbook-vygodno">как продать MacBook выгодно</Link>.
          </p>

          <h3 className="text-2xl font-bold mb-3">Как проходит проверка и какая гарантия</h3>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Оплата — только после проверки. При самовывозе из офиса у метро
            Киевская вскрываем коробку вместе: сверяем серийный номер на коробке
            и в самом устройстве, пробиваем его на официальном сайте Apple,
            смотрим статус активации, комплект и заводские плёнки. При доставке
            курьер ждёт, пока вы всё проверите; <Link className="text-primary hover:underline" href="/moskva">выезжаем по всем районам Москвы</Link>.
            Если что-то не устроило — вы просто не платите. Методика та же, что
            мы описали в статье <Link className="text-primary hover:underline" href="/blog/proverka-macbook-pered-pokupkoi">о проверке MacBook перед покупкой</Link>:
            для нового устройства список короче, но принцип «сначала проверка,
            потом деньги» не меняется.
          </p>
          <p className="mb-10 leading-relaxed text-muted-foreground">
            Теперь честный момент про гарантию. Глобальная гарантия Apple на
            технику параллельного импорта в российских авторизованных сервисах
            официально не действует — это правда для любого продавца, как бы
            красиво он ни называл свои поставки. Поэтому гарантийные
            обязательства мы берём на себя: если проявится заводской дефект,
            отремонтируем или заменим устройство. Покупка оформляется с чеком,
            так что права по закону о защите прав потребителей у вас тоже
            остаются.
          </p>

          <h3 className="text-2xl font-bold mb-4">Частые вопросы о покупке новой техники Apple</h3>

          <h4 className="text-lg font-semibold mb-2">Это оригинальная техника Apple?</h4>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Да. Параллельный импорт — это те же устройства с конвейеров Apple,
            просто выпущенные для другого рынка: Европы, ОАЭ, Гонконга или США.
            Каждый серийный номер проверяется на официальном сайте Apple ещё до
            передачи вам — видно модель, регион и статус активации. Восстановленные
            (refurbished) аппараты под видом новых и реплики мы не возим
            принципиально: репутация в нашем деле дороже любой разовой сделки.
          </p>

          <h4 className="text-lg font-semibold mb-2">Почему цена может отличаться от каталога?</h4>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Закупка идёт в валюте, поэтому прайс двигается вместе с курсом и
            обновляется при каждой поставке — дата последнего пересчёта указана
            в начале раздела. Когда вы подтверждаете заказ, цена фиксируется и
            уже не меняется, в какую бы сторону ни пошёл курс. Если позиция
            закончилась, предложим аналогичную конфигурацию или назовём срок
            ближайшей поставки — обычно это несколько дней.
          </p>

          <h4 className="text-lg font-semibold mb-2">Устройство будет активировано?</h4>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            По умолчанию продаём запечатанные, не активированные устройства.
            Иногда поставщик активирует iPhone для проверки региона или комплекта —
            такие экземпляры мы отдельно помечаем в карточке товара и продаём
            дешевле. Скрывать статус активации бессмысленно: он проверяется по
            серийному номеру за минуту, и мы сами показываем эту проверку при
            выдаче. Гарантийный срок Apple отсчитывается именно с даты активации.
          </p>

          <h4 className="text-lg font-semibold mb-2">Можно ли сдать старый Mac или iPhone в счёт нового?</h4>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Да, это наш профильный сценарий. Оцените устройство в <Link className="text-primary hover:underline" href="/sell">калькуляторе выкупа</Link> —
            расчёт идёт по свежим рыночным ценам, которые мы ежедневно собираем
            по тысячам объявлений Авито. При встрече проведём диагностику, это
            занимает около получаса, и сразу зачтём сумму выкупа в стоимость
            новой техники. Принимаем и устройства с дефектами — с честной
            корректировкой цены, а не отказом.
          </p>

          <h4 className="text-lg font-semibold mb-2">Как быстро можно получить заказ?</h4>
          <p className="leading-relaxed text-muted-foreground">
            Если позиция в наличии — самовывоз из офиса у метро Киевская в день
            обращения или доставка по Москве, обычно в тот же день по
            договорённости. Позиции под заказ приезжают со следующей поставкой,
            как правило в течение нескольких дней. Оплата наличными или
            переводом — после того, как вы проверили устройство: серийный номер,
            комплект, состояние коробки.
          </p>
        </div>
      </div>
    </section>
  );
}
