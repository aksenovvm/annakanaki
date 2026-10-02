import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { BookingWizard } from "@/components/booking/BookingWizard";
import "./booking.css";

export const metadata: Metadata = {
  title: "Онлайн-запись",
};

export default function BookPage() {
  return (
    <>
      <Header />
      <main className="booking-page">
        {/* useSearchParams внутри мастера требует Suspense при статической сборке */}
        <Suspense>
          <BookingWizard />
        </Suspense>
      </main>
    </>
  );
}
