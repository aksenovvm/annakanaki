import { reviews } from "@/data/mock";
import { formatDate, plural } from "@/lib/format";
import { SectionHead } from "./SectionHead";
import { Stars } from "./Stars";

export function Reviews() {
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section id="reviews" className="section" aria-labelledby="reviews-title">
      <div className="container">
        <SectionHead id="reviews-title" eyebrow="Отзывы" title="Что говорят клиенты" />

        <div className="reviews-summary">
          <span className="reviews-summary__value">{avg.toFixed(1)}</span>
          <div>
            <Stars rating={avg} size={20} />
            <p className="reviews-summary__label">
              {reviews.length} {plural(reviews.length, ["отзыв", "отзыва", "отзывов"])}
            </p>
          </div>
        </div>

        <div className="grid grid--2">
          {reviews.map((review) => (
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
                    Мастер: {review.barberName} · {formatDate(review.date)}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
