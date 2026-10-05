/**
 * Проверка, что база заполнена: печатает услуги, барберов с графиком и настройки.
 * Запуск: npm run db:check
 */
import "dotenv/config";
import { createPrismaClient, timeToString } from "../src/index";

const prisma = createPrismaClient();
const WEEKDAYS = ["", "пн", "вт", "ср", "чт", "пт", "сб", "вс"];

async function main() {
  const services = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
  console.log(`\nУслуги (${services.length}):`);
  console.table(services.map((s) => ({ название: s.name, минут: s.durationMin, цена: s.price })));

  const barbers = await prisma.barber.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      services: { include: { service: true } },
      workingHours: { orderBy: { weekday: "asc" } },
      breaks: { orderBy: { weekday: "asc" } },
      reviews: true,
    },
  });
  console.log(`\nБарберы (${barbers.length}):`);
  for (const b of barbers) {
    const rating = b.reviews.length ? (b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length).toFixed(1) : "—";
    console.log(`\n  ${b.name} — ${b.role}, рейтинг ${rating}`);
    console.log(`    услуги: ${b.services.map((x) => x.service.name + (x.price ? ` (${x.price})` : "")).join(", ")}`);
    console.log(
      `    график: ${b.workingHours.map((w) => `${WEEKDAYS[w.weekday]} ${timeToString(w.startTime)}–${timeToString(w.endTime)}`).join(", ")}`,
    );
    const lunch = b.breaks[0];
    if (lunch) console.log(`    обед: ${timeToString(lunch.startTime)}–${timeToString(lunch.endTime)}`);
  }

  const timeOff = await prisma.timeOff.findMany({ include: { barber: true }, orderBy: { startsAt: "asc" } });
  console.log(`\nИсключения (${timeOff.length}):`);
  for (const t of timeOff) {
    const fmt = (d: Date) => d.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", dateStyle: "short", timeStyle: "short" });
    console.log(`  ${t.barber?.name ?? "весь барбершоп"}: ${t.type}, ${fmt(t.startsAt)} → ${fmt(t.endsAt)} ${t.note}`);
  }

  const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
  console.log(`\nНастройки (${settings.length}):`);
  for (const s of settings) console.log(`  ${s.key} = ${JSON.stringify(s.value)}`);

  console.log(`\nЗаписей: ${await prisma.booking.count()}, отзывов: ${await prisma.review.count()}`);

  const latest = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { client: true, barber: true },
  });
  console.log("\nПоследние записи (новые сверху):");
  const fmt = (d: Date) => d.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", dateStyle: "short", timeStyle: "short" });
  for (const b of latest) {
    console.log(`  ${fmt(b.startsAt)} — ${b.barber.name}, клиент ${b.client.name}, статус ${b.status}, создана ${fmt(b.createdAt)}`);
  }
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
