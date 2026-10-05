import { barberAccent, canDoAll } from "@/lib/barber";
import { formatPrice, formatPriceRange, plural } from "@/lib/format";
import { CheckIcon, StarIcon, UsersIcon } from "../Icons";
import { useCatalog } from "./catalog";
import { totalsForBarber } from "./summary";

type Props = {
  serviceIds: string[];
  selected: string | null;
  onSelect: (barberId: string) => void;
};

export function BarberStep({ serviceIds, selected, onSelect }: Props) {
  const catalog = useCatalog();
  const { barbers } = catalog;
  const suitable = barbers.filter((b) => canDoAll(b, serviceIds));
  const prices = suitable.map((b) => totalsForBarber(b, serviceIds, catalog).price);
  const unsuitable = barbers.filter((b) => !suitable.includes(b));

  return (
    <div>
      <h2 className="step__title">Выберите барбера</h2>
      <p className="step__hint">Показываем мастеров, которые выполняют все выбранные услуги.</p>

      {suitable.length === 0 ? (
        <div className="state">
          <p className="state__title">Нет мастера на все выбранные услуги</p>
          <p className="state__text">Вернитесь на шаг назад и уберите одну из услуг.</p>
        </div>
      ) : (
        <div className="options options--barbers">
          <button
            type="button"
            className="option option--barber"
            aria-pressed={selected === "any"}
            onClick={() => onSelect("any")}
          >
            <span className="barber-avatar barber-avatar--any" aria-hidden="true">
              <UsersIcon size={22} />
            </span>
            <span className="option__body">
              <span className="option__title">Любой свободный</span>
              <span className="option__text">Подберём мастера на удобное вам время</span>
              {prices.length > 0 && (
                <span className="option__meta-row">
                  <strong>{formatPriceRange({ min: Math.min(...prices), max: Math.max(...prices) })}</strong>
                </span>
              )}
            </span>
            <span className="option__check" aria-hidden="true">
              {selected === "any" && <CheckIcon size={14} />}
            </span>
          </button>

          {suitable.map((barber) => (
            <button
              key={barber.id}
              type="button"
              className="option option--barber"
              aria-pressed={selected === barber.id}
              onClick={() => onSelect(barber.id)}
            >
              <span className="barber-avatar" style={{ background: barberAccent(barber.id) }} aria-hidden="true">
                {barber.name[0]}
              </span>
              <span className="option__body">
                <span className="option__title">{barber.name}</span>
                <span className="option__text">
                  {barber.role} · {barber.experienceYears}{" "}
                  {plural(barber.experienceYears, ["год", "года", "лет"])}
                </span>
                <span className="option__meta-row">
                  <strong>{formatPrice(totalsForBarber(barber, serviceIds, catalog).price)}</strong>
                  {barber.rating !== null && (
                    <span className="option__rating">
                      <StarIcon size={13} /> {barber.rating.toFixed(1)}
                    </span>
                  )}
                </span>
              </span>
              <span className="option__check" aria-hidden="true">
                {selected === barber.id && <CheckIcon size={14} />}
              </span>
            </button>
          ))}
        </div>
      )}

      {suitable.length > 0 && unsuitable.length > 0 && (
        <p className="step__footnote">
          Не выполняют выбранные услуги: {unsuitable.map((b) => b.name).join(", ")}.
        </p>
      )}
    </div>
  );
}
