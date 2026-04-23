---
description: Правила использования Context7 для актуальной документации библиотек
globs: ["**/*.ts", "**/*.js"]
---
- При работе с ЛЮБОЙ внешней библиотекой — использовать Context7 MCP для проверки актуального API
- Ключевые библиотеки проекта: `node-telegram-bot-api`, `@google/generative-ai`, `@supabase/supabase-js`, `pdf-lib`, `cheerio`
- Если не уверен в API метода — сначала запроси через Context7, потом пиши код
- Синтаксис: `use context7, use library /supabase/supabase-js`
- Особенно важно для `@google/generative-ai` — API часто меняется между версиями
