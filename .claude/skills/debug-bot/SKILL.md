---
name: debug-bot
description: "Систематическая отладка StyleFind бота. Используй когда бот не отвечает, падает, возвращает неверные результаты или Gemini не работает."
---
Отладь проблему в StyleFind боте пошагово:

1. **Проверь переменные окружения:**
   - `TELEGRAM_BOT_TOKEN` — валидный токен от BotFather
   - `STYLIST_TELEGRAM_ID` — числовой Telegram ID (не username)
   - `GEMINI_API_KEY` — действующий ключ Google AI Studio
   - `SUPABASE_URL` и `SUPABASE_SERVICE_KEY` — service_role ключ (не anon)

2. **Проверь логи в bot_logs:**
   ```sql
   SELECT action, error, duration_ms, created_at
   FROM bot_logs WHERE error IS NOT NULL
   ORDER BY created_at DESC LIMIT 20;
   ```

3. **Диагностика по симптому:**
   - Бот не отвечает → проверь isAuthorized (STYLIST_TELEGRAM_ID совпадает?)
   - Gemini не анализирует → проверь квоту (1 500/день), валидность API ключа
   - WB возвращает 0 → проверь URL, priceU формат (цена * 100)
   - PDF не генерируется → проверь доступность image_url товаров
   - State не сохраняется → проверь подключение к Supabase и service_role ключ

4. **Проверь state machine:**
   ```sql
   SELECT telegram_id, state, current_query, current_client_name
   FROM sessions;
   ```

5. **Тест Gemini промпта** — запустить напрямую с тестовым текстом, убедиться что возвращает валидный JSON

6. **Отчёт:** описать причину + файл + строку + исправление
