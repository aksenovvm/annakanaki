import Link from "next/link";

/** Кнопка записи, всегда доступная большим пальцем на телефоне. На десктопе скрыта через CSS. */
export function StickyCta() {
  return (
    <div className="sticky-cta">
      <Link href="/book" className="btn btn--primary btn--block">
        Записаться
      </Link>
    </div>
  );
}
