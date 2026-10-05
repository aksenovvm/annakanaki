import Link from "next/link";
import type { Barber } from "@barbershop/shared";
import { shop } from "@/data/shop";
import type { Loaded } from "@/lib/api";
import { plural } from "@/lib/format";
import { ScissorsIcon, StarIcon } from "./Icons";

/** Средняя оценка по всем отзывам: рейтинг каждого мастера с весом «число его отзывов» */
function overallRating(barbers: Barber[]): number | null {
  const total = barbers.reduce((sum, b) => sum + b.reviewsCount, 0);
  if (total === 0) return null;
  return barbers.reduce((sum, b) => sum + (b.rating ?? 0) * b.reviewsCount, 0) / total;
}

export function Hero({ barbers }: { barbers: Loaded<Barber[]> }) {
  const list = barbers.ok ? barbers.data : [];
  const avgRating = overallRating(list);
  const stats =
    list.length > 0
      ? [
          { value: list.length, label: plural(list.length, ["мастер", "мастера", "мастеров"]) + " в команде" },
          { value: `${Math.max(...list.map((b) => b.experienceYears))}+`, label: "лет опыта" },
          ...(avgRating !== null ? [{ value: avgRating.toFixed(1), label: "средняя оценка" }] : []),
        ]
      : [];

  return (
    <section className="hero">
      <div className="container hero__grid">
        <div>
          {avgRating !== null && (
            <span className="hero__badge">
              <StarIcon size={14} /> {avgRating.toFixed(1)} · отзывы клиентов
            </span>
          )}
          <h1 className="hero__title">
            Стрижка, после которой <em>хочется вернуться</em>
          </h1>
          <p className="hero__text">
            {shop.tagline}. Выберите услугу, мастера и удобное время — запись занимает меньше минуты.
          </p>
          <div className="hero__actions">
            <Link href="/book" className="btn btn--primary">
              Записаться онлайн
            </Link>
            <Link href="/#services" className="btn btn--ghost">
              Услуги и цены
            </Link>
          </div>
          {stats.length > 0 && (
            <div className="hero__stats">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="hero__stat-value">{stat.value}</div>
                  <div className="hero__stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hero__visual" aria-hidden="true">
          <div className="hero__visual-icon">
            <ScissorsIcon size={160} />
          </div>
          <div className="hero__visual-card">
            <span className="pulse" />
            <div>
              <strong>Открыто каждый день</strong>
              <span>
                {shop.hours.map((h) => `${h.days} ${h.time}`).join(" · ")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
