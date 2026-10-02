import Link from "next/link";

export function CtaBanner() {
  return (
    <section className="section" aria-label="Запись онлайн">
      <div className="container">
        <div className="cta-banner">
          <div>
            <h2 className="cta-banner__title">Готовы к новой стрижке?</h2>
            <p className="cta-banner__text">Выберите мастера и время онлайн — без звонков и ожидания.</p>
          </div>
          <Link href="/book" className="btn btn--primary">
            Записаться
          </Link>
        </div>
      </div>
    </section>
  );
}
