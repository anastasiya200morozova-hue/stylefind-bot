---
description: Правила для обработчиков Telegram-бота StyleFind
globs: ["src/bot/**", "src/index.ts", "src/utils/auth.ts"]
---
- Каждый handler начинается с `if (!isAuthorized(msg.from?.id)) return;` — без исключений
- Сообщения от чужих Telegram ID — молча игнорировать (не отвечать, не логировать)
- STYLIST_TELEGRAM_ID берётся только из `process.env` — не захардкоживать
- Все async обработчики в try/catch — при ошибке отправить понятное сообщение пользователю и залогировать
- Callback data формат: `action` или `action:param1:param2` — парсить через split(':') с проверкой длины
- При новом фото или тексте — всегда сбрасывать state к 'idle' перед обработкой
- Polling mode (не webhook) — не настраивать express server для входящих
