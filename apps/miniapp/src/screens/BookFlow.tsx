import { useCallback, useRef, useState } from "react";
import { formatDuration, formatFullDate, formatPrice, formatPriceRange, plural } from "@barbershop/shared/format";
import { formatPhone, isValidPhone, phoneDigits, toE164 } from "@barbershop/shared/phone";
import type { Booking, Slot } from "@barbershop/shared";
import { ApiError, api, errorText } from "../api";
import { BackButton, MainButton } from "../buttons";
import { canDoAll, priceRange, totalsFor, type Catalog } from "../catalog";
import { haptic } from "../telegram";
import { DateTimePicker } from "./DateTimePicker";

type Draft = {
  serviceIds: string[];
  barberId: string | null;
  date: string | null;
  slot: Slot | null;
  name: string;
  /** только цифры после +998, необязательно */
  phone: string;
};

const STEP_TITLES = ["Услуга", "Барбер", "Дата и время", "Подтверждение"];

type Props = {
  catalog: Catalog;
  defaultName: string;
  defaultPhone: string | null;
  onBooked: (booking: Booking) => void;
};

/** Запись в Mini App: те же шаги и тот же API, что на сайте */
export function BookFlow({ catalog, defaultName, defaultPhone, onBooked }: Props) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    serviceIds: [],
    barberId: null,
    date: null,
    slot: null,
    name: defaultName,
    phone: defaultPhone ? phoneDigits(defaultPhone) : "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const submittingRef = useRef(false);

  const update = useCallback((patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const onDate = useCallback((date: string) => update({ date, slot: null }), [update]);
  const onSlot = useCallback((slot: Slot) => update({ slot }), [update]);

  const barber = catalog.barbers.find((b) => b.id === draft.barberId);
  const suitable = catalog.barbers.filter((b) => canDoAll(b, draft.serviceIds));
  const nameOk = draft.name.trim().length >= 2;
  const phoneOk = draft.phone === "" || isValidPhone(draft.phone);

  function toggleService(id: string) {
    haptic.select();
    setDraft((d) => {
      const serviceIds = d.serviceIds.includes(id) ? d.serviceIds.filter((x) => x !== id) : [...d.serviceIds, id];
      const current = catalog.barbers.find((b) => b.id === d.barberId);
      const keepBarber = !current || canDoAll(current, serviceIds);
      return { ...d, serviceIds, barberId: keepBarber ? d.barberId : null, slot: null };
    });
  }

  async function submit() {
    if (submittingRef.current || !draft.slot || !draft.barberId) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await api.createBooking({
        serviceIds: draft.serviceIds,
        barberId: draft.barberId,
        startsAt: draft.slot.startsAt,
        client: { name: draft.name.trim(), ...(draft.phone ? { phone: toE164(draft.phone) } : {}) },
      });
      haptic.success();
      onBooked(booking);
    } catch (e) {
      haptic.error();
      setError({ code: e instanceof ApiError ? e.code : "UNKNOWN", message: errorText(e) });
      if (e instanceof ApiError && e.code === "SLOT_TAKEN") {
        // Время заняли, пока человек подтверждал — возвращаем к выбору времени со свежими слотами
        update({ slot: null });
        setRefreshKey((k) => k + 1);
        setStep(2);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const back = () => (setError(null), setStep((s) => Math.max(0, s - 1)));

  const priceText = barber
    ? formatPrice(totalsFor(barber, draft.serviceIds, catalog).price)
    : formatPriceRange(priceRange(draft.serviceIds, catalog));

  return (
    <div className="screen">
      {step > 0 && <BackButton onClick={back} />}
      <p className="step-label">
        Шаг {step + 1} из {STEP_TITLES.length} · {STEP_TITLES[step]}
      </p>

      {error && (
        <div className="notice notice--error" role="alert">
          {error.code === "SLOT_TAKEN" ? "Это время только что заняли. Выберите другое." : error.message}
        </div>
      )}

      {step === 0 && (
        <>
          <h1>Выберите услугу</h1>
          <p className="hint">Можно несколько — время и цена сложатся.</p>
          <div className="list">
            {catalog.services.map((s) => (
              <button
                key={s.id}
                type="button"
                className="row"
                aria-pressed={draft.serviceIds.includes(s.id)}
                onClick={() => toggleService(s.id)}
              >
                <span className="check" aria-hidden="true" />
                <span className="row__body">
                  <span className="row__title">{s.name}</span>
                  <span className="row__text">{s.description}</span>
                </span>
                <span className="row__side">
                  <strong>{formatPrice(s.price)}</strong>
                  <span className="hint">{formatDuration(s.durationMin)}</span>
                </span>
              </button>
            ))}
          </div>
          <MainButton text="Далее" disabled={draft.serviceIds.length === 0} onClick={() => setStep(1)} />
        </>
      )}

      {step === 1 && (
        <>
          <h1>Выберите барбера</h1>
          {suitable.length === 0 ? (
            <p className="notice">Нет мастера, который делает все выбранные услуги. Вернитесь и уберите одну.</p>
          ) : (
            <div className="list">
              <button
                type="button"
                className="row"
                aria-pressed={draft.barberId === "any"}
                onClick={() => (haptic.select(), update({ barberId: "any", slot: null }))}
              >
                <span className="avatar avatar--any" aria-hidden="true">
                  ★
                </span>
                <span className="row__body">
                  <span className="row__title">Любой свободный</span>
                  <span className="row__text">Подберём мастера на удобное время</span>
                </span>
                <span className="row__side">
                  <strong>{formatPriceRange(priceRange(draft.serviceIds, catalog))}</strong>
                </span>
              </button>
              {suitable.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="row"
                  aria-pressed={draft.barberId === b.id}
                  onClick={() => (haptic.select(), update({ barberId: b.id, slot: null }))}
                >
                  <span className="avatar" aria-hidden="true">
                    {b.name[0]}
                  </span>
                  <span className="row__body">
                    <span className="row__title">{b.name}</span>
                    <span className="row__text">
                      {b.role} · {b.experienceYears} {plural(b.experienceYears, ["год", "года", "лет"])}
                      {b.rating !== null && ` · ★ ${b.rating.toFixed(1)}`}
                    </span>
                  </span>
                  <span className="row__side">
                    <strong>{formatPrice(totalsFor(b, draft.serviceIds, catalog).price)}</strong>
                  </span>
                </button>
              ))}
            </div>
          )}
          <MainButton text="Далее" disabled={!draft.barberId} onClick={() => setStep(2)} />
        </>
      )}

      {step === 2 && draft.barberId && (
        <>
          <h1>Дата и время</h1>
          <DateTimePicker
            serviceIds={draft.serviceIds}
            barberId={draft.barberId}
            date={draft.date}
            startsAt={draft.slot?.startsAt ?? null}
            onDate={onDate}
            onSlot={onSlot}
            refreshKey={refreshKey}
          />
          <MainButton
            text={draft.slot ? `Далее · ${draft.slot.time}` : "Выберите время"}
            disabled={!draft.slot}
            onClick={() => (setError(null), setStep(3))}
          />
        </>
      )}

      {step === 3 && draft.slot && draft.date && (
        <>
          <h1>Проверьте запись</h1>
          <div className="card">
            <dl className="summary">
              <dt>Когда</dt>
              <dd className="capitalize">
                {formatFullDate(draft.date)}, {draft.slot.time}
              </dd>
              <dt>Барбер</dt>
              <dd>{barber?.name ?? "Любой свободный"}</dd>
              <dt>Услуги</dt>
              <dd>
                {catalog.services
                  .filter((s) => draft.serviceIds.includes(s.id))
                  .map((s) => s.name)
                  .join(", ")}
              </dd>
              <dt>Итого</dt>
              <dd>
                <strong>{priceText}</strong>
              </dd>
            </dl>
          </div>

          <label className="field">
            <span>Имя</span>
            <input
              value={draft.name}
              maxLength={60}
              autoComplete="given-name"
              onChange={(e) => update({ name: e.target.value })}
              aria-invalid={!nameOk}
            />
            {!nameOk && <small className="field__error">Минимум 2 буквы</small>}
          </label>
          <label className="field">
            <span>Телефон — необязательно</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+998 90 123-45-67"
              value={formatPhone(draft.phone)}
              onChange={(e) => update({ phone: phoneDigits(e.target.value) })}
              aria-invalid={!phoneOk}
            />
            {!phoneOk && <small className="field__error">Номер полностью: +998 и 9 цифр — или оставьте пустым</small>}
          </label>
          <p className="hint">После записи она появится во вкладке «Мои записи».</p>

          <MainButton text="Записаться" disabled={!nameOk || !phoneOk} loading={submitting} onClick={submit} />
        </>
      )}
    </div>
  );
}
