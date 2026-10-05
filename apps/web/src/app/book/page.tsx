import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { getBarbers, getServices, load } from "@/lib/api";
import "./booking.css";

export const metadata: Metadata = {
  title: "Онлайн-запись",
};

export default async function BookPage() {
  // Услуги и барберы — из API. Свободное время пока тестовое (этап 5).
  const [services, barbers] = await Promise.all([load(getServices()), load(getBarbers())]);

  return (
    <>
      <Header />
      <main className="booking-page">
        {services.ok && barbers.ok ? (
          // useSearchParams внутри мастера требует Suspense при сборке
          <Suspense>
            <BookingWizard catalog={{ services: services.data, barbers: barbers.data }} />
          </Suspense>
        ) : (
          <div className="booking container">
            <div className="state state--error" role="alert">
              <div className="state__icon" aria-hidden="true">
                ⚠️
              </div>
              <p className="state__title">Запись временно недоступна</p>
              <p className="state__text">Не удалось загрузить услуги и мастеров. Обновите страницу через минуту.</p>
              {/* Обычная ссылка, а не <Link>, — чтобы страница перезагрузилась целиком */}
              <a href="/book" className="btn btn--ghost btn--sm">
                Обновить
              </a>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
