/**
 * Тестовые данные: услуги, барберы, расписание, настройки и несколько отзывов.
 *
 * Запуск: npm run db:seed
 * Seed заполняет только ПУСТУЮ базу — чтобы случайно не стереть настоящие записи.
 * Пересоздать всё с нуля: npm run db:reset (удалит ВСЕ данные и заново запустит миграции и seed).
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { createPrismaClient, timeFromString, type Prisma } from "../src/index";

// Для seed используем прямое подключение — как и для миграций.
const prisma = createPrismaClient(process.env.DIRECT_URL ?? process.env.DATABASE_URL);

const TASHKENT_OFFSET = "+05:00";

/** Дата в Ташкенте через `days` дней от сегодня (YYYY-MM-DD) */
function tashkentDate(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(d);
}

/** Момент «дата + время по Ташкенту» */
function at(isoDate: string, time: string): Date {
  return new Date(`${isoDate}T${time}:00${TASHKENT_OFFSET}`);
}

const manageToken = () => randomBytes(24).toString("base64url");

// ---------- Справочники ----------

const services = [
  { key: "haircut", name: "Мужская стрижка", description: "Консультация, мытьё головы, стрижка и укладка.", durationMin: 60, price: 150_000 },
  { key: "beard", name: "Моделирование бороды", description: "Форма бороды, контуры опасной бритвой, уход маслом.", durationMin: 30, price: 90_000 },
  { key: "combo", name: "Стрижка + борода", description: "Полный образ: стрижка, укладка и оформление бороды.", durationMin: 90, price: 220_000 },
  { key: "shave", name: "Королевское бритьё", description: "Горячие полотенца, бритьё опасной бритвой, уходовая маска.", durationMin: 45, price: 120_000 },
  { key: "kids", name: "Детская стрижка", description: "Для мальчиков до 12 лет. Спокойно и без спешки.", durationMin: 45, price: 100_000 },
  { key: "buzz", name: "Стрижка машинкой", description: "Одна насадка по всей голове, окантовка.", durationMin: 30, price: 80_000 },
] as const;

type ServiceKey = (typeof services)[number]["key"];

const barbers: {
  key: string;
  name: string;
  role: string;
  bio: string;
  experienceYears: number;
  specialties: string[];
  services: ServiceKey[];
  /** выходной день недели, 1 = пн … 7 = вс */
  dayOff: number;
  lunch: [string, string];
  /** переопределения цены для мастера */
  priceOverrides?: Partial<Record<ServiceKey, number>>;
}[] = [
  {
    key: "timur",
    name: "Тимур",
    role: "Топ-барбер",
    bio: "Классические и современные мужские стрижки, точные фейды.",
    experienceYears: 8,
    specialties: ["Фейд", "Классика", "Борода"],
    services: ["haircut", "beard", "combo", "shave", "kids", "buzz"],
    dayOff: 1,
    lunch: ["13:00", "14:00"],
    // У топ-барбера стрижка дороже — пример переопределения цены в barber_services
    priceOverrides: { haircut: 180_000, combo: 250_000 },
  },
  {
    key: "aziz",
    name: "Азиз",
    role: "Барбер",
    bio: "Любит текстурные стрижки и аккуратные бороды.",
    experienceYears: 5,
    specialties: ["Текстура", "Кроп", "Борода"],
    services: ["haircut", "beard", "combo", "buzz"],
    dayOff: 2,
    lunch: ["14:00", "15:00"],
  },
  {
    key: "rustam",
    name: "Рустам",
    role: "Барбер",
    bio: "Мастер королевского бритья и работы опасной бритвой.",
    experienceYears: 6,
    specialties: ["Бритьё", "Классика"],
    services: ["haircut", "beard", "combo", "shave"],
    dayOff: 3,
    lunch: ["13:00", "14:00"],
  },
  {
    key: "dilshod",
    name: "Дильшод",
    role: "Младший барбер",
    bio: "Быстрые и аккуратные стрижки машинкой, детские стрижки.",
    experienceYears: 2,
    specialties: ["Машинка", "Детские"],
    services: ["haircut", "kids", "buzz", "beard"],
    dayOff: 7,
    lunch: ["14:00", "15:00"],
  },
];

/** Часы работы барбершопа: будни 10–21, выходные 10–20 */
const shopHours = (weekday: number): [string, string] => (weekday <= 5 ? ["10:00", "21:00"] : ["10:00", "20:00"]);

const settings: Record<string, Prisma.InputJsonValue> = {
  cancel_cutoff_min: 30,
  slot_step_min: 15,
  booking_horizon_days: 30,
  min_notice_min: 30,
  reminder_day_minutes: 1440,
  reminder_short_minutes: 30,
  review_delay_min: 60,
  timezone: "Asia/Tashkent",
  review_public_min_rating: 4,
};

// Отзывы — к прошедшим завершённым визитам
const pastVisits: { client: string; phone: string; barber: string; service: ServiceKey; daysAgo: number; time: string; rating: number; comment: string }[] = [
  { client: "Алишер", phone: "+998901110001", barber: "timur", service: "haircut", daysAgo: 11, time: "12:00", rating: 5, comment: "Лучший фейд в городе. Записался через сайт за минуту, пришёл — сразу посадили." },
  { client: "Сергей", phone: "+998901110002", barber: "rustam", service: "shave", daysAgo: 18, time: "15:00", rating: 5, comment: "Королевское бритьё — это отдельный вид отдыха. Горячие полотенца, всё чётко." },
  { client: "Бекзод", phone: "+998901110003", barber: "aziz", service: "beard", daysAgo: 24, time: "11:00", rating: 5, comment: "Азиз отлично понял, что я хочу. Борода никогда так хорошо не выглядела." },
  { client: "Максим", phone: "+998901110004", barber: "dilshod", service: "kids", daysAgo: 33, time: "16:00", rating: 4, comment: "Привёл сына — мастер нашёл подход, стрижка аккуратная. Приятная атмосфера." },
];

async function main() {
  const existing = await prisma.service.count();
  if (existing > 0) {
    console.log(`В базе уже есть данные (услуг: ${existing}) — seed пропущен.`);
    console.log("Чтобы пересоздать базу с нуля: npm run db:reset (удалит ВСЕ данные).");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Услуги
    const serviceIds = {} as Record<ServiceKey, string>;
    for (const [i, s] of services.entries()) {
      const created = await tx.service.create({
        data: { name: s.name, description: s.description, durationMin: s.durationMin, price: s.price, sortOrder: i },
      });
      serviceIds[s.key] = created.id;
    }

    // Барберы + их услуги + расписание
    const barberIds: Record<string, string> = {};
    for (const [i, b] of barbers.entries()) {
      const weekdays = [1, 2, 3, 4, 5, 6, 7].filter((d) => d !== b.dayOff);
      const created = await tx.barber.create({
        data: {
          name: b.name,
          role: b.role,
          bio: b.bio,
          experienceYears: b.experienceYears,
          specialties: b.specialties,
          sortOrder: i,
          services: {
            create: b.services.map((key) => ({
              serviceId: serviceIds[key],
              price: b.priceOverrides?.[key] ?? null,
            })),
          },
          workingHours: {
            create: weekdays.map((weekday) => {
              const [start, end] = shopHours(weekday);
              return { weekday, startTime: timeFromString(start), endTime: timeFromString(end) };
            }),
          },
          breaks: {
            create: weekdays.map((weekday) => ({
              weekday,
              startTime: timeFromString(b.lunch[0]),
              endTime: timeFromString(b.lunch[1]),
            })),
          },
        },
      });
      barberIds[b.key] = created.id;
    }

    // Исключения: отпуск мастера и закрытие всего барбершопа
    const vacationStart = tashkentDate(10);
    await tx.timeOff.createMany({
      data: [
        {
          barberId: barberIds.rustam,
          startsAt: at(vacationStart, "00:00"),
          endsAt: at(tashkentDate(15), "00:00"),
          type: "vacation",
          note: "Отпуск",
        },
        {
          barberId: null,
          startsAt: at(tashkentDate(21), "00:00"),
          endsAt: at(tashkentDate(22), "00:00"),
          type: "closed",
          note: "Санитарный день — барбершоп закрыт",
        },
      ],
    });

    // Настройки
    await tx.setting.createMany({
      data: Object.entries(settings).map(([key, value]) => ({ key, value })),
    });

    // Клиенты, завершённые визиты и отзывы
    for (const v of pastVisits) {
      const service = services.find((s) => s.key === v.service)!;
      const barber = barbers.find((b) => b.key === v.barber)!;
      const price = barber.priceOverrides?.[v.service] ?? service.price;
      const startsAt = at(tashkentDate(-v.daysAgo), v.time);
      const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

      const client = await tx.client.create({ data: { name: v.client, phone: v.phone } });
      const booking = await tx.booking.create({
        data: {
          clientId: client.id,
          barberId: barberIds[v.barber],
          startsAt,
          endsAt,
          totalPrice: price,
          totalDurationMin: service.durationMin,
          status: "completed",
          source: "web",
          manageToken: manageToken(),
          services: {
            create: [{ serviceId: serviceIds[v.service], name: service.name, durationMin: service.durationMin, price }],
          },
        },
      });
      await tx.review.create({
        data: {
          bookingId: booking.id,
          barberId: barberIds[v.barber],
          clientId: client.id,
          rating: v.rating,
          comment: v.comment,
          isPublic: v.rating >= Number(settings.review_public_min_rating),
          createdAt: new Date(endsAt.getTime() + 2 * 3_600_000),
        },
      });
    }
  });

  const counts = {
    "услуг": await prisma.service.count(),
    "барберов": await prisma.barber.count(),
    "связей барбер–услуга": await prisma.barberService.count(),
    "рабочих дней": await prisma.workingHours.count(),
    "обедов": await prisma.break.count(),
    "исключений": await prisma.timeOff.count(),
    "настроек": await prisma.setting.count(),
    "клиентов": await prisma.client.count(),
    "записей": await prisma.booking.count(),
    "отзывов": await prisma.review.count(),
  };
  console.log("Тестовые данные добавлены:");
  for (const [name, n] of Object.entries(counts)) console.log(`  ${name}: ${n}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
