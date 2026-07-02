import Link from 'next/link';
import type { AvitoPricesData, AvitoPriceStat } from '@/types/avito-prices';

/**
 * Серверный SEO-блок страницы /sell/imac: таблица актуальных цен выкупа iMac
 * из avito-prices.json (пересчитываются ежедневно), answer-first абзац для
 * сниппетов и AI-ассистентов, текстовый FAQ. Без "use client".
 */

const fmt = (n: number) => n.toLocaleString('ru-RU');

const fmtDate = (s?: string) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' :
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** «imac 24» + «Apple M4» → «iMac 24 (M4)» */
function displayModel(s: AvitoPriceStat): string {
  const name = s.model_name.replace(/^imac/i, 'iMac');
  const chip = (s.processor || '').replace(/^Apple\s+/i, '');
  return chip ? `${name} (${chip})` : name;
}

function topImacs(stats: AvitoPriceStat[], limit: number): AvitoPriceStat[] {
  return stats
    .filter((s) => s.family === 'iMac' && s.median_price > 0 && s.buyout_price > 0
      && (s.samples_count || 0) >= 3 && s.ram > 0 && s.ssd > 0
      // iMac 24 официально существует максимум с 2 ТБ SSD —
      // отсекаем мусорные распознавания парсера (например, «8192 ГБ»)
      && s.ssd <= 2048)
    .sort((a, b) => (b.samples_count || 0) - (a.samples_count || 0))
    .slice(0, limit);
}

export default function SellImacSeo({ data }: { data: AvitoPricesData }) {
  const rows = topImacs(data.stats || [], 10);
  const minBuyout = rows.length ? Math.min(...rows.map((r) => r.buyout_price)) : 0;
  const updated = fmtDate(data.generated_at);
  const total = data.total_listings || 0;

  return (
    <section className="bg-background text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Сколько стоит продать iMac в Москве?</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {updated && <>Данные обновлены {updated}. </>}
            Расчёт по {total > 0 ? fmt(total) : '3 000+'} актуальным объявлениям Авито (Москва).
          </p>

          {/* Answer-first: самодостаточный цитируемый абзац */}
          <p className="mb-8 leading-relaxed">
            Продать iMac в Москве можно за один день: мы выкупаем моноблоки Apple по
            цене до 80% от рыночной медианы, которую пересчитываем каждое утро по трём
            с лишним тысячам живых объявлений Авито. За актуальные iMac 24 на чипах
            M1, M3 и M4 платим{minBuyout > 0 && <> от {fmt(minBuyout)} ₽</>} — точные
            суммы по конфигурациям собраны в таблице ниже. Модели 21,5″ и 27″ на Intel
            2017 года выпуска и новее тоже берём, но заметно дешевле: рынок на них
            просел после окончания поддержки Apple. Оценка онлайн занимает 30 секунд,
            выкуп при встрече — около 30 минут: проверяем компьютер при вас и сразу
            отдаём деньги наличными или переводом. Главное для владельца iMac —
            бесплатный выезд по Москве: не нужно искать коробку, упаковывать
            десятикилограммовый моноблок и везти его через весь город. Приезжаем сами,
            аккуратно упаковываем и увозим. Технику с дефектами — битым стеклом,
            полосами на матрице, следами залития — тоже принимаем с корректировкой цены.
          </p>

          {rows.length > 0 && (
            <div className="mb-10">
              <h3 className="text-xl font-semibold mb-4">iMac — цены выкупа сегодня</h3>
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
                        <td className="px-4 py-3">{displayModel(s)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.ram} / {s.ssd} ГБ</td>
                        <td className="px-4 py-3">{fmt(s.median_price)} ₽</td>
                        <td className="px-4 py-3 font-semibold text-primary">{fmt(s.buyout_price)} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Не нашли свою конфигурацию? Рассчитайте точную цену
                в <Link className="text-primary hover:underline" href="/sell">калькуляторе на странице выкупа</Link> —
                там собраны все модели Mac.
              </p>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-4">Что влияет на цену iMac при выкупе?</h2>

          <h3 className="text-xl font-semibold mb-3">Поколение и диагональ: 24″ на M-серии против 21,5″ и 27″ на Intel</h3>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Главный водораздел — процессор. iMac 24″ на Apple Silicon (M1 2021 года,
            M3 2023-го, M4 2024-го) — самая ликвидная часть рынка моноблоков: их ищут,
            они быстро уходят к новым владельцам, и по ним мы даём максимальный процент
            от медианы. Внутри линейки цена растёт с памятью: версия на 16 ГБ
            оперативной всегда дороже базовой на 8 ГБ, а конфигурации с SSD на 1–2 ТБ
            уходят с заметной надбавкой — сравните строки таблицы выше.
          </p>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            С Intel всё жёстче. Apple перестала выпускать для этих машин новые версии
            macOS, и вторичный рынок отреагировал сразу. iMac 21,5″ и 27″ 2017 года
            и новее — особенно 27″ с экраном Retina 5K — мы выкупаем, но по ценам
            ощутимо ниже M-серии. Моноблоки до 2017 года не берём совсем: спроса на
            них практически нет, и честнее сказать об этом заранее, чем заманивать
            «оценкой» ради бесплатной диагностики, как делают некоторые скупки.
          </p>

          <h3 className="text-xl font-semibold mb-3">Состояние, комплект и учётная запись</h3>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            У настольного Mac нет аккумулятора с циклами, поэтому на первый план
            выходит матрица: полосы, засветы, битые пиксели и сколы на стекле снижают
            цену сильнее всего — замена дисплейного модуля iMac стоит дорого. Дальше
            смотрим корпус и подставку: царапины по алюминию, следы падений и вмятины.
            Комплект добавляет к сумме: оригинальные Magic Keyboard и Magic Mouse,
            кабель питания, коробка и чек упрощают перепродажу, и этой разницей мы
            делимся с вами. Обязательное условие одно — доступ к вашей учётной записи:
            перед сделкой нужно выйти из iCloud и отключить «Найти Mac». Следы
            неоригинального ремонта — сторонний SSD, вскрытие с повреждением клея
            матрицы — обсуждаем честно: это минус к цене, но не отказ.
          </p>

          <h2 className="text-2xl font-bold mb-4">Почему iMac сложнее продать самому?</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Продать MacBook на Авито просто: положил в рюкзак, встретился у метро.
            С iMac так не получится. Моноблок весит около десяти килограммов вместе
            с подставкой, у большинства владельцев не сохранилась заводская коробка
            с пенопластовыми ложементами, а случайная картонная коробка стеклянную
            матрицу не защищает. Авитодоставка для крупногабаритной техники с хрупким
            экраном — лотерея: при повреждении в пути спор с покупателем и службой
            доставки тянется неделями. Остаются личные встречи, но покупатели неохотно
            едут «смотреть» тяжёлый компьютер и почти всегда торгуются на пороге,
            понимая, что второй раз вы его никуда не повезёте.
          </p>

          <h3 className="text-xl font-semibold mb-3">Упаковку и вывоз берём на себя</h3>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            Наш формат снимает эту проблему целиком. Специалист приезжает к вам домой
            или в офис в согласованное время, привозит упаковочные материалы —
            пузырчатую плёнку, картон, стрейч — и после расчёта сам упаковывает
            и увозит iMac. Вам не нужно ничего организовывать: ни коробку, ни грузовое
            такси, ни друга с машиной. Выезжаем во
            все <Link className="text-primary hover:underline" href="/moskva">районы Москвы</Link>.
            Если удобнее привезти технику самостоятельно — ждём в офисе у метро
            Киевская, в Дорогомилово.
          </p>

          <h2 className="text-2xl font-bold mb-4">Как проходит выкуп iMac?</h2>
          <ol className="list-decimal pl-6 mb-4 space-y-2 leading-relaxed text-muted-foreground">
            <li>
              <span className="text-foreground font-medium">Онлайн-оценка.</span> Выберите
              модель, конфигурацию и состояние
              в <Link className="text-primary hover:underline" href="/sell">калькуляторе</Link> —
              это 30 секунд, цена считается от свежей медианы Авито.
            </li>
            <li>
              <span className="text-foreground font-medium">Подтверждение.</span> Связываемся,
              уточняем комплект и дефекты, фиксируем цену и время встречи.
            </li>
            <li>
              <span className="text-foreground font-medium">Встреча.</span> Выезд к вам
              по Москве или офис у Киевской — как удобнее.
            </li>
            <li>
              <span className="text-foreground font-medium">Диагностика при вас,
              20–30 минут.</span> Проверяем матрицу на полосы и битые пиксели, порты,
              звук, камеру, серийный номер и отвязку iCloud.
            </li>
            <li>
              <span className="text-foreground font-medium">Деньги сразу.</span> Наличными
              или переводом на карту прямо на месте, упаковку и вывоз берём на себя.
            </li>
          </ol>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            Сумма из калькулятора и есть сумма сделки, если состояние совпало
            с описанием. Мы даём гарантию покупателям нашей техники, поэтому
            диагностика тщательная — но прозрачная: всё происходит при вас, и любой
            найденный нюанс мы показываем на устройстве, а не «озвучиваем скидку»
            постфактум. Перед продажей полезно
            прочитать: <Link className="text-primary hover:underline" href="/blog/kak-prodat-macbook-vygodno">как продать технику Apple выгодно</Link> и <Link className="text-primary hover:underline" href="/blog/proverka-macbook-pered-pokupkoi">как проверить Mac перед сделкой</Link>.
          </p>

          <h3 className="text-xl font-semibold mb-3">Выкуп другой техники Apple</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-10 list-none">
            <li><Link className="text-primary hover:underline" href="/sell">Все цены и калькулятор выкупа</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/macbook-air">Выкуп MacBook Air (M1–M4)</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/macbook-pro">Выкуп MacBook Pro (13–16″)</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/mac-mini">Выкуп Mac mini</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/broken">Выкуп неисправных Mac</Link></li>
            <li><Link className="text-primary hover:underline" href="/moskva">Выезд по районам Москвы</Link></li>
          </ul>

          <h2 className="text-2xl font-bold mb-4">Частые вопросы о выкупе iMac</h2>

          <h3 className="text-lg font-semibold mb-2">Выкупаете ли iMac на Intel?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Да, но выборочно. iMac 21,5″ и 27″ 2017 года выпуска и новее берём —
            особенно 27″ с Retina 5K, на них ещё есть спрос. Цена будет заметно ниже,
            чем на M-серию: Apple завершила поддержку Intel-моделей, и рынок это уже
            отыграл. Моноблоки до 2017 года не выкупаем совсем — продать их дороже
            стоимости логистики почти невозможно. Укажите модель и год в калькуляторе,
            ответим сразу.
          </p>

          <h3 className="text-lg font-semibold mb-2">Нужно ли везти iMac к вам самому?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Нет. По Москве мы выезжаем сами — для iMac это стандартный сценарий,
            а не платная опция. Специалист приезжает с упаковкой, проверяет компьютер
            у вас дома или в офисе, рассчитывается на месте и сам увозит моноблок.
            Если вам удобнее приехать к нам — офис находится у метро Киевская,
            в Дорогомилово. Выбирайте любой вариант при оформлении заявки.
          </p>

          <h3 className="text-lg font-semibold mb-2">Возьмёте iMac с разбитым стеклом или полосами на экране?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Возьмём. Дефектные iMac — обычная часть нашей работы: битое стекло, полосы
            и засветы матрицы, компьютер не включается после скачка напряжения. Цена
            снижается на стоимость ремонта и наш риск, но деньги вы получаете сразу,
            а не ищете мастера и покупателя месяцами. Опишите дефект честно при
            онлайн-оценке — тогда сумма при встрече не станет сюрпризом. Подробнее —
            на <Link className="text-primary hover:underline" href="/sell/broken">странице выкупа неисправной техники</Link>.
          </p>

          <h3 className="text-lg font-semibold mb-2">Что сделать с данными и iCloud перед продажей?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Сделайте резервную копию в Time Machine или перенесите данные на новый
            Mac, затем выйдите из iCloud (Системные настройки → Apple ID → Выйти)
            и сотрите диск через «Стереть контент и настройки». Не успели — поможем
            сделать это при встрече, займёт минут десять. Главное — знать пароль от
            своей учётной записи: iMac с чужим Apple ID мы не выкупаем.
          </p>

          <h3 className="text-lg font-semibold mb-2">Почему цена не меняется «после осмотра»?</h3>
          <p className="leading-relaxed text-muted-foreground">
            Потому что оценка изначально строится на реальных данных: медиана по
            объявлениям Авито пересчитывается каждый день, а состояние вы описываете
            сами. Если описание совпало с реальностью — сумма та же, что показал
            калькулятор. Снижение возможно только при скрытом дефекте, о котором вы
            не сказали, и тогда мы показываем его вам до сделки. Схема «наобещать по
            телефону и срезать на месте» — не про нас: на ней невозможно работать
            восемь лет подряд.
          </p>
        </div>
      </div>
    </section>
  );
}
