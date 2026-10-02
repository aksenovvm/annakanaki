"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { barbers, services } from "@/data/mock";
import { toUtcIso } from "@/lib/date";
import { formatDuration, formatPrice } from "@/lib/format";
import { ApiError, createBooking, type Simulate } from "@/lib/mockApi";
import { isValidPhone, phoneDigits, toE164 } from "@/lib/phone";
import { ArrowLeftIcon } from "../Icons";
import { BarberStep } from "./BarberStep";
import { BookingSummary } from "./BookingSummary";
import { ConfirmStep } from "./ConfirmStep";
import { ContactsStep } from "./ContactsStep";
import { DateTimeStep } from "./DateTimeStep";
import { ServiceStep } from "./ServiceStep";
import { Spinner } from "./StatusViews";
import { SuccessScreen } from "./SuccessScreen";
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

/** Начальное состояние из ссылки: /book?barber=timur или /book?service=haircut */
function draftFromParams(params: URLSearchParams): { draft: BookingDraft; step: number } {
  const draft = { ...emptyDraft };
  const serviceId = params.get("service");
  if (serviceId && services.some((s) => s.id === serviceId)) draft.serviceIds = [serviceId];
  const barberId = params.get("barber");
  if (barberId && barbers.some((b) => b.id === barberId)) draft.barberId = barberId;
  return { draft, step: draft.serviceIds.length > 0 ? STEP_BARBER : STEP_SERVICE };
}

export function BookingWizard() {
  const params = useSearchParams();
  const simulate = (params.get("simulate") as Simulate) ?? null;

  const [initial] = useState(() => draftFromParams(params));
  const [draft, setDraft] = useState<BookingDraft>(initial.draft);
  const [step, setStep] = useState(initial.step);
  const [contactErrors, setContactErrors] = useState<{ name?: string; phone?: string }>({});
  const [showContactErrors, setShowContactErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<"SLOT_TAKEN" | "OTHER" | null>(null);
  const [done, setDone] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // При смене шага возвращаемся к началу формы — важно на телефоне.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step, done]);

  const update = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  function toggleService(serviceId: string) {
    setDraft((d) => {
      const serviceIds = d.serviceIds.includes(serviceId)
        ? d.serviceIds.filter((id) => id !== serviceId)
        : [...d.serviceIds, serviceId];
      // Если выбранный мастер не делает новый набор услуг — сбрасываем его выбор.
      const barber = barbers.find((b) => b.id === d.barberId);
      const barberStillOk = !barber || serviceIds.every((id) => barber.serviceIds.includes(id));
      return { ...d, serviceIds, barberId: barberStillOk ? d.barberId : null, time: null };
    });
  }

  const onDateChange = useCallback((date: string) => update({ date, time: null }), [update]);
  const onTimeChange = useCallback((time: string) => update({ time }), [update]);

  function onContactChange(field: "name" | "phone", value: string) {
    const next = { ...draft, [field]: field === "phone" ? phoneDigits(value) : value };
    setDraft(next);
    if (showContactErrors) setContactErrors(validateContacts(next));
  }

  const canProceed = [
    draft.serviceIds.length > 0,
    draft.barberId !== null,
    draft.date !== null && draft.time !== null,
    true, // контакты проверяем по нажатию «Далее», чтобы показать понятные ошибки
    !submitting,
  ][step];

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createBooking(
        {
          serviceIds: draft.serviceIds,
          barberId: draft.barberId!,
          startsAt: toUtcIso(draft.date!, draft.time!),
          client: { name: draft.name.trim(), phone: toE164(draft.phone) },
        },
        simulate,
      );
      // Для «Любой свободный» показываем мастера, которого выбрал «сервер».
      update({ barberId: result.barberId });
      setDone(true);
    } catch (e) {
      setSubmitError(e instanceof ApiError && e.code === "SLOT_TAKEN" ? "SLOT_TAKEN" : "OTHER");
    } finally {
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
    update({ time: null });
    setStep(STEP_DATETIME);
  }

  function restart() {
    setDraft(emptyDraft);
    setStep(STEP_SERVICE);
    setShowContactErrors(false);
    setContactErrors({});
    setDone(false);
  }

  if (done) {
    return (
      <div className="booking container" ref={topRef}>
        <SuccessScreen draft={draft} onBookAgain={restart} />
      </div>
    );
  }

  const totals = summarize(draft);
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
              onSelect={(barberId) => update({ barberId, time: null })}
            />
          )}
          {step === STEP_DATETIME && draft.barberId && (
            <DateTimeStep
              serviceIds={draft.serviceIds}
              barberId={draft.barberId}
              date={draft.date}
              time={draft.time}
              simulate={simulate}
              onDateChange={onDateChange}
              onTimeChange={onTimeChange}
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
          <strong>{formatPrice(totals.totalPrice)}</strong>
          <span>{totals.totalDurationMin > 0 ? formatDuration(totals.totalDurationMin) : "Выберите услугу"}</span>
        </div>
        {nextButton()}
      </div>
    </div>
  );
}
