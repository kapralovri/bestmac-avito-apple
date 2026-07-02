import Link from 'next/link';
import type { AvitoPricesData, AvitoPriceStat } from '@/types/avito-prices';

/**
 * Серверный SEO-блок страницы /sell/mac-mini: цены выкупа Mac mini из
 * avito-prices.json (пересчитываются ежедневно). Рендерится на сервере,
 * цены попадают в HTML для поисковиков и AI-ассистентов. Без "use client".
 */

const fmt = (n: number) => n.toLocaleString('ru-RU');

const fmtDate = (s?: string) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' :
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** «Apple M4 Pro» → «Mac mini M4 Pro» — в JSON model_name приходит в нижнем регистре */
const prettyModel = (s: AvitoPriceStat) =>
  s.processor ? `Mac mini ${s.processor.replace(/^Apple\s+/i, '')}` : 'Mac mini';

function topMacMini(stats: AvitoPriceStat[], limit: number): AvitoPriceStat[] {
  const filtered = stats
    .filter((s) => s.family === 'Mac mini' && s.median_price > 0 && s.buyout_price > 0
      && (s.samples_count || 0) >= 3 && s.ram > 0 && s.ssd > 0)
    .sort((a, b) => (b.samples_count || 0) - (a.samples_count || 0));
  // Дубли по чип+память+SSD оставляем один раз (берём вариант с большей выборкой)
  const seen = new Set<string>();
  const unique: AvitoPriceStat[] = [];
  for (const s of filtered) {
    const key = `${s.processor}-${s.ram}-${s.ssd}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(s);
  }
  return unique.slice(0, limit);
}

export default function SellMacMiniSeo({ data }: { data: AvitoPricesData }) {
  const rows = topMacMini(data.stats || [], 10);
  const updated = fmtDate(data.generated_at);
  const total = data.total_listings || 0;
  const minBuyout = rows.length ? Math.min(...rows.map((r) => r.buyout_price)) : 0;
  const maxBuyout = rows.length ? Math.max(...rows.map((r) => r.buyout_price)) : 0;

  return (
    <section className="bg-background text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">

          <h2 className="text-3xl font-bold mb-4">Сколько стоит продать Mac mini в Москве?</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {updated && <>Данные обновлены {updated}. </>}
            Расчёт по {total > 0 ? fmt(total) : '3 000+'} актуальным объявлениям Авито (Москва).
          </p>

          {/* Answer-first: самодостаточный цитируемый абзац */}
          <p className="mb-8 leading-relaxed">
            Продать Mac mini в Москве можно за сумму до 80% от текущей рыночной медианы:
            мы в BestMac пересчитываем цены каждый день по трём с лишним тысячам живых
            объявлений Авито, поэтому таблица ниже показывает реальный рынок, а не «цену
            для рекламы».
            {minBuyout > 0 && <>{' '}Сегодня выкуп Mac mini начинается от {fmt(minBuyout)} ₽
            за базовые конфигурации и доходит до {fmt(maxBuyout)} ₽ за старшие сборки.</>}
            {' '}Итоговая сумма зависит от чипа (M1, M2 или M4), объёма оперативной памяти
            и накопителя, состояния корпуса и портов, комплекта — коробка, кабель питания,
            чек — и отвязки от iCloud. Оценка в онлайн-калькуляторе занимает 30 секунд,
            сама сделка — около 30 минут: проверяем компьютер при вас, деньги отдаём сразу
            наличными или переводом. Компактный корпус — отдельный плюс: Mac mini легко
            привезти к нам в офис у метро Киевская, а если некогда — отправим курьера по
            Москве. Технику с дефектами тоже принимаем, с корректировкой цены после
            диагностики.
          </p>

          <div className="mb-10">
            <h3 className="text-xl font-semibold mb-4">Mac mini — цены выкупа сегодня</h3>
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
                    <tr key={`${s.processor}-${s.ram}-${s.ssd}-${i}`} className="border-t border-border">
                      <td className="px-4 py-3">{prettyModel(s)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.ram} / {s.ssd} ГБ</td>
                      <td className="px-4 py-3">{fmt(s.median_price)} ₽</td>
                      <td className="px-4 py-3 font-semibold text-primary">{fmt(s.buyout_price)} ₽</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Точную цену для вашей конфигурации и состояния считает{' '}
              <Link className="text-primary hover:underline" href="/sell">калькулятор на странице выкупа</Link> —
              там же собраны цены на все модели Mac.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4">Что влияет на цену выкупа Mac mini?</h2>

          <h3 className="text-xl font-semibold mb-3">Чип: M1, M2 или M4</h3>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Поколение чипа — главный фактор. Mac mini на M1 (2020) до сих пор ликвиден:
            это был первый «мини» на Apple Silicon, и спрос на него стабильный, хотя цены
            уже заметно просели. Версия на M2 (2023) — переходная: на вторичке её много,
            конкуренция среди продавцов высокая. Mac mini M4 (конец 2024) — самый
            востребованный: новый компактный корпус и 16 ГБ памяти уже в базе. Кстати,
            поколения M3 у Mac mini не существует — Apple перешла с M2 сразу на M4, так
            что объявления «mini M3» на Авито — это либо ошибка, либо повод насторожиться.
            Версии Pro (M2 Pro, M4 Pro) оцениваем отдельно — они ощутимо дороже базовых.
          </p>

          <h3 className="text-xl font-semibold mb-3">Память и накопитель: почему 16 ГБ ценится</h3>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Оперативная память в Mac mini распаяна — апгрейд невозможен, поэтому
            конфигурация фиксирует цену навсегда. Базовые 8/256 у M1 и M2 — самые
            массовые на вторичке: предложений много, цены на них давят друг друга.
            А вот 16 ГБ — уже дефицитный товар среди старых поколений: за такую машину
            покупатели готовы доплачивать, и мы это учитываем в оценке. С накопителем
            логика та же: 256 ГБ — база, 512 ГБ и 1 ТБ дают заметную прибавку. Если
            не помните свою конфигурацию — откройте «Об этом Mac», там всё указано.
          </p>

          <h3 className="text-xl font-semibold mb-3">Состояние, комплект и iCloud</h3>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            У Mac mini нет экрана, клавиатуры и аккумулятора — то есть нет и типичных
            «болячек» ноутбука вроде изношенной батареи или сколов на матрице. Поэтому
            настольные «мини» держат цену лучше MacBook. Мы смотрим на корпус (вмятины,
            глубокие царапины), работу всех портов — Thunderbolt, HDMI, Ethernet, — а
            также на следы вскрытия и ремонтов. Полный комплект — коробка, оригинальный
            кабель питания, чек — добавляет к цене: такой компьютер быстрее уходит новому
            владельцу. Обязательное условие одно: выход из iCloud и отключение «Локатора».
            Компьютер с активационной блокировкой купить невозможно ни за какие деньги.
          </p>

          <h2 className="text-2xl font-bold mb-4">Куда привезти Mac mini — или вызвать курьера?</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Mac mini — самый удобный компьютер Apple для продажи: он весит меньше
            килограмма и помещается в обычный рюкзак. Никаких коробок метр на метр, как
            с iMac, и никакой упаковки с пузырчатой плёнкой. Проще всего подъехать к нам
            в офис у метро Киевская (район Дорогомилово) — диагностика и расчёт займут
            около получаса. Если вырваться не получается, отправим курьера:{' '}
            <Link className="text-primary hover:underline" href="/moskva">выезжаем по всем районам Москвы</Link>,
            оценку подтверждаем на месте, деньги — сразу при передаче. Монитор, клавиатуру
            и мышь везти не нужно — для проверки у нас всё есть.
          </p>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            Продаёте не только «мини»? Посмотрите условия по соседним категориям:{' '}
            <Link className="text-primary hover:underline" href="/sell/macbook-air">выкуп MacBook Air</Link>,{' '}
            <Link className="text-primary hover:underline" href="/sell/macbook-pro">выкуп MacBook Pro</Link>,{' '}
            <Link className="text-primary hover:underline" href="/sell/imac">выкуп iMac</Link> и{' '}
            <Link className="text-primary hover:underline" href="/sell/broken">выкуп неисправной техники Apple</Link>.
          </p>

          <h2 className="text-2xl font-bold mb-4">Как проходит выкуп Mac mini?</h2>
          <ol className="mb-4 space-y-3 list-decimal list-inside leading-relaxed text-muted-foreground">
            <li>
              <span className="text-foreground font-medium">Оценка онлайн за 30 секунд.</span>{' '}
              Выбираете чип, память и накопитель в калькуляторе — видите и рыночную
              медиану, и нашу цену. Никаких «оставьте телефон, менеджер перезвонит».
            </li>
            <li>
              <span className="text-foreground font-medium">Согласуем встречу.</span>{' '}
              Вы приезжаете в офис у Киевской или курьер подъезжает к вам — в тот же
              день или на следующий, как удобно.
            </li>
            <li>
              <span className="text-foreground font-medium">Диагностика при вас, 15–20 минут.</span>{' '}
              Осмотр корпуса, проверка портов, серийного номера, состояния SSD и выхода
              из iCloud. Всё открыто — вы видите каждый шаг.
            </li>
            <li>
              <span className="text-foreground font-medium">Деньги сразу.</span>{' '}
              Наличными или переводом на карту — в момент сделки, без «оплаты после
              проверки на складе».
            </li>
          </ol>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            Почему цена из калькулятора не «тает» при встрече? Потому что мы считаем её
            от ежедневной медианы Авито и заранее закладываем нормальный износ. Схема
            «назовём побольше, а на месте скинем треть» — классика серых скупок, и именно
            от неё мы отстраиваемся все восемь лет работы. Перед продажей полезно
            прочитать: <Link className="text-primary hover:underline" href="/blog/kak-prodat-macbook-vygodno">как продать технику Apple выгодно</Link>{' '}
            и <Link className="text-primary hover:underline" href="/blog/proverka-macbook-pered-pokupkoi">что проверяют при покупке Mac</Link> —
            подготовленный продавец получает максимум.
          </p>

          <h2 className="text-2xl font-bold mb-4">Частые вопросы о выкупе Mac mini</h2>

          <h3 className="text-lg font-semibold mb-2">Возьмёте Mac mini без коробки и кабеля?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Да. Комплект влияет на цену, но не критично: полный набор с коробкой,
            оригинальным кабелем питания и чеком добавляет к оценке, потому что такой
            компьютер быстрее продаётся. Если остался только сам блок — приносите,
            посчитаем честно: вычет за отсутствие комплекта заметно меньше, чем принято
            думать. Главное условие — чтобы компьютер был отвязан от вашего Apple ID.
          </p>

          <h3 className="text-lg font-semibold mb-2">Нужно ли стирать данные перед продажей?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Желательно, но не обязательно делать это заранее. Правильный порядок: выйти
            из iCloud в Системных настройках, отключить «Локатор» и выполнить сброс через
            «Перенос или сброс». Забыли или не уверены — не страшно: сделаем это вместе
            при встрече, займёт минут десять. Без отвязки от Apple ID сделка невозможна:
            активационная блокировка превращает Mac mini в кирпич.
          </p>

          <h3 className="text-lg font-semibold mb-2">Купите ли неисправный Mac mini?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Да. Не включается, не выводит изображение, шумит вентилятором, был залит —
            присылайте фото и описание симптомов, оценим дистанционно. Цена будет с
            корректировкой на ремонт, но честной: мы сами восстанавливаем технику и
            знаем реальную стоимость работ, а не берём вычет «с запасом». Подробности —
            на странице <Link className="text-primary hover:underline" href="/sell/broken">выкупа неисправных Mac</Link>.
          </p>

          <h3 className="text-lg font-semibold mb-2">Почему вашей цене можно верить?</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Потому что она проверяема: рядом с ценой выкупа мы всегда показываем рыночную
            медиану, посчитанную по актуальным объявлениям Авито за сегодня. Вы можете
            открыть Авито и убедиться сами. Выкуп — до 80% от этой медианы: разница
            покрывает предпродажную подготовку, гарантию покупателю и наши риски. Работаем
            официально, как ИП Капралов Р.И., — с договором и документами о сделке.
          </p>

          <h3 className="text-lg font-semibold mb-2">Сколько времени занимает продажа?</h3>
          <p className="mb-2 leading-relaxed text-muted-foreground">
            Оценка онлайн — 30 секунд, сама встреча — около 30 минут вместе с
            диагностикой и расчётом. Если напишете утром, деньги за Mac mini, как правило,
            у вас уже в тот же день. Курьерский выезд по Москве согласуем на удобное
            время — вечерние слоты после работы тоже есть.
          </p>

        </div>
      </div>
    </section>
  );
}
