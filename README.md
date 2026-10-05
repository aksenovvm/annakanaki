# Kanaki Barbershop

Учебная система автоматизации барбершопа: сайт, онлайн-запись, Telegram Mini App, бот, админка и аналитика.

Документация:

- [docs/prd.md](docs/prd.md) — продуктовые требования;
- [docs/spec.md](docs/spec.md) — техническая спецификация;
- [docs/tasks.md](docs/tasks.md) — этапы работы и их статус.

## Текущий этап

Готово:

- **Этап 1 — лендинг** (`/`);
- **Этап 2 — интерфейс записи** (`/book`), пока без настоящего backend;
- **Этап 3 — база данных** (`packages/db`): схема, миграция, тестовые данные.
  Чтобы подключить свою базу Supabase — [docs/supabase.md](docs/supabase.md);
- **Этап 4 — backend** (`apps/api`): сайт берёт услуги, барберов и отзывы из базы через API.

Свободное время и создание записи пока тестовые (`apps/web/src/lib/mockApi.ts`) — настоящими они станут на этапе 5.

Чтобы посмотреть состояния ошибок в форме записи:

- `http://localhost:3000/book?simulate=error` — не загрузилось свободное время;
- `http://localhost:3000/book?simulate=slot-taken` — время «заняли» в момент подтверждения.

## Структура

```text
apps/
  web/        Next.js — сайт: / и /book (позже /booking/[token], /admin)
  api/        Fastify — REST API: /health, /api/v1/services, /api/v1/barbers, /api/v1/reviews/public
packages/
  db/         Prisma: схема БД, миграции, seed, клиент для API
  shared/     Zod-схемы и типы ответов API — общие для сервера и сайта
docs/         PRD, SPEC, TASKS
```

## Запуск

Нужен Node.js 20+ и два файла с настройками (см. [docs/supabase.md](docs/supabase.md)):

- `packages/db/.env` — для миграций и seed;
- `apps/api/.env` — для сервера (скопируйте из `apps/api/.env.example`).

```bash
npm install
npm run dev        # сайт: http://localhost:3000, API: http://localhost:4000/health
```

Другие команды:

```bash
npm run build      # production-сборка
npm run start      # запуск собранного сайта
npm run typecheck  # проверка типов

npm run db:deploy  # создать таблицы в базе
npm run db:seed    # заполнить тестовыми данными
npm run db:check   # посмотреть, что в базе
npm run db:studio  # открыть базу в браузере
```
