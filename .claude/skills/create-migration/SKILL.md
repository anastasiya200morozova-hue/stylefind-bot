---
name: create-migration
description: "Создаёт SQL-миграцию для Supabase StyleFind. Используй когда нужно создать или изменить таблицы sessions/capsules/search_results/capsule_items/bot_logs."
---
Создай SQL-миграцию для StyleFind по шаблону:

1. **Имя файла:** `supabase/migrations/YYYYMMDDHHMMSS_$ARGUMENTS.sql`
2. **Обязательные элементы:**
   - `CREATE TABLE` / `ALTER TABLE`
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   - `CREATE POLICY "service_role_[tablename]" ON [table] FOR ALL USING (auth.role() = 'service_role')`
   - Индексы: минимум на `telegram_id` и FK-полях
   - `COMMENT ON TABLE` для документации
3. **Триггер `update_updated_at`:** функция уже создана в базе — не дублировать, только `CREATE TRIGGER`
4. **Если доступен Supabase MCP** — выполнить миграцию через него
5. **Обновить типы:** `npx supabase gen types typescript > src/types/database.ts`

Делегируй субагенту `database-architect` для сложных случаев с RLS и индексами.
