---
description: Правила для работы с базой данных StyleFind
globs: ["supabase/**", "src/services/supabase.ts", "src/types/database.ts"]
---
- Все изменения схемы — только через миграции в `supabase/migrations/`
- RLS включена на всех таблицах, политика: `auth.role() = 'service_role'` (не `auth.uid()`)
- Именование таблиц: snake_case, множественное число
- FK: `search_results → sessions` и `capsule_items → capsules` с ON DELETE CASCADE
- Индексы обязательны для `telegram_id` на всех таблицах
- Никогда не использовать `anon` ключ — только `SUPABASE_SERVICE_KEY`
- Триггер `update_updated_at` уже определён — не дублировать функцию в новых миграциях
