import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { BookingManager } from "@/components/booking/BookingManager";
import { getBooking } from "@/lib/api";
import "../../book/booking.css";

export const metadata: Metadata = {
  title: "Ваша запись",
  // Страница с личными данными по секретной ссылке — поисковикам её индексировать нельзя
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function BookingPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { created } = await searchParams;

  let booking;
  let failed = false;
  try {
    booking = await getBooking(token);
  } catch (error) {
    console.error("[booking page]", error);
    failed = true;
  }

  return (
    <>
      <Header />
      <main className="booking-page">
        <div className="booking container">
          {booking ? (
            <BookingManager initialBooking={booking} justCreated={created === "1"} />
          ) : (
            <div className={`state ${failed ? "state--error" : ""}`} role="alert">
              <p className="state__title">{failed ? "Не удалось загрузить запись" : "Запись не найдена"}</p>
              <p className="state__text">
                {failed
                  ? "Попробуйте обновить страницу через минуту."
                  : "Проверьте ссылку — возможно, она скопирована не полностью."}
              </p>
              <Link href="/book" className="btn btn--primary btn--sm">
                Записаться
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
