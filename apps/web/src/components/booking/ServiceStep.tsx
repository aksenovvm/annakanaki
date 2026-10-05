import { formatDuration, formatPrice } from "@/lib/format";
import { CheckIcon, ClockIcon } from "../Icons";
import { useCatalog } from "./catalog";

type Props = {
  selected: string[];
  onToggle: (serviceId: string) => void;
};

export function ServiceStep({ selected, onToggle }: Props) {
  const { services } = useCatalog();
  return (
    <div>
      <h2 className="step__title">Выберите услугу</h2>
      <p className="step__hint">Можно выбрать несколько — время и цена сложатся.</p>
      {services.length === 0 && (
        <div className="state">
          <p className="state__title">Пока нет доступных услуг</p>
          <p className="state__text">Позвоните нам — запишем по телефону.</p>
        </div>
      )}
      <div className="options">
        {services.map((service) => {
          const isSelected = selected.includes(service.id);
          return (
            <button
              key={service.id}
              type="button"
              className="option"
              aria-pressed={isSelected}
              onClick={() => onToggle(service.id)}
            >
              <span className="option__check" aria-hidden="true">
                {isSelected && <CheckIcon size={14} />}
              </span>
              <span className="option__body">
                <span className="option__title">{service.name}</span>
                <span className="option__text">{service.description}</span>
                <span className="option__meta">
                  <strong>{formatPrice(service.price)}</strong>
                  <span className="service__duration">
                    <ClockIcon size={14} />
                    {formatDuration(service.durationMin)}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
