import OpenAI from 'openai';
import type { SearchQuery, ItemStyle } from '../types';
import { log } from '../utils/logger';

// ─── Fallback: парсим текст без AI ───────────────────────────────────────────
const COLORS = ['белый', 'чёрный', 'черный', 'серый', 'бежевый', 'коричневый', 'синий', 'голубой',
  'красный', 'розовый', 'зелёный', 'зеленый', 'жёлтый', 'желтый', 'оранжевый', 'фиолетовый',
  'бордовый', 'хаки', 'молочный', 'кремовый', 'темный', 'тёмный', 'светлый', 'яркий', 'белые',
  'чёрные', 'серые', 'синие', 'голубые', 'красные', 'зелёные', 'коричневые', 'бежевые'];
const ITEM_TYPES = ['джинсы', 'брюки', 'штаны', 'платье', 'платья', 'юбка', 'юбки', 'блуза', 'блузка',
  'рубашка', 'рубашки', 'свитер', 'худи', 'толстовка', 'куртка', 'куртки', 'пальто', 'тренч',
  'пуховик', 'жакет', 'пиджак', 'футболка', 'футболки', 'топ', 'шорты', 'кардиган', 'жилет',
  'комбинезон', 'костюм', 'сарафан', 'лонгслив', 'лосины', 'легинсы', 'леггинсы',
  'свитшот', 'водолазка', 'боди', 'туника', 'ветровка', 'бомбер', 'парка',
  'плащ', 'жилетка', 'блейзер', 'кепка', 'шапка', 'шарф', 'перчатки', 'носки', 'колготки',
  'купальник', 'бикини', 'пижама', 'халат', 'кроссовки', 'туфли', 'ботинки', 'сапоги', 'кеды'];
const STYLES: Record<string, ItemStyle> = {
  'спорт': 'sport', 'спортивный': 'sport', 'спортивная': 'sport',
  'деловой': 'business', 'деловая': 'business', 'офис': 'business', 'офисный': 'business',
  'вечерний': 'evening', 'вечерняя': 'evening', 'нарядный': 'evening',
  'уличный': 'streetwear', 'уличная': 'streetwear', 'стрит': 'streetwear',
  'повседневный': 'casual', 'повседневная': 'casual', 'casual': 'casual',
};

function parseFallback(text: string): SearchQuery {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const item_type = ITEM_TYPES.find(t => lower.includes(t)) ?? words[0];
  const color = COLORS.find(c => lower.includes(c)) ?? null;
  const style = Object.entries(STYLES).find(([k]) => lower.includes(k))?.[1] ?? null;
  const details = words
    .filter(w => w.length > 3 && w !== item_type && !COLORS.includes(w))
    .slice(0, 3).join(' ') || null;
  return { type: 'text', item_type, color, style, additional_details: details };
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY не задан');
  return new OpenAI({ apiKey });
}

const PHOTO_PROMPT = `Ты опытный стилист и знаешь как искать одежду на wildberries и lamoda.
Проанализируй вещь на фото и верни ТОЛЬКО JSON без markdown:
{
  "item_type": "тип вещи по-русски (пальто, джинсы, платье и т.д.)",
  "color": "основной цвет по-русски",
  "style": "casual | business | sport | evening | streetwear",
  "additional_details": "силуэт, длина, фактура (макс 10 слов)",
  "search_query": "готовый поисковый запрос для wildberries — максимально точный, как реально ищут на маркетплейсе. Например: широкие джинсы прямой крой черные оверсайз женские"
}`;

const TEXT_PROMPT = (text: string) => `Пользователь ищет вещь одежды. Его описание: "${text}"
Верни ТОЛЬКО JSON без markdown:
{
  "item_type": "тип вещи по-русски",
  "color": "цвет по-русски или null",
  "style": "casual | business | sport | evening | streetwear | null",
  "additional_details": "дополнительные детали из описания (макс 10 слов)"
}`;

function parseJson(text: string): SearchQuery | null {
  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(clean) as {
      item_type?: string; color?: string | null;
      style?: string | null; additional_details?: string | null;
      search_query?: string | null;
    };
    if (!parsed.item_type) return null;
    return {
      type: 'photo',
      item_type: parsed.item_type,
      color: parsed.color ?? null,
      style: (parsed.style as ItemStyle) ?? null,
      // Используем search_query как additional_details для лучшего поиска
      additional_details: parsed.search_query ?? parsed.additional_details ?? null,
    };
  } catch { return null; }
}

export async function analyzePhoto(base64Image: string, telegramId: number): Promise<SearchQuery | null> {
  const start = Date.now();
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'low' } },
          { type: 'text', text: PHOTO_PROMPT },
        ],
      }],
    });

    const text = response.choices[0]?.message?.content ?? '';
    const query = parseJson(text);
    if (query) query.type = 'photo';
    await log('gemini_analysis', { type: 'photo' }, { success: !!query }, Date.now() - start, undefined, telegramId);
    return query;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await log('gemini_analysis', { type: 'photo' }, {}, Date.now() - start, error, telegramId);
    return null;
  }
}

export async function parseTextQuery(text: string, telegramId: number): Promise<SearchQuery> {
  const start = Date.now();
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [{ role: 'user', content: TEXT_PROMPT(text) }],
    });

    const content = response.choices[0]?.message?.content ?? '';
    const query = parseJson(content);
    const result = query ?? parseFallback(text);
    result.type = 'text';
    await log('gemini_analysis', { type: 'text', text }, { success: !!query }, Date.now() - start, undefined, telegramId);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await log('gemini_analysis', { type: 'text', fallback: true }, {}, Date.now() - start, error, telegramId);
    return parseFallback(text);
  }
}

// ─── Анализ образа из нескольких фото ────────────────────────────────────────
export interface OutfitItem {
  item_type: string;
  color: string | null;
  style: string | null;
  additional_details: string | null;
}

export async function analyzeOutfit(
  base64Images: string[],
  telegramId: number
): Promise<OutfitItem[]> {
  const start = Date.now();
  const prompt = `Ты опытный стилист. Внимательно изучи фото образа и определи все предметы одежды и обуви.

Верни ТОЛЬКО JSON без markdown:
{
  "items": [
    {
      "item_type": "максимально точный тип вещи по-русски (например: широкие джинсы, оверсайз худи, кожаные ботинки)",
      "color": "точный цвет по-русски",
      "style": "casual|business|sport|evening|streetwear",
      "additional_details": "силуэт, фасон, длина, особенности (макс 10 слов)"
    }
  ]
}

Правила:
- Включай только одежду и обувь
- Будь максимально конкретным в названии (не просто "брюки", а "широкие брюки прямой крой")
- Описывай именно то что видишь на фото
- Если несколько фото — определи уникальные вещи из всех фото`;

  try {
    const client = getClient();
    const imageContent = base64Images.map(b64 => ({
      type: 'image_url' as const,
      image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'low' as const },
    }));

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: [...imageContent, { type: 'text' as const, text: prompt }],
      }],
    });

    const text = response.choices[0]?.message?.content ?? '';
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(clean) as { items: OutfitItem[] };
    await log('outfit_analysis', { photoCount: base64Images.length }, { itemCount: parsed.items.length }, Date.now() - start, undefined, telegramId);
    return parsed.items ?? [];
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await log('outfit_analysis', { photoCount: base64Images.length }, {}, Date.now() - start, error, telegramId);
    return [];
  }
}
