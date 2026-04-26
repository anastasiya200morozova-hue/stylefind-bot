import { GoogleGenAI } from '@google/genai';
import type { SearchQuery, ItemStyle } from '../types';
import { log } from '../utils/logger';

// ─── Fallback: парсим текст без Gemini ───────────────────────────────────────
const COLORS = ['белый', 'чёрный', 'черный', 'серый', 'бежевый', 'коричневый', 'синий', 'голубой',
  'красный', 'розовый', 'зелёный', 'зеленый', 'жёлтый', 'желтый', 'оранжевый', 'фиолетовый',
  'бордовый', 'хаки', 'молочный', 'кремовый', 'темный', 'тёмный', 'светлый', 'яркий', 'белые',
  'чёрные', 'серые', 'синие', 'голубые', 'красные', 'зелёные', 'коричневые', 'бежевые'];
const ITEM_TYPES = ['джинсы', 'брюки', 'штаны', 'платье', 'платья', 'юбка', 'юбки', 'блуза', 'блузка',
  'рубашка', 'рубашки', 'свитер', 'худи', 'толстовка', 'куртка', 'куртки', 'пальто', 'тренч',
  'пуховик', 'жакет', 'пиджак', 'футболка', 'футболки', 'топ', 'шорты', 'кардиган', 'жилет',
  'комбинезон', 'костюм', 'сарафан', 'лонгслив', 'лосины', 'легинсы', 'леггинсы', 'лосины',
  'свитшот', 'водолазка', 'боди', 'туника', 'платье-рубашка', 'ветровка', 'бомбер', 'парка',
  'плащ', 'жилетка', 'блейзер', 'кепка', 'шапка', 'шарф', 'перчатки', 'носки', 'колготки',
  'купальник', 'бикини', 'купальник', 'пижама', 'халат'];
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
  // Если тип не найден — используем первое существительное (первое слово)
  const item_type = ITEM_TYPES.find(t => lower.includes(t)) ?? words[0];
  const color = COLORS.find(c => lower.includes(c)) ?? null;
  const style = Object.entries(STYLES).find(([k]) => lower.includes(k))?.[1] ?? null;
  const details = words
    .filter(w => w.length > 3 && w !== item_type && !COLORS.includes(w))
    .slice(0, 3).join(' ') || null;
  return { type: 'text', item_type, color, style, additional_details: details };
}

const PHOTO_PROMPT = `Ты помощник стилиста. Проанализируй вещь на фото и верни ТОЛЬКО JSON без markdown:
{
  "item_type": "тип вещи по-русски (пальто, джинсы, платье и т.д.)",
  "color": "основной цвет по-русски",
  "style": "casual | business | sport | evening | streetwear",
  "additional_details": "краткое описание: силуэт, длина, фактура (макс 10 слов)"
}`;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY не задан');
  return new GoogleGenAI({ apiKey });
}

function parseGeminiJson(text: string): SearchQuery | null {
  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(clean) as {
      item_type?: string;
      color?: string | null;
      style?: string | null;
      additional_details?: string | null;
    };
    if (!parsed.item_type) return null;
    return {
      type: 'photo',
      item_type: parsed.item_type,
      color: parsed.color ?? null,
      style: (parsed.style as ItemStyle) ?? null,
      additional_details: parsed.additional_details ?? null,
    };
  } catch {
    return null;
  }
}

export async function analyzePhoto(
  base64Image: string,
  telegramId: number
): Promise<SearchQuery | null> {
  const start = Date.now();
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: PHOTO_PROMPT },
        ],
      }],
    });

    const text = response.text ?? '';
    let query = parseGeminiJson(text);

    if (!query) {
      const retry = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: PHOTO_PROMPT },
          ],
        }],
      });
      query = parseGeminiJson(retry.text ?? '');
    }

    if (query) query.type = 'photo';
    await log('gemini_analysis', { type: 'photo' }, { success: !!query }, Date.now() - start, undefined, telegramId);
    return query;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await log('gemini_analysis', { type: 'photo' }, {}, Date.now() - start, error, telegramId);
    return null;
  }
}

export async function parseTextQuery(
  text: string,
  telegramId: number
): Promise<SearchQuery | null> {
  const start = Date.now();
  const prompt = `Пользователь ищет вещь одежды. Его описание: "${text}"
Верни ТОЛЬКО JSON без markdown:
{
  "item_type": "тип вещи по-русски",
  "color": "цвет по-русски или null",
  "style": "casual | business | sport | evening | streetwear | null",
  "additional_details": "дополнительные детали из описания (макс 10 слов)"
}`;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: prompt }] }],
    });

    let query = parseGeminiJson(response.text ?? '');

    if (!query) {
      const retry = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ parts: [{ text: prompt }] }],
      });
      query = parseGeminiJson(retry.text ?? '');
    }

    if (query) query.type = 'text';
    const result = query ?? parseFallback(text);
    await log('gemini_analysis', { type: 'text', text }, { success: !!query }, Date.now() - start, undefined, telegramId);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await log('gemini_analysis', { type: 'text', fallback: true }, {}, Date.now() - start, error, telegramId);
    return parseFallback(text);
  }
}
