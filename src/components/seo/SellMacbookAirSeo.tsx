import Link from 'next/link';
import type { AvitoPricesData, AvitoPriceStat } from '@/types/avito-prices';

/**
 * Серверный SEO-блок страницы /sell/macbook-air: цены выкупа MacBook Air
 * из avito-prices.json (пересчитываются ежедневно по объявлениям Авито).
 * Рендерится на сервере — таблица и текст попадают в HTML для поисковиков
 * и AI-ассистентов. Без "use client".
 */

const fmt = (n: number) => n.toLocaleString('ru-RU');

const fmtDate = (s?: string) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' :
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

function airConfigs(stats: AvitoPriceStat[], limit: number): AvitoPriceStat[] {
  return stats
    .filter((s) => s.family === 'MacBook' && s.model_name.includes('Air')
      && s.median_price > 0 && s.buyout_price > 0
      && (s.samples_count || 0) >= 3 && s.ram > 0 && s.ssd > 0)
    .sort((a, b) => (b.samples_count || 0) - (a.samples_count || 0))
    .slice(0, limit);
}

export default function SellMacbookAirSeo({ data }: { data: AvitoPricesData }) {
  const rows = airConfigs(data.stats || [], 12);
  const updated = fmtDate(data.generated_at);
  const total = data.total_listings || 0;
  const minBuyout = rows.length ? Math.min(...rows.map((r) => r.buyout_price)) : 0;

  return (
    <section className="bg-background text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Сколько стоит продать MacBook Air сегодня</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {updated && <>Данные обновлены {updated}. </>}
            Расчёт по {total > 0 ? fmt(total) : '3 000+'} актуальным объявлениям Авито (Москва).
          </p>

          {/* Answer-first: самодостаточный цитируемый абзац */}
          <p className="mb-8 leading-relaxed">
            Продать MacBook Air в Москве сегодня можно{' '}
            {minBuyout > 0 ? <>от {fmt(minBuyout)} ₽ за базовый M1 и</> : <>по цене</>}{' '}
            до 80% рыночной медианы за свежие M4 — точные суммы по популярным конфигурациям
            собраны в таблице ниже. Цены не «из головы»: мы каждый день пересчитываем их по
            трём с лишним тысячам реальных объявлений Авито, поэтому таблица отражает рынок
            именно на сегодня. Оценка в онлайн-калькуляторе занимает 30 секунд, сделка при
            встрече — около 30 минут: диагностика проходит при вас, деньги отдаём наличными
            или переводом сразу после проверки. Названная сумма не «тает» после осмотра:
            если ноутбук соответствует описанию, вы получаете ровно столько, сколько увидели
            в оценке. На итог влияют износ аккумулятора (количество циклов), состояние
            корпуса и экрана, комплект — коробка, зарядка, чек — и отвязка от iCloud.
            Air с дефектами — разбитым экраном или уставшей батареей — тоже выкупаем,
            честно скорректировав цену. Работает выезд по Москве в день обращения,
            офис — у метро Киевская, район Дорогомилово.
          </p>

          <div className="mb-10">
            <h3 className="text-xl font-semibold mb-4">MacBook Air — цены выкупа по конфигурациям</h3>
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

          <h2 className="text-2xl font-bold mb-4">Что влияет на цену MacBook Air</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            За восемь лет выкупа мы разобрали сотни Air и точно знаем, где эта серия теряет
            деньги. Первое — аккумулятор. Air охлаждается пассивно, без вентилятора, и в
            тонком корпусе батарея живёт напряжённее, чем в Pro: у машин, которые годами
            работали от розетки на максимальной яркости, износ виден сразу. Смотрим не на
            проценты в настройках, а на количество циклов перезарядки: до трёхсот — почти
            новый, за восемьсот — закладываем в цену будущую замену батареи. Проверить
            циклы можно самостоятельно: «Об этом Mac» → «Отчёт о системе» → «Электропитание».
          </p>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Второе — корпус и экран. Алюминий Air мягкий: вмятины на углах и потёртости у
            трекпада встречаются часто и снижают оценку умеренно, а вот скол на матрице или
            пятна от отпечатков клавиш на антибликовом покрытии — уже серьёзный минус.
            Третье — комплект. Коробка, оригинальный блок питания и чек прибавляют к сумме
            заметно: такой ноутбук мы продадим быстрее и дороже, поэтому готовы поделиться
            разницей с вами. И обязательное условие любой сделки — выход из iCloud и
            отключение «Локатора» при нас: ноутбук с активной привязкой не купит ни один
            честный скупщик.
          </p>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            Отдельная история — память. Конфигурации с 8 ГБ ОЗУ дешевеют быстрее: после
            выхода Apple Intelligence рынок массово пересел на 16 ГБ, и покупатели
            вторички это уже поняли. Если у вас Air с 16 ГБ — он держит цену ощутимо
            лучше базового, что видно и по таблице выше. Объём SSD влияет слабее, но
            256 ГБ против 512 ГБ — это всё же разные деньги.
          </p>

          <h2 className="text-2xl font-bold mb-4">Какие поколения MacBook Air мы выкупаем</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Берём все Air на Apple Silicon — от M1 2020 года до актуальных M4 2025 года,
            в корпусах 13 и 15 дюймов. Air — самая массовая серия Mac и самый ликвидный
            товар на вторичке: объявлений много, спрос стабильный, поэтому и цены выкупа
            по ней у нас самые предсказуемые. M1 до сих пор охотно покупают студенты и
            те, кому ноутбук нужен «для всего по чуть-чуть», — но это уже нижний сегмент
            рынка. M2 принёс новый плоский корпус и экран без толстых рамок, M3 добавил
            производительности, а M4 с 16 ГБ памяти в базе — сейчас самая востребованная
            конфигурация: за неё мы платим максимум по серии.
          </p>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            Честно про Intel: MacBook Air 2017–2020 годов на процессорах Intel мы не
            выкупаем. Спрос на них практически умер — новые версии macOS их не поддерживают,
            и перепродать такой ноутбук с гарантией мы не сможем. Если у вас Intel-Air,
            выгоднее продать его самостоятельно на Авито или отдать на запчасти — говорим
            как есть, чтобы не тратить ваше время на заведомо низкую оценку.
          </p>

          <h2 className="text-2xl font-bold mb-4">Как проходит выкуп MacBook Air</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Сначала — оценка онлайн: выбираете модель, конфигурацию и состояние в{' '}
            <Link className="text-primary hover:underline" href="/sell">калькуляторе на странице выкупа</Link>,
            через 30 секунд видите сумму. Дальше договариваемся о встрече: приезжайте в
            офис у метро Киевская или вызывайте нас — выезжаем по всей Москве. При встрече
            проводим диагностику при вас: проверяем циклы аккумулятора, матрицу на битые
            пиксели и засветы, клавиатуру, порты, динамики, состояние корпуса и отвязку
            от iCloud. Занимает это около 30 минут.
          </p>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            Если всё соответствует заявленному — сразу расчёт: наличные или перевод на
            карту, по вашему выбору. Если при проверке нашлось то, о чём вы не знали, —
            например, батарея изношена сильнее, чем казалось, — называем новую цену с
            объяснением, почему именно столько, и решение остаётся за вами: никакого
            давления, ноутбук ваш до момента, пока вы не согласились. Работаем официально
            как ИП Капралов Р.И., при желании оформляем документы о сделке. Перед встречей
            советуем сделать резервную копию и выйти из всех учётных записей — как это
            сделать, разобрали в статье{' '}
            <Link className="text-primary hover:underline" href="/blog/kak-prodat-macbook-vygodno">о выгодной продаже MacBook</Link>.
          </p>

          <h2 className="text-2xl font-bold mb-4">Частые вопросы о выкупе MacBook Air</h2>

          <h3 className="text-xl font-semibold mb-2">Сколько циклов аккумулятора — это ещё «хорошо» для Air?</h3>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Ресурс батареи Air на Apple Silicon — примерно тысяча циклов до заметной
            деградации. До трёхсот циклов мы считаем состояние отличным, триста—шестьсот —
            нормальным рабочим, дальше начинаем закладывать в цену стоимость замены.
            Посмотреть свой счётчик можно без программ: «Об этом Mac» → «Отчёт о системе» →
            раздел «Электропитание», строка «Количество циклов перезарядки».
          </p>

          <h3 className="text-xl font-semibold mb-2">Выкупаете ли Air с 8 ГБ оперативной памяти?</h3>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Да, конечно — 8-гигабайтные M1 и M2 остаются самыми массовыми Air на вторичке,
            и спрос на них есть. Но честно предупреждаем: такие конфигурации дешевеют
            быстрее, чем версии с 16 ГБ, и разрыв со временем растёт. Если думаете
            продавать — лучше не тянуть: каждый месяц ожидания стоит денег именно
            владельцам базовых конфигураций.
          </p>

          <h3 className="text-xl font-semibold mb-2">Можно ли продать MacBook Air без коробки и чека?</h3>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Можно. Коробка, оригинальная зарядка и чек увеличивают оценку, потому что
            полный комплект проще перепродать, но их отсутствие — не препятствие. Главное
            для нас — юридическая чистота: ноутбук должен быть отвязан от iCloud, а выход
            из учётной записи вы делаете при нас. Паспорт продавца нужен для оформления
            сделки — это защита и для вас, и для нас.
          </p>

          <h3 className="text-xl font-semibold mb-2">Почему цена не меняется «после осмотра»?</h3>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Потому что оценка изначально строится на реальных рыночных данных, а не на
            приманке. Классическая схема скупок — назвать красивую цифру по телефону и
            срезать треть при встрече под предлогом «микроцарапин». Нам это не нужно: вы
            заранее видите и медиану рынка, и нашу цену. Пересмотр возможен только при
            реальном расхождении с описанием — и всегда с объяснением.
          </p>

          <h3 className="text-xl font-semibold mb-2">Возьмёте Air с разбитым экраном или вздутой батареей?</h3>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Возьмём. Мы выкупаем Air с треснувшей матрицей, изношенной или вздутой
            батареей, залитой клавиатурой и следами ремонта — с корректировкой цены на
            стоимость восстановления. Вздутый аккумулятор, кстати, повод не откладывать:
            он давит на корпус и трекпад, и чем дольше ждать, тем дороже ремонт. Детали —
            на странице <Link className="text-primary hover:underline" href="/sell/broken">выкупа неисправных MacBook</Link>.
          </p>

          <h3 className="text-xl font-semibold mb-3">Смотрите также</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 list-none">
            <li><Link className="text-primary hover:underline" href="/sell">Калькулятор и все цены выкупа Mac</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/macbook-pro">Выкуп MacBook Pro (13–16″)</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/imac">Выкуп iMac</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/mac-mini">Выкуп Mac mini</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/broken">Выкуп неисправных MacBook</Link></li>
            <li><Link className="text-primary hover:underline" href="/moskva">Выезд по районам Москвы</Link></li>
          </ul>
          <p className="leading-relaxed text-muted-foreground">
            Перед продажей полезно прочитать: <Link className="text-primary hover:underline" href="/blog/proverka-macbook-pered-pokupkoi">как проверяют MacBook при покупке</Link> —
            там весь чек-лист, по которому пройдёт и ваш Air на диагностике.
          </p>
        </div>
      </div>
    </section>
  );
}
