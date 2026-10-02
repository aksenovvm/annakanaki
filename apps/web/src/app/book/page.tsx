import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Запись — скоро",
};

/** Временная заглушка, чтобы CTA «Записаться» не вёл на 404. Форма записи — этап 2. */
export default function BookPage() {
  return (
    <>
      <Header />
      <main className="placeholder">
        <h1 className="section__title">Онлайн-запись скоро появится</h1>
        <p>Мы готовим удобную форму: услуга → барбер → дата → время. А пока можно позвонить или написать нам.</p>
        <Link href="/#contacts" className="btn btn--primary">
          Контакты
        </Link>
      </main>
    </>
  );
}
