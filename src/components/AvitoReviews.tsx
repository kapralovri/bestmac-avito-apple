import { AVITO_RATING, AVITO_REVIEWS } from '@/data/avito-reviews';

/**
 * Реальные отзывы с Авито — серверный блок доверия. Главный разрыв с
 * конкурентами по выкупу — отзывы: у нас единицы на Картах, но 250+ пятёрок
 * на Авито. Источник указан и проверяем по ссылке; разметки Review/
 * AggregateRating нет намеренно (отзывы другой площадки).
 */
function ratingsWord(n: number): string {
  const d = n % 10, dd = n % 100;
  if (d === 1 && dd !== 11) return 'оценка';
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'оценки';
  return 'оценок';
}

export default function AvitoReviews({ limit = 6 }: { limit?: number }) {
  const reviews = AVITO_REVIEWS.slice(0, limit);
  return (
    <section className="py-12" data-shared-block="reviews">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            <span className="text-amber-500">★</span> {AVITO_RATING.value} на Авито — {AVITO_RATING.count} {ratingsWord(AVITO_RATING.count)}
          </h2>
          <p className="text-muted-foreground">
            Отзывы о сделках с Романом, владельцем BestMac.{' '}
            <a href={AVITO_RATING.profileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Все отзывы на Авито →
            </a>
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((r) => (
            <figure key={`${r.name}-${r.date}`} className="bg-card border border-border/60 rounded-xl p-5">
              <div className="text-amber-500 mb-2" aria-label="5 из 5">★★★★★</div>
              <blockquote className="mb-3 leading-relaxed">«{r.text}»</blockquote>
              <figcaption className="text-sm text-muted-foreground">
                {r.name} · {r.date}
                <br />
                {r.device}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
