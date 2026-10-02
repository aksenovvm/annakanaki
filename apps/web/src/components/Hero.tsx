import Link from "next/link";
import { barbers, reviews, shop } from "@/data/mock";
import { ScissorsIcon, StarIcon } from "./Icons";

export function Hero() {
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const maxExperience = Math.max(...barbers.map((b) => b.experienceYears));
  const stats = [
    { value: barbers.length, label: "мастера в команде" },
    { value: `${maxExperience}+`, label: "лет опыта" },
    { value: avgRating.toFixed(1), label: "средняя оценка" },
  ];

  return (
    <section className="hero">
      <div className="container hero__grid">
        <div>
          <span className="hero__badge">
            <StarIcon size={14} /> {avgRating.toFixed(1)} · отзывы клиентов
          </span>
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
          <div className="hero__stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="hero__stat-value">{stat.value}</div>
                <div className="hero__stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
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
