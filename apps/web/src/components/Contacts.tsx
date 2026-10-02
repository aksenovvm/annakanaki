import Link from "next/link";
import { shop } from "@/data/mock";
import { ClockIcon, MapPinIcon, PhoneIcon, SendIcon } from "./Icons";
import { SectionHead } from "./SectionHead";

function mapUrls() {
  const { lat, lng } = shop.coordinates;
  const d = 0.006;
  const bbox = [lng - d, lat - d / 2, lng + d, lat + d / 2].join(",");
  return {
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`,
    open: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
  };
}

export function Contacts() {
  const map = mapUrls();

  return (
    <section id="contacts" className="section section--muted contacts" aria-labelledby="contacts-title">
      <div className="container">
        <SectionHead id="contacts-title" eyebrow="Контакты" title="Как нас найти" />
        <div className="contacts__grid">
          <div className="card">
            <ul className="contacts__list">
              <li className="contacts__item">
                <span className="contacts__icon">
                  <MapPinIcon />
                </span>
                <div>
                  <div className="contacts__label">Адрес</div>
                  <div className="contacts__value">{shop.address}</div>
                </div>
              </li>
              <li className="contacts__item">
                <span className="contacts__icon">
                  <PhoneIcon />
                </span>
                <div>
                  <div className="contacts__label">Телефон</div>
                  <div className="contacts__value">
                    <a href={shop.phoneHref}>{shop.phone}</a>
                  </div>
                </div>
              </li>
              <li className="contacts__item">
                <span className="contacts__icon">
                  <SendIcon />
                </span>
                <div>
                  <div className="contacts__label">Telegram</div>
                  <div className="contacts__value">
                    <a href={`https://t.me/${shop.telegram}`} target="_blank" rel="noopener noreferrer">
                      @{shop.telegram}
                    </a>
                  </div>
                </div>
              </li>
              <li className="contacts__item">
                <span className="contacts__icon">
                  <ClockIcon />
                </span>
                <div>
                  <div className="contacts__label">Часы работы</div>
                  <div className="contacts__value contacts__hours">
                    {shop.hours.map((h) => (
                      <span key={h.days} style={{ display: "contents" }}>
                        <span>{h.days}</span>
                        <span>{h.time}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            </ul>
            <Link href="/book" className="btn btn--primary btn--block">
              Записаться онлайн
            </Link>
          </div>

          <div className="map">
            <iframe
              src={map.embed}
              title={`Карта: ${shop.address}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              href={map.open}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary btn--sm map__link"
            >
              Открыть карту
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
