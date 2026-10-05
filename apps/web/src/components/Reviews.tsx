import type { PublicReview } from "@barbershop/shared";
import type { Loaded } from "@/lib/api";
import { formatDate, plural } from "@/lib/format";
import { LoadError } from "./LoadError";
import { SectionHead } from "./SectionHead";
import { Stars } from "./Stars";

export function Reviews({ reviews }: { reviews: Loaded<PublicReview[]> }) {
  // Нет отзывов — секцию не показываем вовсе
  if (reviews.ok && reviews.data.length === 0) return null;

  return (
    <section id="reviews" className="section" aria-labelledby="reviews-title">
      <div className="container">
        <SectionHead id="reviews-title" eyebrow="Отзывы" title="Что говорят клиенты" />

        {!reviews.ok ? (
          <LoadError what="отзывы" />
        ) : (
          <>
            <ReviewsSummary reviews={reviews.data} />
            <div className="grid grid--2">
              {reviews.data.map((review) => (
                <figure key={review.id} className="card" style={{ margin: 0 }}>
                  <Stars rating={review.rating} />
                  <blockquote className="review__comment" style={{ margin: "16px 0 0" }}>
                    {review.comment}
                  </blockquote>
                  <figcaption className="review__footer">
                    <span className="avatar" aria-hidden="true">
                      {review.clientName[0]}
                    </span>
                    <div>
                      <div className="review__author">{review.clientName}</div>
                      <div className="review__meta">
                        Мастер: {review.barberName} · {formatDate(review.createdAt.slice(0, 10))}
                      </div>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ReviewsSummary({ reviews }: { reviews: PublicReview[] }) {
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return (
    <div className="reviews-summary">
      <span className="reviews-summary__value">{avg.toFixed(1)}</span>
      <div>
        <Stars rating={avg} size={20} />
        <p className="reviews-summary__label">
          {reviews.length} {plural(reviews.length, ["отзыв", "отзыва", "отзывов"])}
        </p>
      </div>
    </div>
  );
}
