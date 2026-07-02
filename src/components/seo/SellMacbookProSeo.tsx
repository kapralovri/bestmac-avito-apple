import Link from 'next/link';
import type { AvitoPricesData, AvitoPriceStat } from '@/types/avito-prices';

/**
 * Серверный SEO-блок страницы /sell/macbook-pro: цены выкупа MacBook Pro из
 * avito-prices.json (пересчитываются ежедневно) + экспертный текст по E-E-A-T.
 * Рендерится на сервере, цены попадают в HTML для поисковиков и AI-ассистентов.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU');

const fmtDate = (s?: string) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' :
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

function proConfigs(stats: AvitoPriceStat[], limit: number): AvitoPriceStat[] {
  return stats
    .filter((s) => s.family === 'MacBook' && s.model_name.includes('Pro')
      && s.median_price > 0 && s.buyout_price > 0
      && (s.samples_count || 0) >= 3 && s.ram > 0 && s.ssd > 0)
    .sort((a, b) => (b.samples_count || 0) - (a.samples_count || 0))
    .slice(0, limit);
}

export default function SellMacbookProSeo({ data }: { data: AvitoPricesData }) {
  const stats = data.stats || [];
  const rows = proConfigs(stats, 12);
  const buyouts = rows.map((r) => r.buyout_price);
  const minBuyout = buyouts.length ? Math.min(...buyouts) : 0;
  const maxBuyout = buyouts.length ? Math.max(...buyouts) : 0;
  const updated = fmtDate(data.generated_at);
  const total = data.total_listings || 0;

  return (
    <section className="bg-background text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Сколько стоит продать MacBook Pro в Москве?</h2>

          {/* Answer-first: самодостаточный цитируемый абзац */}
          <p className="mb-4 leading-relaxed">
            Мы выкупаем MacBook Pro на чипах Apple Silicon — от M1 Pro и M1 Max до актуальных
            M4 и M5 — и платим до 80% от рыночной медианы, которую пересчитываем каждый день
            по трём тысячам с лишним реальных объявлений Авито в Москве.
            {minBuyout > 0 && maxBuyout > 0 && (
              <> По популярным конфигурациям из таблицы ниже выкуп начинается
              от {fmt(minBuyout)} ₽ за базовые модели и доходит до {fmt(maxBuyout)} ₽ за
              топовые версии с чипом Max.</>
            )}
            {' '}Итоговая сумма зависит от чипа (базовый, Pro или Max), диагонали 14 или
            16 дюймов, объёма памяти и SSD, износа аккумулятора, состояния экрана и корпуса,
            комплекта (коробка, зарядка, чек) и отвязки iCloud. Онлайн-оценка в калькуляторе
            занимает 30 секунд, сделка при встрече — около 30 минут: диагностика проходит
            при вас, деньги отдаём наличными или переводом сразу после проверки. Цена,
            названная заранее, не меняется «после осмотра»,
            если состояние соответствует описанию, а технику с дефектами берём с честной
            корректировкой.
          </p>

          <p className="text-sm text-muted-foreground mb-6">
            {updated && <>Данные обновлены {updated}. </>}
            Расчёт по {total > 0 ? fmt(total) : '3 000+'} актуальным объявлениям Авито (Москва).
          </p>

          {rows.length > 0 && (
            <div className="mb-10">
              <h3 className="text-xl font-semibold mb-4">MacBook Pro — цены выкупа сегодня</h3>
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
                      <tr key={`${s.model_name}-${s.ram}-${s.ssd}-${i}`} className="border-t border-border">
                        <td className="px-4 py-3">{s.model_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.ram} / {s.ssd} ГБ</td>
                        <td className="px-4 py-3">{fmt(s.median_price)} ₽</td>
                        <td className="px-4 py-3 font-semibold text-primary">{fmt(s.buyout_price)} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mb-10 leading-relaxed text-muted-foreground">
            Если вашей конфигурации нет в таблице — это не значит, что мы её не берём.
            В таблицу попадают только связки «модель + память + накопитель», по которым
            на Авито достаточно живых объявлений для честной медианы. Точную цену по любой
            конфигурации считает <Link className="text-primary hover:underline" href="/sell">калькулятор на странице выкупа</Link> —
            он работает по той же ежедневной базе.
          </p>

          <h2 className="text-2xl font-bold mb-4">Что влияет на цену MacBook Pro?</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            За восемь лет выкупа Mac мы выработали простое правило: покупатель на вторичке
            платит за чип и за состояние, всё остальное — поправочные коэффициенты.
            У MacBook Pro разброс цен внутри одного года выпуска огромный именно из-за
            линейки чипов: базовый M3, M3 Pro и M3 Max — это по сути три разных ноутбука
            по цене, хотя внешне они почти одинаковы. Версии Max с увеличенной памятью
            стабильно самые дорогие и самые ликвидные среди «прошек».
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-2 leading-relaxed text-muted-foreground">
            <li>
              <span className="text-foreground font-medium">Чип: базовый, Pro или Max.</span>{' '}
              Главный фактор. Разница между базовым чипом и версией Max в одной диагонали
              достигает десятков процентов — смотрите строки таблицы выше и сравните сами.
            </li>
            <li>
              <span className="text-foreground font-medium">Диагональ: 14 или 16 дюймов.</span>{' '}
              При одинаковом чипе 16-дюймовая модель обычно дороже: больше экран, батарея
              и охлаждение. Но 14″ продаётся быстрее — её чаще ищут как универсальную машину.
            </li>
            <li>
              <span className="text-foreground font-medium">Циклы аккумулятора.</span>{' '}
              Смотрим в «Информации о системе»: ресурс батареи рассчитан примерно на
              1000 циклов. До 300 циклов — норма, выше 500–700 или статус «Рекомендуется
              обслуживание» — дисконт, потому что замена батареи в моделях Pro недешёвая.
            </li>
            <li>
              <span className="text-foreground font-medium">Состояние экрана.</span>{' '}
              В MacBook Pro 14″ и 16″ стоит mini-LED панель Liquid Retina XDR — один из
              самых дорогих в ремонте экранов Apple. Поэтому сколы, засветы, битые пиксели
              и отпечатки клавиш на покрытии влияют на цену сильнее, чем на старых матрицах.
            </li>
            <li>
              <span className="text-foreground font-medium">Корпус и клавиатура.</span>{' '}
              Вмятины на крышке и днище, глубокие царапины, стёртые клавиши — всё это
              покупатель видит первым, и мы вынуждены закладывать предпродажную подготовку.
            </li>
            <li>
              <span className="text-foreground font-medium">Комплект.</span>{' '}
              Коробка, оригинальный блок питания и кабель MagSafe, чек о покупке — заметный
              плюс: комплектный ноутбук проще перепродать с гарантией.
            </li>
            <li>
              <span className="text-foreground font-medium">Ремонты и вскрытия.</span>{' '}
              Неоригинальные запчасти и следы вскрытия видно при диагностике. Скажите о них
              заранее — учтём честно, без сюрпризов на встрече.
            </li>
            <li>
              <span className="text-foreground font-medium">Отвязка iCloud.</span>{' '}
              Ноутбук с активной блокировкой активации мы не выкупаем ни при каких
              условиях — выход из учётной записи Apple обязателен.
            </li>
          </ul>
          <p className="mb-10 leading-relaxed text-muted-foreground">
            Как выжать из продажи максимум, мы разобрали в статье{' '}
            <Link className="text-primary hover:underline" href="/blog/kak-prodat-macbook-vygodno">«Как продать MacBook выгодно»</Link>.
          </p>

          <h2 className="text-2xl font-bold mb-4">Какие поколения MacBook Pro мы выкупаем?</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Все поколения на Apple Silicon. MacBook Pro 14 и 16 на M1 Pro и M1 Max 2021 года
            до сих пор отлично держат цену: это первые «прошки» с mini-LED экраном, портами
            HDMI и слотом SD, и спрос на них стабильный. Дальше идут M2 Pro и M2 Max 2023
            года, семейство M3 — включая базовый M3 в 14-дюймовом корпусе, который часто
            путают с Pro-версией, — затем M4 2024 года и новейшие модели на M5. Чем свежее
            поколение, тем ближе цена выкупа к верхней границе рынка.
          </p>
          <p className="mb-10 leading-relaxed text-muted-foreground">
            Отдельная история — MacBook Pro 13″ на M1 и M2 с панелью Touch Bar. Формально
            это Pro, но по железу он ближе к Air: тот же базовый чип, обычный экран без
            mini-LED. На вторичке такие модели оцениваются на уровне{' '}
            <Link className="text-primary hover:underline" href="/sell/macbook-air">MacBook Air</Link> соответствующего
            поколения, и это нормально — мы честно показываем медиану рынка, а не «желаемую» цену.
          </p>

          <h2 className="text-2xl font-bold mb-4">Почему мы не выкупаем MacBook Pro на Intel?</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Скажем прямо: MacBook Pro на процессорах Intel мы не берём — и не потому, что
            «жадничаем», а потому, что не сможем перепродать его с гарантией и чистой
            совестью. Apple завершает поддержку Intel-моделей: новые версии macOS для них
            больше не выходят, батареи в таких ноутбуках уже сильно изношены, а клавиатуры
            «бабочка» и раздувающиеся аккумуляторы — типичные болячки, ремонт которых
            дороже остаточной стоимости машины.
          </p>
          <p className="mb-10 leading-relaxed text-muted-foreground">
            Что делать с Intel-«прошкой»? Рабочую машину реальнее всего продать напрямую
            на Авито частному покупателю под простые задачи или сдать в трейд-ин у
            ритейлеров. Если ноутбук неисправен, загляните на страницу{' '}
            <Link className="text-primary hover:underline" href="/sell/broken">выкупа неисправных MacBook</Link>:
            там мы описали, какие дефектные устройства берём и как считаем корректировку.
            Мы предпочитаем честно отказать, чем назвать красивую цену и «переоценить»
            ноутбук при встрече.
          </p>

          <h2 className="text-2xl font-bold mb-4">Как проходит выкуп MacBook Pro?</h2>
          <ol className="list-decimal pl-5 mb-4 space-y-2 leading-relaxed text-muted-foreground">
            <li>
              <span className="text-foreground font-medium">Оценка онлайн за 30 секунд.</span>{' '}
              Выбираете модель, память и накопитель в <Link className="text-primary hover:underline" href="/sell">калькуляторе</Link> —
              видите и медиану рынка, и нашу цену выкупа.
            </li>
            <li>
              <span className="text-foreground font-medium">Подтверждение в мессенджере.</span>{' '}
              Присылаете пару фото, количество циклов аккумулятора и серийный номер —
              фиксируем цену до встречи.
            </li>
            <li>
              <span className="text-foreground font-medium">Встреча.</span>{' '}
              Офис у метро Киевская (район Дорогомилово) или{' '}
              <Link className="text-primary hover:underline" href="/moskva">выезд по Москве</Link> —
              как вам удобнее.
            </li>
            <li>
              <span className="text-foreground font-medium">Диагностика при вас.</span>{' '}
              Проверяем экран, клавиатуру, порты, динамики, циклы батареи и выход из iCloud.
              Обычно это 15–20 минут, вся сделка — около получаса.
            </li>
            <li>
              <span className="text-foreground font-medium">Деньги сразу.</span>{' '}
              Наличными или переводом на карту в момент сделки. Работаем официально —
              ИП Капралов Р.И., по запросу оформим договор купли-продажи.
            </li>
          </ol>
          <p className="mb-10 leading-relaxed text-muted-foreground">
            Кроме ноутбуков мы выкупаем и настольные Mac:{' '}
            <Link className="text-primary hover:underline" href="/sell/imac">iMac</Link> и{' '}
            <Link className="text-primary hover:underline" href="/sell/mac-mini">Mac mini</Link> —
            логика оценки та же, ежедневная медиана Авито и выкуп до 80% от неё.
          </p>

          <h2 className="text-2xl font-bold mb-4">Частые вопросы о выкупе MacBook Pro</h2>

          <h3 className="text-xl font-semibold mb-2">Выкупаете ли MacBook Pro с разбитым экраном?</h3>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Да. Разбитый или засвеченный mini-LED экран — самый дорогой дефект «прошки»,
            поэтому корректировка будет заметной, но мы посчитаем её прозрачно: покажем
            цену целого устройства и стоимость восстановления, разницу увидите сами.
            Также берём ноутбуки с изношенной батареей, неработающими портами и после
            залития. Подробности — на странице{' '}
            <Link className="text-primary hover:underline" href="/sell/broken">выкупа неисправных MacBook</Link>.
          </p>

          <h3 className="text-xl font-semibold mb-2">У ноутбука много циклов аккумулятора — сильно ли упадёт цена?</h3>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Умеренно. Циклы — это нормальный износ, а не поломка. Если счётчик в пределах
            нескольких сотен и ёмкость держится, влияние на цену небольшое. Дисконт
            появляется ближе к исчерпанию ресурса или при статусе «Рекомендуется
            обслуживание», потому что следующему владельцу придётся менять батарею.
            Посмотреть циклы можно самостоятельно: меню Apple → «Об этом Mac» →
            «Информация о системе» → «Электропитание».
          </p>

          <h3 className="text-xl font-semibold mb-2">Нужны ли коробка, зарядка и чек?</h3>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Не обязательны — выкупим и без них. Но полный комплект повышает цену: ноутбук
            с коробкой, оригинальным блоком питания и чеком быстрее продаётся и вызывает
            больше доверия у следующего покупателя, поэтому мы готовы платить за него
            больше. Если чек не сохранился, ничего страшного: историю устройства мы
            проверяем по серийному номеру при диагностике.
          </p>

          <h3 className="text-xl font-semibold mb-2">Как подготовить MacBook Pro к продаже?</h3>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Три шага: сделайте резервную копию (Time Machine или iCloud), выйдите из
            учётной записи Apple и отключите «Найти Mac», затем сотрите ноутбук через
            «Настройки» → «Перенос или сброс». На встрече останется только подтвердить,
            что блокировка активации снята. Что именно мы проверяем при осмотре, мы
            описали в статье{' '}
            <Link className="text-primary hover:underline" href="/blog/proverka-macbook-pered-pokupkoi">о проверке MacBook перед покупкой</Link> —
            полезно прочитать глазами покупателя.
          </p>

          <h3 className="text-xl font-semibold mb-2">Может ли цена измениться при встрече?</h3>
          <p className="mb-2 leading-relaxed text-muted-foreground">
            Только если реальное состояние отличается от описанного: например, в переписке
            экран был «идеальный», а на месте нашлись битые пиксели или следы вскрытия.
            Если фото и описание честные, вы получите ровно ту сумму, которую мы
            зафиксировали до встречи. Именно поэтому мы публикуем и медиану рынка, и цену
            выкупа заранее — нам невыгодно играть в «переоценку», репутация стоит дороже.
          </p>
        </div>
      </div>
    </section>
  );
}
