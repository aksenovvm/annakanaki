import Link from "next/link";
import { barbers } from "@/data/mock";
import { plural } from "@/lib/format";
import { StarIcon } from "./Icons";
import { SectionHead } from "./SectionHead";

export function Barbers() {
  return (
    <section id="barbers" className="section section--muted" aria-labelledby="barbers-title">
      <div className="container">
        <SectionHead
          id="barbers-title"
          eyebrow="Команда"
          title="Наши барберы"
          subtitle="Выберите мастера, который подходит именно вам, или доверьтесь любому свободному."
        />
        <div className="grid grid--barbers">
          {barbers.map((barber) => (
            <article key={barber.id} className="card barber">
              {/* Заглушка вместо фото: на этапе 9 фото будут загружаться в Supabase Storage */}
              <div
                className="barber__photo"
                style={{
                  background: `linear-gradient(150deg, ${barber.accent}, color-mix(in srgb, ${barber.accent} 35%, #000))`,
                }}
                aria-hidden="true"
              >
                {barber.name[0]}
                <span className="barber__rating">
                  <StarIcon size={13} /> {barber.rating.toFixed(1)}
                </span>
              </div>
              <div className="barber__body">
                <h3 className="barber__name">{barber.name}</h3>
                <p className="barber__meta">
                  {barber.role} · {barber.experienceYears}{" "}
                  {plural(barber.experienceYears, ["год", "года", "лет"])} опыта
                </p>
                <p className="barber__bio">{barber.bio}</p>
                <div className="chips">
                  {barber.specialties.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/book?barber=${barber.id}`}
                  className="btn btn--ghost btn--sm btn--block"
                  aria-label={`Записаться к мастеру ${barber.name}`}
                >
                  Записаться
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
