import Link from "next/link";
import type { Barber } from "@barbershop/shared";
import type { Loaded } from "@/lib/api";
import { barberAccent } from "@/lib/barber";
import { plural } from "@/lib/format";
import { StarIcon } from "./Icons";
import { LoadError } from "./LoadError";
import { SectionHead } from "./SectionHead";

export function Barbers({ barbers }: { barbers: Loaded<Barber[]> }) {
  return (
    <section id="barbers" className="section section--muted" aria-labelledby="barbers-title">
      <div className="container">
        <SectionHead
          id="barbers-title"
          eyebrow="Команда"
          title="Наши барберы"
          subtitle="Выберите мастера, который подходит именно вам, или доверьтесь любому свободному."
        />
        {!barbers.ok ? (
          <LoadError what="барберов" />
        ) : (
          <div className="grid grid--barbers">
            {barbers.data.map((barber) => {
              const accent = barberAccent(barber.id);
              return (
                <article key={barber.id} className="card barber">
                  <div
                    className="barber__photo"
                    style={
                      barber.photoUrl
                        ? { backgroundImage: `url(${barber.photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : { background: `linear-gradient(150deg, ${accent}, color-mix(in srgb, ${accent} 35%, #000))` }
                    }
                    aria-hidden="true"
                  >
                    {/* Пока фото нет — первая буква имени. Загрузка фото появится в админке (этап 9) */}
                    {!barber.photoUrl && barber.name[0]}
                    {barber.rating !== null && (
                      <span className="barber__rating">
                        <StarIcon size={13} /> {barber.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="barber__body">
                    <h3 className="barber__name">{barber.name}</h3>
                    <p className="barber__meta">
                      {barber.role} · {barber.experienceYears}{" "}
                      {plural(barber.experienceYears, ["год", "года", "лет"])} опыта
                    </p>
                    <p className="barber__bio">{barber.bio}</p>
                    {barber.specialties.length > 0 && (
                      <div className="chips">
                        {barber.specialties.map((s) => (
                          <span key={s} className="chip">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link
                      href={`/book?barber=${barber.id}`}
                      className="btn btn--ghost btn--sm btn--block"
                      aria-label={`Записаться к мастеру ${barber.name}`}
                    >
                      Записаться
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
