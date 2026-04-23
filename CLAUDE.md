# StyleFind

Telegram-бот для стилиста: принимает фото/текст референса, анализирует через Google Gemini Vision,
ищет похожие вещи на Wildberries и Lamoda, собирает капсулу и генерирует PDF для клиента.
MVP — личный однопользовательский инструмент.

## Стек технологий

- **Runtime:** Node.js 20, TypeScript strict
- **Telegram:** node-telegram-bot-api (polling, не webhook)
- **AI:** Google Gemini 1.5 Flash API (бесплатный план)
- **Поиск:** Wildberries публичный API + Lamoda (Google CSE / cheerio как fallback)
- **База данных:** Supabase PostgreSQL (free tier, service_role доступ)
- **PDF:** pdf-lib
- **Хостинг:** Railway.app (free tier)

## Структура проекта

```
stylefind-bot/
├── src/
│   ├── index.ts                   — точка входа, инициализация бота
│   ├── bot/
│   │   ├── handlers/
│   │   │   ├── photo.ts           — обработчик фото
│   │   │   ├── text.ts            — обработчик текста
│   │   │   ├── callback.ts        — обработчик кнопок (callback_query)
│   │   │   └── commands.ts        — /start, /capsule, /newclient, /help
│   │   ├── keyboards.ts           — Inline keyboards
│   │   └── messages.ts            — шаблоны сообщений
│   ├── services/
│   │   ├── gemini.ts              — Google Gemini API (анализ фото и текста)
│   │   ├── wildberries.ts         — поиск на Wildberries
│   │   ├── lamoda.ts              — поиск на Lamoda
│   │   ├── pdf.ts                 — генерация PDF-капсулы
│   │   └── supabase.ts            — клиент и запросы к БД
│   ├── types/
│   │   └── index.ts               — TypeScript типы проекта
│   └── utils/
│       ├── auth.ts                — проверка STYLIST_TELEGRAM_ID
│       └── logger.ts              — структурированное логирование в bot_logs
├── supabase/
│   └── migrations/                — SQL миграции (формат YYYYMMDDHHMMSS_name.sql)
├── .env                           — переменные окружения (не в git)
├── .env.example
├── package.json
├── tsconfig.json
└── railway.json
```

## Таблицы Supabase

`sessions`, `search_results`, `capsules`, `capsule_items`, `bot_logs`
Полная схема с индексами и RLS — в [SPEC.md](SPEC.md), Блок 2.

## Правила кодирования

- TypeScript strict mode, **без `any`**
- **КАЖДЫЙ обработчик** начинается с `isAuthorized(msg.from?.id)` из `utils/auth.ts`
- Сообщения от чужих Telegram ID — молча игнорировать, не отвечать
- Supabase только через `service_role` ключ (не `anon`)
- Все `async` функции — `try/catch` с логированием через `logger.ts`
- Именование: `camelCase` переменные, `PascalCase` типы/интерфейсы, `snake_case` таблицы БД
- Один файл — один модуль, максимум 200 строк

## Работа с Supabase

- Все изменения схемы — через миграции в `supabase/migrations/`
- RLS включена на всех таблицах, политика: `service_role` имеет полный доступ
- Типы генерировать: `npx supabase gen types typescript > src/types/database.ts`

## Context7

При работе с **любыми** внешними библиотеками (node-telegram-bot-api, @google/generative-ai,
@supabase/supabase-js, pdf-lib) — использовать Context7 MCP для актуальной документации.
Добавлять `use context7` к запросам, связанным с API библиотек.

## Команды

```bash
npm run dev     # локальная разработка (nodemon + ts-node)
npm run build   # компиляция TypeScript → dist/
npm start       # запуск из dist/index.js
```

## Команда субагентов

Тип проекта: **Telegram-бот + AI** → 4 субагента (без frontend-developer).
Файлы субагентов: `.claude/agents/`

| Субагент | Модель | Зона ответственности |
|----------|--------|----------------------|
| `database-architect` | opus | Схема БД, миграции, RLS-политики |
| `backend-engineer` | sonnet | Bot handlers, сервисы, бизнес-логика |
| `ai-agent-architect` | opus | Gemini промпты, поисковая интеграция |
| `qa-reviewer` | sonnet | Тестирование, безопасность, edge cases |
