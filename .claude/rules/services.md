---
description: Правила для внешних сервисов StyleFind (Gemini, WB, Lamoda, PDF)
globs: ["src/services/**"]
---
- Все API ключи читать из `process.env` — никогда не хардкодить
- Gemini: retry 1 раз при невалидном JSON, при повторной ошибке — вернуть null
- WB + Lamoda запускать параллельно через `Promise.allSettled` — один сбой не должен блокировать другой
- При 0 результатах WB — повторить запрос без цвета (buildSearchQuery с withColor=false)
- Lamoda Google CSE → при ошибке fallback на cheerio парсинг
- PDF: использовать `pdf-lib`, не puppeteer; фото оптимизировать до < 10 МБ итогового файла
- Все вызовы логировать: `action`, `duration_ms`, `error` в таблицу `bot_logs`
- При недоступности обоих источников — сообщить пользователю, не бросать исключение наружу
