import { formatPhone } from "@/lib/phone";

type Props = {
  name: string;
  phone: string;
  errors: { name?: string; phone?: string };
  onChange: (field: "name" | "phone", value: string) => void;
};

export function ContactsStep({ name, phone, errors, onChange }: Props) {
  return (
    <div>
      <h2 className="step__title">Ваши контакты</h2>
      <p className="step__hint">Нужны только чтобы подтвердить запись. Никакого спама.</p>

      <div className="form">
        <label className="field">
          <span className="field__label">Имя</span>
          <input
            className="field__input"
            type="text"
            name="name"
            autoComplete="given-name"
            placeholder="Как к вам обращаться"
            value={name}
            maxLength={60}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            onChange={(e) => onChange("name", e.target.value)}
          />
          {errors.name && (
            <span className="field__error" id="name-error">
              {errors.name}
            </span>
          )}
        </label>

        <label className="field">
          <span className="field__label">Телефон</span>
          <input
            className="field__input"
            type="tel"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+998 90 123-45-67"
            value={formatPhone(phone)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            onChange={(e) => onChange("phone", e.target.value)}
          />
          {errors.phone && (
            <span className="field__error" id="phone-error">
              {errors.phone}
            </span>
          )}
        </label>
      </div>
    </div>
  );
}
