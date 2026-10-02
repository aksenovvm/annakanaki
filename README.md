# Kanaki Barbershop

Учебная система автоматизации барбершопа: сайт, онлайн-запись, Telegram Mini App, бот, админка и аналитика.

Документация:

- [docs/prd.md](docs/prd.md) — продуктовые требования;
- [docs/spec.md](docs/spec.md) — техническая спецификация;
- [docs/tasks.md](docs/tasks.md) — этапы работы и их статус.

## Текущий этап

**Этап 1 — лендинг** готов. Данные пока моковые (`apps/web/src/data/mock.ts`).

## Структура

```text
apps/
  web/        Next.js — сайт (позже /book, /booking/[token], /admin)
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
