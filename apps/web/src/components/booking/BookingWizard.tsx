"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { canDoAll } from "@/lib/barber";
import { formatDurationRange, formatPriceRange } from "@/lib/format";
import type { Slot } from "@barbershop/shared";
import { ApiError, createBooking } from "@/lib/apiClient";
import { isValidPhone, phoneDigits, toE164 } from "@/lib/phone";
import { ArrowLeftIcon } from "../Icons";
import { BarberStep } from "./BarberStep";
import { BookingSummary } from "./BookingSummary";
import { CatalogProvider, type Catalog } from "./catalog";
import { ConfirmStep, type SubmitError } from "./ConfirmStep";
import { ContactsStep } from "./ContactsStep";
import { DateTimeStep } from "./DateTimeStep";
import { ServiceStep } from "./ServiceStep";
import { Spinner } from "./StatusViews";
import { summarize } from "./summary";
import { emptyDraft, STEPS, type BookingDraft } from "./types";

const STEP_SERVICE = 0;
const STEP_BARBER = 1;
const STEP_DATETIME = 2;
const STEP_CONTACTS = 3;
const STEP_CONFIRM = 4;

function validateContacts(draft: BookingDraft) {
  const errors: { name?: string; phone?: string } = {};
  if (draft.name.trim().length < 2) errors.name = "Введите имя — хотя бы 2 буквы";
  if (!isValidPhone(draft.phone)) errors.phone = "Введите номер полностью: +998 и 9 цифр";
  return errors;
}

/** Начальное состояние из ссылки: /book?barber=<id> или /book?service=<id> */
function draftFromParams(params: URLSearchParams, { services, barbers }: Catalog): { draft: BookingDraft; step: number } {
  const draft = { ...emptyDraft };
  const serviceId = params.get("service");
  if (serviceId && services.some((s) => s.id === serviceId)) draft.serviceIds = [serviceId];
  const barberId = params.get("barber");
  if (barberId && barbers.some((b) => b.id === barberId)) draft.barberId = barberId;
  return { draft, step: draft.serviceIds.length > 0 ? STEP_BARBER : STEP_SERVICE };
}

export function BookingWizard({ catalog }: { catalog: Catalog }) {
  const params = useSearchParams();
  const router = useRouter();

  const [initial] = useState(() => draftFromParams(params, catalog));
  const [draft, setDraft] = useState<BookingDraft>(initial.draft);
  const [step, setStep] = useState(initial.step);
  const [contactErrors, setContactErrors] = useState<{ name?: string; phone?: string }>({});
  const [showContactErrors, setShowContactErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  /** Увеличиваем, чтобы шаг «Дата и время» заново загрузил свободное время */
  const [slotsRefresh, setSlotsRefresh] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // При смене шага возвращаемся к началу формы — важно на телефоне.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  const update = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  function toggleService(serviceId: string) {
    setDraft((d) => {
      const serviceIds = d.serviceIds.includes(serviceId)
        ? d.serviceIds.filter((id) => id !== serviceId)
        : [...d.serviceIds, serviceId];
      // Если выбранный мастер не делает новый набор услуг — сбрасываем его выбор.
      const barber = catalog.barbers.find((b) => b.id === d.barberId);
      const barberStillOk = !barber || canDoAll(barber, serviceIds);
      return { ...d, serviceIds, barberId: barberStillOk ? d.barberId : null, time: null, startsAt: null };
    });
  }

  const onDateChange = useCallback((date: string) => update({ date, time: null, startsAt: null }), [update]);
  const onSlotChange = useCallback((slot: Slot) => update({ time: slot.time, startsAt: slot.startsAt }), [update]);

  function onContactChange(field: "name" | "phone", value: string) {
    const next = { ...draft, [field]: field === "phone" ? phoneDigits(value) : value };
    setDraft(next);
    if (showContactErrors) setContactErrors(validateContacts(next));
  }

  const canProceed = [
    draft.serviceIds.length > 0,
    draft.barberId !== null,
    draft.startsAt !== null,
    true, // контакты проверяем по нажатию «Далее», чтобы показать понятные ошибки
    !submitting,
  ][step];

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await createBooking({
        serviceIds: draft.serviceIds,
        barberId: draft.barberId!,
        startsAt: draft.startsAt!,
        client: { name: draft.name.trim(), phone: toE164(draft.phone) },
      });
      // Запись сохранена — открываем её страницу (там же отмена и перенос)
      router.push(`/booking/${booking.manageToken}?created=1`);
    } catch (e) {
      setSubmitError(
        e instanceof ApiError
          ? { code: e.code, message: e.message }
          : { code: "UNKNOWN", message: "Не получилось создать запись. Попробуйте ещё раз." },
      );
      setSubmitting(false);
    }
  }

  function next() {
    if (!canProceed) return;
    if (step === STEP_CONTACTS) {
      const errors = validateContacts(draft);
      setContactErrors(errors);
      setShowContactErrors(true);
      if (Object.keys(errors).length > 0) return;
    }
    if (step === STEP_CONFIRM) {
      void submit();
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    setSubmitError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function pickAnotherTime() {
    setSubmitError(null);
    update({ time: null, startsAt: null });
    setSlotsRefresh((k) => k + 1); // время могло измениться — загрузим заново
    setStep(STEP_DATETIME);
  }

  const totals = summarize(draft, catalog);
  const nextLabel = step === STEP_CONFIRM ? "Записаться" : "Далее";
  const nextButton = (extraClass = "") => (
    <button
      type="button"
      className={`btn btn--primary ${extraClass}`}
      onClick={next}
      disabled={!canProceed}
      aria-busy={submitting}
    >
      {submitting ? (
        <>
          <Spinner /> Записываем…
        </>
      ) : (
        nextLabel
      )}
    </button>
  );

  return (
    <CatalogProvider catalog={catalog}>
      <div className="booking container" ref={topRef}>
        <ol className="stepper" aria-label="Шаги записи">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className="stepper__item"
              data-state={i < step ? "done" : i === step ? "current" : "todo"}
              aria-current={i === step ? "step" : undefined}
            >
              <span className="stepper__dot">{i + 1}</span>
              <span className="stepper__label">{label}</span>
            </li>
          ))}
        </ol>
        <p className="stepper-caption">
          Шаг {step + 1} из {STEPS.length} · {STEPS[step]}
        </p>

        <div className="booking__layout">
          <section className="booking__main" aria-live="polite">
            {step > STEP_SERVICE && (
              <button type="button" className="back-link" onClick={back} disabled={submitting}>
                <ArrowLeftIcon size={18} /> Назад
              </button>
            )}

            {step === STEP_SERVICE && <ServiceStep selected={draft.serviceIds} onToggle={toggleService} />}
            {step === STEP_BARBER && (
              <BarberStep
                serviceIds={draft.serviceIds}
                selected={draft.barberId}
                onSelect={(barberId) => update({ barberId, time: null, startsAt: null })}
              />
            )}
            {step === STEP_DATETIME && draft.barberId && (
              <DateTimeStep
                serviceIds={draft.serviceIds}
                barberId={draft.barberId}
                date={draft.date}
                startsAt={draft.startsAt}
                refreshKey={slotsRefresh}
                onDateChange={onDateChange}
                onSlotChange={onSlotChange}
              />
            )}
            {step === STEP_CONTACTS && (
              <ContactsStep
                name={draft.name}
                phone={draft.phone}
                errors={showContactErrors ? contactErrors : {}}
                onChange={onContactChange}
              />
            )}
            {step === STEP_CONFIRM && (
              <ConfirmStep draft={draft} error={submitError} onPickAnotherTime={pickAnotherTime} />
            )}
          </section>

          {/* Десктоп: итог записи сбоку */}
          <aside className="booking__aside card" aria-label="Ваша запись">
            <h2 className="booking__aside-title">Ваша запись</h2>
            <BookingSummary draft={draft} />
            {nextButton("btn--block")}
          </aside>
        </div>

        {/* Телефон: итог и кнопка прилеплены к низу экрана */}
        <div className="booking__bar">
          <div className="booking__bar-total">
            <strong>{formatPriceRange(totals.price)}</strong>
            <span>{totals.durationMin.max > 0 ? formatDurationRange(totals.durationMin) : "Выберите услугу"}</span>
          </div>
          {nextButton()}
        </div>
      </div>
    </CatalogProvider>
  );
}
