# Kanaki Barbershop

Учебная система автоматизации барбершопа: сайт, онлайн-запись, Telegram Mini App, бот, админка и аналитика.

Документация:

- [docs/prd.md](docs/prd.md) — продуктовые требования;
- [docs/spec.md](docs/spec.md) — техническая спецификация;
- [docs/tasks.md](docs/tasks.md) — этапы работы и их статус.

## Текущий этап

Готово:

- **Этап 1 — лендинг** (`/`);
- **Этап 2 — интерфейс записи** (`/book`), пока без настоящего backend.

Данные пока моковые (`apps/web/src/data/mock.ts`), запросы к серверу имитирует `apps/web/src/lib/mockApi.ts`.

Чтобы посмотреть состояния ошибок в форме записи:

- `http://localhost:3000/book?simulate=error` — не загрузилось свободное время;
- `http://localhost:3000/book?simulate=slot-taken` — время «заняли» в момент подтверждения.

## Структура

```text
apps/
  web/        Next.js — сайт: / и /book (позже /booking/[token], /admin)
packages/     общие пакеты (появятся на следующих этапах)
docs/         PRD, SPEC, TASKS
```

## Запуск

Нужен Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Другие команды:

```bash
npm run build      # production-сборка
npm run start      # запуск собранного сайта
npm run typecheck  # проверка типов
```
