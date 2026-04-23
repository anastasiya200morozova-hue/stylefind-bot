# StyleFind — Техническая спецификация

> Версия: 1.0
> Дата: апрель 2025
> Статус: MVP — личный инструмент стилиста

---

## 0. Обзор проекта

### Что это
Telegram-бот для стилиста: принимает фото/скрин/текст с референсом одежды,
анализирует через Google Gemini Vision, ищет похожие вещи на Wildberries и Lamoda,
позволяет собрать капсулу и скачать PDF для клиента.

### Стек
- **Язык:** Node.js (TypeScript)
- **Telegram:** node-telegram-bot-api
- **AI анализ фото:** Google Gemini 1.5 Flash API (бесплатный план)
- **Поиск товаров:** Wildberries API (публичный) + Lamoda парсинг
- **База данных:** Supabase (PostgreSQL, бесплатный план)
- **PDF генерация:** puppeteer или pdf-lib
- **Хостинг:** Railway.app (бесплатный план, личный тест)
- **Переменные окружения:** .env файл

### Роли пользователей
| Роль | Описание | Доступ |
|------|----------|--------|
| stylist | Единственный пользователь (автор бота) | Полный доступ ко всем функциям |

> MVP — однопользовательский бот. Telegram ID стилиста захардкожен в .env как STYLIST_TELEGRAM_ID.
> Все сообщения от других пользователей игнорируются.

---

## БЛОК 1: User Stories

### US-001: Анализ фото-референса
**Как** стилист,
**я хочу** отправить боту фото от клиента (скрин из Pinterest, фото из журнала, скрин с сайта),
**чтобы** бот автоматически определил тип вещи, цвет и стиль без моего описания.

**Сценарий:**
1. Стилист отправляет фото в чат боту
2. Бот отвечает: «Анализирую фото...»
3. Gemini Vision анализирует изображение
4. Бот выводит результат: «Вижу: синее прямое пальто, деловой стиль. Верно?»
5. Кнопки: «✅ Верно» / «✏️ Уточнить»
6. При «Верно» → переход к выбору сегмента

**Критерий приёмки:**
- [ ] Бот принимает фото форматов JPG, PNG, WebP размером до 20 МБ
- [ ] Gemini возвращает: тип вещи, основной цвет, стиль (casual/business/sport/evening)
- [ ] Время анализа < 10 секунд
- [ ] При ошибке Gemini API — бот предлагает описать вещь текстом

### US-002: Анализ текстового описания
**Как** стилист,
**я хочу** написать текстом что ищу (например «бежевый оверсайз тренч миди»),
**чтобы** бот нашёл похожие вещи без фото.

**Сценарий:**
1. Стилист пишет текст: «бежевый оверсайз тренч миди»
2. Бот подтверждает: «Ищу: тренч, бежевый, оверсайз, длина миди. Верно?»
3. Кнопки: «✅ Верно» / «✏️ Уточнить»
4. При «Верно» → выбор сегмента

**Критерий приёмки:**
- [ ] Бот корректно парсит текстовое описание через Gemini
- [ ] Поддерживает русский язык
- [ ] Минимум 2 слова для запуска поиска

### US-003: Выбор ценового сегмента
**Как** стилист,
**я хочу** выбрать ценовой сегмент одним нажатием кнопки,
**чтобы** подборка соответствовала бюджету клиента.

**Сценарий:**
1. После подтверждения референса бот показывает кнопки сегментов
2. Стилист нажимает один из вариантов
3. Бот начинает поиск с фильтром по цене

**Кнопки и диапазоны цен:**
- «💰 Масс-маркет» → до 3 000 руб.
- «💳 Средний» → 3 000–15 000 руб.
- «💎 Премиум» → 15 000–50 000 руб.

**Критерий приёмки:**
- [ ] Три кнопки отображаются как Inline Keyboard
- [ ] Выбранный сегмент сохраняется в сессии
- [ ] Фильтр по цене применяется к результатам WB и Lamoda

### US-004: Получение подборки товаров
**Как** стилист,
**я хочу** получить список похожих вещей с фото, ценой и ссылкой,
**чтобы** быстро оценить варианты не переходя в браузер.

**Сценарий:**
1. Бот ищет товары на Wildberries и Lamoda
2. Показывает сообщение «Ищу похожие вещи... 🔍»
3. Возвращает 5–10 карточек товаров
4. Каждая карточка: фото + название + цена + магазин + кнопки «➕ В капсулу» / «🔗 Открыть»

**Критерий приёмки:**
- [ ] Минимум 3 результата возвращается (если меньше — расширить запрос)
- [ ] Каждый результат содержит: название, цена, URL, фото товара, магазин (WB/Lamoda)
- [ ] Время поиска < 30 секунд
- [ ] Карточки приходят как медиагруппа с подписями или отдельными сообщениями

### US-005: Сборка капсулы
**Как** стилист,
**я хочу** добавлять понравившиеся вещи в капсулу клиента,
**чтобы** собрать финальный образ из нескольких позиций.

**Сценарий:**
1. Стилист нажимает «➕ В капсулу» под карточкой товара
2. Бот спрашивает (первый раз): «Для какого клиента?» — текстом вводит имя
3. Товар добавляется в капсулу клиента
4. Бот подтверждает: «✅ Добавлено в капсулу Анны (3 вещи)»
5. Стилист продолжает добавлять или запрашивает PDF

**Критерий приёмки:**
- [ ] Имя клиента сохраняется в сессии (не спрашивать повторно в той же сессии)
- [ ] Одна капсула = один клиент = список товаров в Supabase
- [ ] Кнопка «📋 Моя капсула» показывает список добавленных вещей
- [ ] Можно удалить вещь из капсулы кнопкой «🗑️ Удалить»

### US-006: Генерация PDF-капсулы
**Как** стилист,
**я хочу** скачать PDF с подборкой вещей для клиента,
**чтобы** отправить ему красивый файл а не россыпь ссылок.

**Сценарий:**
1. Стилист нажимает «📄 Скачать PDF»
2. Бот: «Генерирую PDF... подождите 10–15 секунд»
3. Бот отправляет PDF-файл в чат
4. Имя файла: `capsule_[имя клиента]_[дата].pdf`

**Содержимое PDF:**
- Шапка: «Капсула для [Имя клиента]» + дата
- Каждая вещь: фото товара + название + цена + магазин + QR-код или короткий URL
- Итого: количество вещей + общая сумма

**Критерий приёмки:**
- [ ] PDF генерируется за < 20 секунд
- [ ] Файл весит < 10 МБ (оптимизация фото)
- [ ] Открывается на iPhone и Android без ошибок
- [ ] Выглядит чисто: белый фон, понятная сетка товаров

---

## БЛОК 2: Data Model

### Таблица: sessions
Хранит текущее состояние диалога стилиста с ботом.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'idle',
  -- state: idle | waiting_segment | searching | browsing_results | building_capsule
  current_query JSONB DEFAULT '{}',
  -- { "type": "photo|text", "description": "...", "item_type": "...", "color": "...", "style": "..." }
  current_segment TEXT DEFAULT 'mid',
  -- mass | mid | premium
  current_client_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_telegram_id ON sessions(telegram_id);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_sessions" ON sessions FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Таблица: search_results
Хранит результаты последнего поиска для кнопки «Добавить в капсулу».

```sql
CREATE TABLE search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  -- внешний ID товара на WB или Lamoda
  source TEXT NOT NULL CHECK (source IN ('wildberries', 'lamoda')),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  -- в рублях
  url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_results_telegram ON search_results(telegram_id);
CREATE INDEX idx_search_results_product ON search_results(product_id, source);
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_search_results" ON search_results FOR ALL USING (auth.role() = 'service_role');
```

### Таблица: capsules
Хранит капсулы стилиста по клиентам.

```sql
CREATE TABLE capsules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  client_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exported')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_capsules_telegram ON capsules(telegram_id);
CREATE INDEX idx_capsules_client ON capsules(telegram_id, client_name);
ALTER TABLE capsules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_capsules" ON capsules FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER capsules_updated_at BEFORE UPDATE ON capsules
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Таблица: capsule_items
Товары внутри капсулы.

```sql
CREATE TABLE capsule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id UUID NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('wildberries', 'lamoda')),
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_capsule_items_capsule ON capsule_items(capsule_id);
ALTER TABLE capsule_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_capsule_items" ON capsule_items FOR ALL USING (auth.role() = 'service_role');
```

### Таблица: bot_logs
Лог всех запросов для отладки.

```sql
CREATE TABLE bot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT,
  action TEXT NOT NULL,
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bot_logs_created ON bot_logs(created_at DESC);
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_bot_logs" ON bot_logs FOR ALL USING (auth.role() = 'service_role');
```

### Связи
```
sessions 1──1 telegram_id (уникальный стилист)
sessions 1──N search_results (результаты текущего поиска)
capsules N──1 telegram_id (несколько капсул у стилиста)
capsules 1──N capsule_items (товары в капсуле)
```

---

## БЛОК 3: Основные обработчики бота

> Бот использует node-telegram-bot-api в режиме polling (не webhook) для простоты на Railway.

### Команды

#### `/start`
**Действие:** Приветствие и инструкция по использованию.

**Ответ:**
```
👋 Привет! Я StyleFind — твой помощник по поиску вещей.

Отправь мне:
📸 Фото или скрин референса
✍️ Текстовое описание вещи

И я найду похожее на Wildberries и Lamoda!
```

#### `/capsule`
**Действие:** Показать текущую капсулу активного клиента.

**Ответ:** Список товаров в капсуле с кнопками удаления + кнопка «📄 Скачать PDF».

#### `/newclient`
**Действие:** Начать новую капсулу для нового клиента (сбросить current_client_name).

#### `/help`
**Действие:** Краткая инструкция по командам.

### Обработчик фото

**Триггер:** Пользователь отправляет фото.

**Алгоритм:**
```
1. Проверить STYLIST_TELEGRAM_ID — если не совпадает, игнорировать
2. Скачать фото через Telegram API (наибольший размер)
3. Конвертировать в base64
4. Отправить в Gemini Vision с промптом:
   "Опиши эту вещь одежды для поиска на маркетплейсе. 
    Верни JSON: { item_type, color, style, additional_details }"
5. Показать результат стилисту с кнопками подтверждения
6. Сохранить в sessions.current_query
```

**Gemini промпт для анализа фото:**
```
Ты помощник стилиста. Проанализируй вещь на фото и верни ТОЛЬКО JSON без markdown:
{
  "item_type": "тип вещи по-русски (пальто, джинсы, платье и т.д.)",
  "color": "основной цвет по-русски",
  "style": "casual | business | sport | evening | streetwear",
  "additional_details": "краткое описание: силуэт, длина, фактура (макс 10 слов)"
}
```

### Обработчик текста

**Триггер:** Пользователь отправляет текстовое сообщение (не команду).

**Алгоритм:**
```
1. Проверить STYLIST_TELEGRAM_ID
2. Отправить текст в Gemini с промптом для парсинга описания
3. Показать результат с кнопками подтверждения
4. Сохранить в sessions.current_query
```

**Gemini промпт для текста:**
```
Пользователь ищет вещь одежды. Его описание: "[текст пользователя]"
Верни ТОЛЬКО JSON без markdown:
{
  "item_type": "тип вещи по-русски",
  "color": "цвет по-русски или null",
  "style": "casual | business | sport | evening | streetwear | null",
  "additional_details": "дополнительные детали из описания (макс 10 слов)"
}
```

### Обработчик Callback Query (кнопки)

| callback_data | Действие |
|---------------|----------|
| `confirm_query` | Подтвердить референс → показать выбор сегмента |
| `edit_query` | Предложить описать текстом заново |
| `segment_mass` | Установить сегмент масс-маркет → запустить поиск |
| `segment_mid` | Установить сегмент средний → запустить поиск |
| `segment_premium` | Установить сегмент премиум → запустить поиск |
| `add_to_capsule:[product_id]:[source]` | Добавить товар в капсулу |
| `remove_from_capsule:[item_id]` | Удалить товар из капсулы |
| `download_pdf` | Сгенерировать и отправить PDF |
| `view_capsule` | Показать текущую капсулу |

---

## БЛОК 4: Поиск товаров

### Wildberries API

**Базовый URL поиска:**
```
GET https://search.wb.ru/exactmatch/ru/common/v4/search
  ?query=[поисковый запрос]
  &resultset=catalog
  &limit=10
  &priceU=[min_price*100]-[max_price*100]
  &sort=popular
  &page=1
```

**Формирование поискового запроса из current_query:**
```typescript
function buildSearchQuery(query: SearchQuery): string {
  const parts = [query.item_type];
  if (query.color) parts.push(query.color);
  if (query.additional_details) parts.push(query.additional_details);
  return parts.join(' ');
}
```

**Ценовые фильтры для WB (priceU = цена * 100):**
```typescript
const priceRanges = {
  mass: { min: 0, max: 300000 },      // до 3 000 руб.
  mid: { min: 300000, max: 1500000 }, // 3 000–15 000 руб.
  premium: { min: 1500000, max: 5000000 } // 15 000–50 000 руб.
};
```

**Пример ответа WB (нужные поля):**
```json
{
  "data": {
    "products": [
      {
        "id": 12345678,
        "name": "Пальто женское прямое",
        "priceU": 450000,
        "salePriceU": 389000,
        "brand": "ZARA",
        "pics": 3
      }
    ]
  }
}
```

**Формирование URL товара и фото WB:**
```typescript
const productUrl = `https://www.wildberries.ru/catalog/${product.id}/detail.aspx`;
const imageUrl = `https://basket-01.wb.ru/vol${Math.floor(product.id/100000)}/part${Math.floor(product.id/1000)}/${product.id}/images/big/1.jpg`;
```

### Lamoda поиск

**Метод:** Поиск через Google Custom Search API (бесплатно 100 запросов/день) с site:lamoda.ru.

**Запрос:**
```
GET https://www.googleapis.com/customsearch/v1
  ?key=[GOOGLE_API_KEY]
  &cx=[SEARCH_ENGINE_ID]
  &q=[запрос] site:lamoda.ru
  &num=5
```

> Альтернатива если Google CSE недоступен: прямой HTTP-запрос к Lamoda с парсингом через cheerio.

**Lamoda парсинг (запасной вариант):**
```typescript
async function searchLamoda(query: string, segment: Segment): Promise<Product[]> {
  const url = `https://www.lamoda.ru/catalogsearch/result/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0...' }
  });
  // парсинг через cheerio: селектор .product-card
}
```

---

## БЛОК 5: Генерация PDF

### Библиотека: pdf-lib (легче puppeteer, не требует браузера)

```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';

async function generateCapsulePDF(
  capsule: Capsule,
  items: CapsuleItem[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Страница 1: заголовок
  let page = pdfDoc.addPage([595, 842]); // A4
  page.drawText(`Капсула для ${capsule.client_name}`, {
    x: 50, y: 780, size: 24, font, color: rgb(0, 0, 0)
  });
  page.drawText(new Date().toLocaleDateString('ru-RU'), {
    x: 50, y: 750, size: 12, font, color: rgb(0.5, 0.5, 0.5)
  });
  
  // Сетка товаров: 2 колонки, 3 строки на страницу
  let x = 50, y = 700, col = 0;
  for (const item of items) {
    // Скачать и вставить фото товара
    const imageBytes = await fetch(item.image_url).then(r => r.arrayBuffer());
    const image = await pdfDoc.embedJpg(imageBytes);
    page.drawImage(image, { x, y: y - 150, width: 200, height: 150 });
    page.drawText(item.name.substring(0, 35), { x, y: y - 165, size: 9, font });
    page.drawText(`${item.price.toLocaleString('ru-RU')} руб.`, { x, y: y - 178, size: 10, font });
    page.drawText(item.source === 'wildberries' ? 'Wildberries' : 'Lamoda', {
      x, y: y - 190, size: 8, font, color: rgb(0.5, 0.5, 0.5)
    });
    
    col++;
    if (col === 2) { col = 0; x = 50; y -= 220; }
    else { x = 310; }
    if (y < 100) { page = pdfDoc.addPage([595, 842]); y = 750; x = 50; col = 0; }
  }
  
  // Итого
  const total = items.reduce((sum, i) => sum + i.price, 0);
  page.drawText(`Итого: ${total.toLocaleString('ru-RU')} руб. (${items.length} вещей)`, {
    x: 50, y: 50, size: 12, font
  });
  
  return Buffer.from(await pdfDoc.save());
}
```

---

## БЛОК 6: Edge Cases

### Сеть и API

| # | Ситуация | Триггер | Поведение системы |
|---|----------|---------|-------------------|
| 1 | Gemini API вернул ошибку | Любой запрос на анализ | Сообщение: «Не смог проанализировать фото. Опишите вещь текстом» |
| 2 | Gemini вернул невалидный JSON | Анализ фото/текста | Повторить запрос 1 раз, при повторной ошибке → попросить текстовое описание |
| 3 | WB API недоступен | Поиск | Искать только на Lamoda + сообщить «WB временно недоступен» |
| 4 | Lamoda недоступна | Поиск | Искать только на WB + сообщить «Lamoda временно недоступна» |
| 5 | Оба источника недоступны | Поиск | «Магазины временно недоступны. Попробуйте через 5 минут» |
| 6 | WB вернул 0 результатов | Поиск | Расширить запрос (убрать цвет) → повторить поиск |
| 7 | Фото товара не загружается для PDF | Генерация PDF | Вставить placeholder-изображение (серый прямоугольник) |
| 8 | PDF > 50 МБ | Генерация PDF | Уменьшить качество фото до 50%, пересгенерировать |

### Данные и состояние

| # | Ситуация | Триггер | Поведение системы |
|---|----------|---------|-------------------|
| 9 | Капсула пустая при запросе PDF | Нажатие «Скачать PDF» | «Капсула пуста. Добавьте вещи перед скачиванием» |
| 10 | Стилист отправляет не фото и не текст (видео, аудио, документ) | Любое сообщение | «Отправьте фото или текстовое описание вещи» |
| 11 | Сообщение от чужого Telegram ID | Любое сообщение | Молча игнорировать (не отвечать) |
| 12 | Стилист нажимает «В капсулу» без имени клиента | Callback add_to_capsule | Спросить имя клиента, сохранить ответ, затем добавить товар |
| 13 | Бот перезапустился — состояние session сброшено | После деплоя | Состояние берётся из Supabase, не теряется |

### Лимиты

| # | Ситуация | Триггер | Поведение системы |
|---|----------|---------|-------------------|
| 14 | Gemini free tier 1 500 запросов/день исчерпан | Анализ фото | Сообщение: «Дневной лимит AI исчерпан. Описывайте вещи текстом» → текстовый режим работает |
| 15 | Капсула > 20 вещей | Добавление в капсулу | Предупреждение: «В капсуле 20 вещей — рекомендуем скачать PDF и начать новую» |
| 16 | Фото > 20 МБ | Загрузка фото | «Фото слишком большое. Отправьте файл меньше 20 МБ» |

---

## БЛОК 7: Структура проекта

```
stylefind-bot/
├── src/
│   ├── index.ts              # Точка входа, инициализация бота
│   ├── bot/
│   │   ├── handlers/
│   │   │   ├── photo.ts      # Обработчик фото
│   │   │   ├── text.ts       # Обработчик текста
│   │   │   ├── callback.ts   # Обработчик кнопок
│   │   │   └── commands.ts   # /start, /capsule, /help
│   │   ├── keyboards.ts      # Inline keyboards
│   │   └── messages.ts       # Шаблоны сообщений
│   ├── services/
│   │   ├── gemini.ts         # Google Gemini API
│   │   ├── wildberries.ts    # WB поиск
│   │   ├── lamoda.ts         # Lamoda поиск/парсинг
│   │   ├── pdf.ts            # Генерация PDF
│   │   └── supabase.ts       # Работа с БД
│   ├── types/
│   │   └── index.ts          # TypeScript типы
│   └── utils/
│       ├── auth.ts           # Проверка STYLIST_TELEGRAM_ID
│       └── logger.ts         # Логирование
├── .env                      # Переменные окружения (не в git)
├── .env.example              # Пример переменных
├── package.json
├── tsconfig.json
└── railway.json              # Конфиг Railway
```

### Переменные окружения (.env)

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
STYLIST_TELEGRAM_ID=your_telegram_id

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Google Custom Search (для Lamoda)
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_cx_id

# App
NODE_ENV=development
LOG_LEVEL=info
```

### package.json (основные зависимости)

```json
{
  "dependencies": {
    "node-telegram-bot-api": "^0.64.0",
    "@google/generative-ai": "^0.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "pdf-lib": "^1.17.1",
    "node-fetch": "^3.3.2",
    "cheerio": "^1.0.0-rc.12",
    "dotenv": "^16.4.1"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.11.0",
    "@types/node-telegram-bot-api": "^0.64.4",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.3"
  },
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

---

## БЛОК 8: Метрики и мониторинг (личный тест)

| Метрика | Цель | Как отслеживать |
|---------|------|-----------------|
| Время анализа фото | < 10 сек | bot_logs.duration_ms для action=gemini_analysis |
| Время поиска товаров | < 30 сек | bot_logs.duration_ms для action=search |
| Время генерации PDF | < 20 сек | bot_logs.duration_ms для action=pdf_generate |
| Точность Gemini | > 70% «Верно» | считать callback confirm_query vs edit_query |
| Расход Gemini запросов | < 1 500/день | счётчик в bot_logs |
| Ошибки WB/Lamoda | < 10% запросов | bot_logs.error IS NOT NULL |

---

## БЛОК 9: Пошаговый запуск (Railway)

```bash
# 1. Клонировать/создать проект
mkdir stylefind-bot && cd stylefind-bot

# 2. Инициализация
npm init -y
npm install [зависимости из package.json]

# 3. Настроить .env по .env.example

# 4. Создать таблицы в Supabase
# Скопировать SQL из Блока 2 в Supabase SQL Editor → Run

# 5. Локальный запуск для теста
npm run dev

# 6. Деплой на Railway
# - Создать аккаунт на railway.app
# - New Project → Deploy from GitHub repo
# - Добавить все переменные из .env в Railway Variables
# - Railway автоматически запустит npm start
```
