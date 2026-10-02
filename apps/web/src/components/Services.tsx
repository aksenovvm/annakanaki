import Link from "next/link";
import { services } from "@/data/mock";
import { formatDuration, formatPrice } from "@/lib/format";
import { ArrowRightIcon, ClockIcon } from "./Icons";
import { SectionHead } from "./SectionHead";

export function Services() {
  return (
    <section id="services" className="section" aria-labelledby="services-title">
      <div className="container">
        <SectionHead
          id="services-title"
          eyebrow="Услуги"
          title="Услуги и цены"
          subtitle="Цена указана за услугу целиком — без скрытых доплат."
        />
        <div className="grid grid--services">
          {services.map((service) => (
            <article key={service.id} className="card">
              <div className="service__top">
                <h3 className="service__name">{service.name}</h3>
                {service.isPopular && <span className="tag">Популярное</span>}
              </div>
              <p className="service__desc">{service.description}</p>
              <div className="service__bottom">
                <span className="service__price">{formatPrice(service.price)}</span>
                <span className="service__duration">
                  <ClockIcon size={16} />
                  {formatDuration(service.durationMin)}
                </span>
              </div>
            </article>
          ))}
        </div>
        <div className="section__cta">
          <Link href="/book" className="btn btn--primary">
            Выбрать услугу и записаться <ArrowRightIcon size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
