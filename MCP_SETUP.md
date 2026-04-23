# MCP Setup — StyleFind

Выполни эти команды в терминале для подключения MCP-серверов.

## 1. Context7 — актуальная документация библиотек (ОБЯЗАТЕЛЬНО)

```bash
# Рекомендуемый вариант (удалённый, не нужен Node.js)
claude mcp add --scope user --transport http context7 https://mcp.context7.com/mcp
```

Использование: добавляй `use context7` в запросы:
```
Напиши обработчик фото для node-telegram-bot-api. use context7
Инициализируй Supabase клиент с service_role. use context7
```

## 2. Supabase — прямой доступ к БД (ОБЯЗАТЕЛЬНО после создания проекта)

```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=taiuofggkhxsprnsocjo"
```

После подключения Supabase MCP можно выполнять SQL и применять миграции прямо из Claude Code.

## Проверка подключения

```bash
claude mcp list
```

Должно показать: `context7` и `supabase` в списке.
