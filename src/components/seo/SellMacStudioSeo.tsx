import Link from 'next/link';
import type { AvitoPricesData, AvitoPriceStat } from '@/types/avito-prices';

/**
 * Серверный SEO-блок страницы /sell/mac-studio: цены выкупа Mac Studio из
 * avito-prices.json (обновляются ежедневно) + экспертный текст о продаже
 * дорогой профессиональной техники. Рендерится на сервере, без "use client".
 */

const fmt = (n: number) => n.toLocaleString('ru-RU');

const fmtDate = (s?: string) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' :
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const chip = (p?: string) => (p || '').replace(/^Apple\s+/i, '');

function topConfigs(stats: AvitoPriceStat[], limit: number): AvitoPriceStat[] {
  return stats
    .filter((s) => s.family === 'Mac Studio' && s.median_price > 0 && s.buyout_price > 0
      && (s.samples_count || 0) >= 3 && s.ram > 0 && s.ssd > 0)
    .sort((a, b) => (b.samples_count || 0) - (a.samples_count || 0))
    .slice(0, limit);
}

export default function SellMacStudioSeo({ data }: { data: AvitoPricesData }) {
  const stats = data.stats || [];
  const rows = topConfigs(stats, 10);
  const buyouts = rows.map((r) => r.buyout_price);
  const minBuyout = buyouts.length ? Math.min(...buyouts) : 0;
  const maxBuyout = buyouts.length ? Math.max(...buyouts) : 0;
  const updated = fmtDate(data.generated_at);
  const total = data.total_listings || 0;

  return (
    <section className="bg-background text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">

          <h2 className="text-3xl font-bold mb-4">Сколько стоит продать Mac Studio в Москве?</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {updated && <>Данные обновлены {updated}. </>}
            Расчёт по {total > 0 ? fmt(total) : '3 000+'} актуальным объявлениям Авито (Москва).
          </p>

          {/* Answer-first: самодостаточный цитируемый абзац */}
          <p className="mb-8 leading-relaxed">
            Продать Mac Studio в Москве можно за сумму до 80% от текущей рыночной медианы
            {minBuyout > 0 && maxBuyout > minBuyout && (
              <>: по сегодняшним данным диапазон выкупа популярных конфигураций — от {fmt(minBuyout)} до {fmt(maxBuyout)} ₽</>
            )}. Точные цены — в таблице ниже: мы пересчитываем их каждый день по реальным
            объявлениям Авито, так что это не «заманчивая цифра до осмотра», а честный
            рыночный ориентир. Сильнее всего на сумму влияют чип (базовый, Max или Ultra)
            и объём унифицированной памяти, затем — поколение, состояние корпуса, комплект
            и отвязка от Apple ID. Онлайн-оценка занимает 30 секунд, сделка — около
            30 минут: диагностика при вас в офисе у метро Киевская, договор купли-продажи,
            деньги сразу — наличными или переводом. Цена после проверки не меняется задним
            числом. Принимаем и машины с дефектами или после ремонта — с понятной, заранее
            озвученной корректировкой. Для дорогой
            профессиональной техники это самый быстрый и безопасный способ продажи: без
            недель ожидания покупателя и встреч с незнакомцами.
          </p>

          {rows.length > 0 && (
            <div className="mb-10">
              <h3 className="text-xl font-semibold mb-4">Mac Studio — цены выкупа сегодня</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-4 py-3 font-medium">Модель</th>
                      <th className="px-4 py-3 font-medium">Конфигурация</th>
                      <th className="px-4 py-3 font-medium">Рынок (медиана)</th>
                      <th className="px-4 py-3 font-medium">Выкуп до</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s, i) => (
                      <tr key={`${s.model_name}-${s.processor}-${s.ram}-${s.ssd}-${i}`} className="border-t border-border">
                        <td className="px-4 py-3">{s.model_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{chip(s.processor)} · {s.ram} / {s.ssd} ГБ</td>
                        <td className="px-4 py-3">{fmt(s.median_price)} ₽</td>
                        <td className="px-4 py-3 font-semibold text-primary">{fmt(s.buyout_price)} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Не нашли свою конфигурацию? В <Link className="text-primary hover:underline" href="/sell">калькуляторе на странице выкупа</Link>
                {' '}есть все варианты — включая редкие сборки на Ultra с максимальной памятью.
              </p>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-4">Почему Mac Studio так тяжело продать самостоятельно?</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Mac Studio — нишевая машина. Её покупают монтажёры, колористы, 3D-художники,
            разработчики и те, кто гоняет нейросети локально. Таких покупателей на вторичке
            в десятки раз меньше, чем желающих купить MacBook Air, поэтому объявление о
            продаже висит неделями, а по старшим конфигурациям — месяцами. За восемь лет
            выкупа Mac мы видели это десятки раз: владелец ставит справедливую цену,
            получает три звонка от перекупщиков с предложением «минус тридцать процентов
            и заберу сегодня», устаёт и в итоге отдаёт дешевле, чем мог бы.
          </p>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            Вторая проблема — безопасность. Продажа компьютера за несколько сотен тысяч
            рублей — это встреча с незнакомым человеком и крупная сумма наличных на руках.
            Пересылка через доставку — риск спора «пришёл не тот товар». Мы снимаем оба
            риска: сделка проходит в офисе у метро Киевская, с договором и проверкой
            техники при вас. Вы уходите с деньгами через полчаса, а не через месяц.
          </p>

          <h2 className="text-2xl font-bold mb-4">Что влияет на цену выкупа Mac Studio?</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Главный фактор — чип и память. Разница между базовым чипом, Max и Ultra —
            это разница в разы, а не в проценты: Ultra фактически состоит из двух
            кристаллов Max и ценится соответственно. Объём унифицированной памяти важнее,
            чем думают владельцы: профессионалы ищут именно 64–128 ГБ и готовы за них
            доплачивать. А вот ёмкость SSD влияет слабее — внешние накопители стоят
            недорого, и рынок это учитывает.
          </p>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Дальше — поколение и состояние. У Mac Studio нет экрана и аккумулятора, то есть
            двух самых изнашиваемых узлов ноутбука: циклы батареи и засветы матрицы здесь
            не тема. Поэтому настольные Mac держат цену заметно лучше MacBook. Смотрим мы
            на корпус (вмятины на алюминии, состояние портов), следы вскрытия и ремонтов,
            комплект — коробка, кабель питания и чек добавляют к цене, потому что для
            дорогой техники подтверждение происхождения важно покупателю. Обязательное
            условие — отвязка от Apple ID и выключенный Find My: без этого выкуп невозможен.
            Машину с дефектом тоже возьмём — с корректировкой, как и{' '}
            <Link className="text-primary hover:underline" href="/sell/broken">неисправные MacBook</Link>.
          </p>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            Как считается сама цена: наш парсер ежедневно собирает объявления Авито по Москве
            и вычисляет медиану по каждой конфигурации — она устойчива к завышенным и
            «мусорным» ценам. От медианы мы отнимаем свою маржу: предпродажную подготовку,
            гарантию следующему покупателю и риск того, что редкая конфигурация будет
            продаваться долго. В отличном состоянии это обычно 75–80% рынка.
          </p>

          <h2 className="text-2xl font-bold mb-4">Как проходит выкуп дорогой техники?</h2>
          <ol className="list-decimal pl-5 mb-8 space-y-3 leading-relaxed text-muted-foreground">
            <li>
              <span className="text-foreground font-medium">Оценка онлайн за 30 секунд.</span>{' '}
              Выбираете чип, память и состояние в калькуляторе — видите и рыночную медиану,
              и нашу цену. Никаких «оставьте телефон, менеджер назовёт цену».
            </li>
            <li>
              <span className="text-foreground font-medium">Встреча в офисе.</span>{' '}
              Для техники такого уровня рекомендуем офис у метро Киевская (Дорогомилово):
              там стационарная диагностика, монитор и спокойная обстановка. Выезд по Москве
              тоже возможен.
            </li>
            <li>
              <span className="text-foreground font-medium">Проверка при вас, ~30 минут.</span>{' '}
              Тесты чипа и памяти под нагрузкой, проверка портов, серийного номера и статуса
              Find My. Вы видите каждый шаг — ничего не уносим «в подсобку».
            </li>
            <li>
              <span className="text-foreground font-medium">Договор купли-продажи.</span>{' '}
              С паспортными данными и серийным номером. Для сделки на сотни тысяч рублей
              это защита обеих сторон. Работаем официально: ИП Капралов Р.И.
            </li>
            <li>
              <span className="text-foreground font-medium">Деньги сразу.</span>{' '}
              Наличными или переводом на карту — как удобнее. Цена совпадает с оценкой,
              если состояние соответствует описанному вами.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mb-4">Частые вопросы о выкупе Mac Studio</h2>

          <h3 className="text-xl font-semibold mb-2">Выкупаете ли топовые конфигурации на Ultra со 128 ГБ памяти?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Да, и именно за ними мы охотимся. Старшие сборки на Max и Ultra с большой
            памятью — самый неликвидный товар для частной продажи: аудитория узкая, и
            покупателя можно ждать месяцами. У нас на такие машины есть очередь из
            профессиональных клиентов, поэтому платим за них честный процент от рынка,
            а не «сколько дадут».
          </p>

          <h3 className="text-xl font-semibold mb-2">Можно ли продать Mac Studio с дефектом или после ремонта?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Можно. Вмятина на корпусе, неработающий порт, шумящий вентилятор или замена
            деталей — не приговор, а корректировка цены. Главное — расскажите о проблеме
            заранее: тогда предварительная оценка сразу будет реалистичной и не изменится
            при встрече. Скрытый дефект, найденный на диагностике, скорректирует цену
            точно так же — только с потерей времени для вас.
          </p>

          <h3 className="text-xl font-semibold mb-2">Нужно ли привозить монитор, клавиатуру и мышь?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Нет, Mac Studio продаётся отдельно — монитор для диагностики есть у нас в офисе.
            Если у вас остались коробка, кабель питания и чек — возьмите их: комплект
            повышает цену. Studio Display или периферию Apple можем оценить и выкупить
            отдельной позицией, просто упомяните об этом в заявке.
          </p>

          <h3 className="text-xl font-semibold mb-2">Изменится ли цена после осмотра?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Нет, если состояние соответствует тому, что вы указали при оценке. Схема
            «называем красивую цену по телефону, а при встрече режем на треть» — классика
            скупок, и именно от неё мы отстраиваемся: наша предварительная цена считается
            от реальной рыночной медианы, и вы видите её источник. Диагностика лишь
            подтверждает заявленное состояние.
          </p>

          <h3 className="text-xl font-semibold mb-2">Как быстро я получу деньги и каким способом?</h3>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            Сразу после подписания договора — в ту же встречу. Наличными или переводом на
            карту, на ваш выбор; для крупных сумм многие выбирают перевод, чтобы не выходить
            из офиса с пачкой наличных. Вся сделка от «зашёл» до «деньги на счёте» занимает
            около 30 минут.
          </p>

          <h3 className="text-xl font-semibold mb-3">Выкупаем и другую технику Apple</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8 list-none">
            <li><Link className="text-primary hover:underline" href="/sell">Все цены и калькулятор выкупа</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/mac-mini">Выкуп Mac mini</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/imac">Выкуп iMac</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/macbook-pro">Выкуп MacBook Pro (13–16″)</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/macbook-air">Выкуп MacBook Air (M1–M4)</Link></li>
            <li><Link className="text-primary hover:underline" href="/moskva">Выезд по районам Москвы</Link></li>
          </ul>

          <p className="leading-relaxed text-muted-foreground">
            Полезное по теме: <Link className="text-primary hover:underline" href="/blog/kak-prodat-macbook-vygodno">как продать технику Apple выгодно</Link>
            {' '}и <Link className="text-primary hover:underline" href="/blog/proverka-macbook-pered-pokupkoi">как проверить Mac перед сделкой</Link> —
            советы применимы и к Mac Studio.
          </p>
        </div>
      </div>
    </section>
  );
}
