import { useEffect, useState } from "react";
import type { Booking, MeResponse } from "@barbershop/shared";
import { api, errorDetails, errorText } from "./api";
import type { Catalog } from "./catalog";
import { BookFlow } from "./screens/BookFlow";
import { BookingDetails } from "./screens/BookingDetails";
import { MyBookings } from "./screens/MyBookings";
import { getInitData, insideTelegram } from "./telegram";

type Screen =
  | { name: "book"; key: number }
  | { name: "bookings" }
  | { name: "booking"; booking: Booking; justCreated: boolean };

type Boot =
  | { status: "loading" }
  | { status: "error"; message: string; details: string | null }
  | { status: "ready"; me: MeResponse; catalog: Catalog };

export function App() {
  const [boot, setBoot] = useState<Boot>({ status: "loading" });
  const [screen, setScreen] = useState<Screen>({ name: "book", key: 0 });
  const initData = getInitData();

  // При запуске: проверяем вход через Telegram (/me) и загружаем услуги и мастеров
  useEffect(() => {
    if (!initData) return;
    Promise.all([api.me(), api.services(), api.barbers()])
      .then(([me, services, barbers]) => setBoot({ status: "ready", me, catalog: { services, barbers } }))
      .catch((e) => setBoot({ status: "error", message: errorText(e), details: errorDetails(e) }));
  }, [initData]);

  if (!initData) return <NotInTelegram />;
  if (boot.status === "loading") return <p className="hint center screen">Загрузка…</p>;
  if (boot.status === "error")
    return (
      <div className="screen">
        <p className="notice notice--error">{boot.message}</p>
        {boot.details && (
          <pre className="debug">
            Подробности (видны только в режиме разработки — сделайте скриншот):{"\n"}
            {boot.details}
          </pre>
        )}
        <button type="button" className="button-secondary" onClick={() => location.reload()}>
          Попробовать снова
        </button>
      </div>
    );

  const { me, catalog } = boot;

  return (
    <>
      {screen.name !== "booking" && (
        <nav className="tabs" aria-label="Разделы">
          <button
            type="button"
            aria-pressed={screen.name === "book"}
            onClick={() => setScreen((s) => (s.name === "book" ? s : { name: "book", key: Date.now() }))}
          >
            Записаться
          </button>
          <button type="button" aria-pressed={screen.name === "bookings"} onClick={() => setScreen({ name: "bookings" })}>
            Мои записи
          </button>
        </nav>
      )}

      {screen.name === "book" && (
        <BookFlow
          key={screen.key}
          catalog={catalog}
          defaultName={me.client.name}
          defaultPhone={me.client.phone}
          onBooked={(booking) => setScreen({ name: "booking", booking, justCreated: true })}
        />
      )}
      {screen.name === "bookings" && (
        <MyBookings
          onOpen={(booking) => setScreen({ name: "booking", booking, justCreated: false })}
          onBook={() => setScreen({ name: "book", key: Date.now() })}
        />
      )}
      {screen.name === "booking" && (
        <BookingDetails
          key={screen.booking.id}
          booking={screen.booking}
          justCreated={screen.justCreated}
          onBack={() => setScreen({ name: "bookings" })}
          onChanged={(booking) => setScreen({ name: "booking", booking, justCreated: false })}
        />
      )}
    </>
  );
}

function NotInTelegram() {
  return (
    <div className="screen center">
      <h1>Откройте через Telegram</h1>
      <p className="hint">
        Это приложение работает внутри Telegram: так мы понимаем, кто записывается, без регистрации и паролей.
      </p>
      {import.meta.env.DEV && !insideTelegram && (
        <div className="notice">
          <p>
            <strong>Режим разработки:</strong> Vite не видит тестовый вход (VITE_DEV_INIT_DATA).
          </p>
          <p>
            1. В терминале: <code>npm run tg:dev-init-data</code> — скрипт сам создаст{" "}
            <code>apps/miniapp/.env.local</code>.
          </p>
          <p>2. Обновите эту страницу.</p>
        </div>
      )}
    </div>
  );
}
