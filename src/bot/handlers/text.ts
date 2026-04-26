import type TelegramBot from 'node-telegram-bot-api';
import { isAuthorized } from '../../utils/auth';
import { MESSAGES } from '../messages';
import { confirmKeyboard, afterAddKeyboard } from '../keyboards';
import { parseTextQuery } from '../../services/gemini';
import type { SearchQuery } from '../../types';
import {
  getOrCreateSession,
  updateSession,
  getSearchResult,
  getOrCreateCapsule,
  addCapsuleItem,
  countCapsuleItems,
  clearSearchResults,
  saveSearchResults,
} from '../../services/supabase';

// Определяем тип ссылки
const WB_REGEX = /wildberries\.ru\/catalog\/(\d+)/;
const LAMODA_REGEX = /lamoda\.ru\/p\/([a-z0-9]+)/i;
const PINTEREST_REGEX = /pinterest\.(ru|com)\/pin\//i;
const URL_REGEX = /https?:\/\/[^\s]+/i;

interface LinkInfo {
  type: 'wildberries' | 'lamoda' | 'pinterest' | 'unknown';
  url: string;
  productId?: string;
}

function detectLink(text: string): LinkInfo | null {
  const urlMatch = text.match(URL_REGEX);
  if (!urlMatch) return null;
  const url = urlMatch[0];

  const wbMatch = url.match(WB_REGEX);
  if (wbMatch) return { type: 'wildberries', url, productId: wbMatch[1] };

  const lamodaMatch = url.match(LAMODA_REGEX);
  if (lamodaMatch) return { type: 'lamoda', url, productId: lamodaMatch[1] };

  if (PINTEREST_REGEX.test(url)) return { type: 'pinterest', url };

  return { type: 'unknown', url };
}

async function fetchLamodaProduct(url: string): Promise<{
  name: string; price: number; image_url: string;
} | null> {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const exec = promisify(execFile);
    const { stdout } = await exec('curl', [
      '-s', '--max-time', '10',
      '-L',
      '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      '-H', 'Accept-Language: ru-RU,ru;q=0.9',
      url,
    ]);
    const ogTitle = stdout.match(/property="og:title"\s+content="([^"]+)"/)?.[1]
      ?? stdout.match(/content="([^"]+)"\s+property="og:title"/)?.[1]
      ?? stdout.match(/<title>([^<]+)<\/title>/)?.[1];

    // Цена: пробуем разные источники
    const ogPrice = stdout.match(/product:price:amount[^>]+content="([^"]+)"/)?.[1]
      ?? stdout.match(/content="([^"]+)"[^>]+product:price:amount/)?.[1]
      ?? stdout.match(/"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/)?.[1]
      ?? stdout.match(/"currentPrice"\s*:\s*(\d+)/)?.[1]
      ?? stdout.match(/data-price="(\d+)"/)?.[1];

    const ogImage = stdout.match(/property="og:image"\s+content="([^"]+)"/)?.[1]
      ?? stdout.match(/content="([^"]+)"\s+property="og:image"/)?.[1];

    const name = (ogTitle ?? 'Товар с Lamoda')
      .replace(' — купить в интернет-магазине Lamoda', '')
      .replace(' | Lamoda', '')
      .trim();
    const price = ogPrice ? Math.round(parseFloat(ogPrice)) : 0;
    return { name, price, image_url: ogImage ?? '' };
  } catch {
    return null;
  }
}

function wbImageUrl(id: number): string {
  const vol = Math.floor(id / 100000);
  const part = Math.floor(id / 1000);
  let b = 1;
  if (vol <= 143) b = 1; else if (vol <= 287) b = 2;
  else if (vol <= 431) b = 3; else if (vol <= 719) b = 4;
  else if (vol <= 1007) b = 5; else if (vol <= 1061) b = 6;
  else if (vol <= 1115) b = 7; else if (vol <= 1169) b = 8;
  else if (vol <= 1313) b = 9; else if (vol <= 1601) b = 10;
  else if (vol <= 1919) b = 12; else b = 13;
  return `https://basket-${String(b).padStart(2, '0')}.wbbasket.ru/vol${vol}/part${part}/${id}/images/big/1.jpg`;
}

async function fetchWbProduct(productId: string): Promise<{
  name: string; price: number; image_url: string;
}> {
  const numId = parseInt(productId, 10);
  // Картинку вычисляем всегда — не зависит от API
  const image_url = isNaN(numId) ? '' : wbImageUrl(numId);
  const fallback = { name: 'Товар с Wildberries', price: 0, image_url };

  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const exec = promisify(execFile);
    const apiUrl = `https://card.wb.ru/cards/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${productId}`;
    const { stdout } = await exec('curl', ['-s', '--max-time', '8',
      '-H', 'User-Agent: WBAndroid/3.0.3800',
      '-H', 'Accept: application/json', apiUrl]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = JSON.parse(stdout) as any;
    const p = json?.data?.products?.[0];
    if (!p) return fallback;
    return {
      name: p.name ?? 'Товар с Wildberries',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      price: Math.round((p.salePriceU ?? p.priceU ?? (p.sizes as any)?.[0]?.price?.total ?? 0) / 100),
      image_url,
    };
  } catch {
    return fallback;
  }
}

export function registerTextHandler(bot: TelegramBot): void {
  bot.on('message', async (msg) => {
    if (!isAuthorized(msg.from?.id)) return;

    if (!msg.text || msg.text.startsWith('/')) return;
    if (msg.photo || msg.video || msg.voice || msg.document || msg.sticker) return;

    const telegramId = msg.from!.id;
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (text.length < 2) return;

    try {
      const session = await getOrCreateSession(telegramId);

      // ── Проверяем ссылку ──
      const link = detectLink(text);
      if (link) {
        if (link.type === 'pinterest') {
          await bot.sendMessage(chatId,
            '📌 это pinterest! скинь саму картинку (скриншот) — найду похожее 🔍');
          return;
        }

        if (link.type === 'wildberries' && link.productId) {
          const statusMsg = await bot.sendMessage(chatId, '🔍 смотрю что это за вещь...');
          const info = await fetchWbProduct(link.productId);
          await bot.deleteMessage(chatId, statusMsg.message_id);

          const name = info?.name ?? 'Товар с Wildberries';
          const price = info?.price ?? 0;
          const imageUrl = info?.image_url ?? '';
          const priceText = price > 0 ? ` · ${price.toLocaleString('ru-RU')} ₽` : '';

          // Сохраняем в search_results чтобы потом добавить в капсулу
          const productId = `wb_url_${link.productId}`;
          await clearSearchResults(telegramId);
          await saveSearchResults(telegramId, session.id, [{
            product_id: productId, source: 'wildberries',
            name, price, url: link.url, image_url: imageUrl,
          }]);

          await bot.sendMessage(chatId,
            `🔥 *${name}*${priceText}\n_wildberries_\n\nдобавить в подборку?`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  { text: '✅ добавить', callback_data: `add_to_capsule:${productId}:wildberries` },
                  { text: '❌ не надо', callback_data: 'cancel_url' },
                ]],
              },
            });
          return;
        }

        if (link.type === 'lamoda' && link.productId) {
          const statusMsg = await bot.sendMessage(chatId, '🔍 смотрю что это за вещь...');
          const info = await fetchLamodaProduct(link.url);
          await bot.deleteMessage(chatId, statusMsg.message_id);

          const name = info?.name ?? 'Товар с Lamoda';
          const price = info?.price ?? 0;
          const imageUrl = info?.image_url ?? '';
          const priceText = price > 0 ? ` · ${price.toLocaleString('ru-RU')} ₽` : '';

          const productId = `la_url_${link.productId}`;
          await clearSearchResults(telegramId);
          await saveSearchResults(telegramId, session.id, [{
            product_id: productId, source: 'lamoda',
            name, price, url: link.url, image_url: imageUrl,
          }]);

          await bot.sendMessage(chatId,
            `🔥 *${name}*${priceText}\n_lamoda_\n\nдобавить в подборку?`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  { text: '✅ добавить', callback_data: `add_to_capsule:${productId}:lamoda` },
                  { text: '❌ не надо', callback_data: 'cancel_url' },
                ]],
              },
            });
          return;
        }

        await bot.sendMessage(chatId,
          'не знаю эту ссылку 😅 могу искать по wildberries и lamoda — напиши что ищешь');
        return;
      }

      // ── Ожидаем имя клиента ──
      if (session.state === 'building_capsule' && !session.current_client_name) {
        const clientName = text;
        await updateSession(telegramId, { current_client_name: clientName });

        const query = session.current_query as (SearchQuery & {
          pending_product_id?: string;
          pending_source?: string;
        }) | null;

        if (query?.pending_product_id && query?.pending_source) {
          const product = await getSearchResult(
            query.pending_product_id,
            query.pending_source as 'wildberries' | 'lamoda',
            telegramId
          );

          if (product) {
            const capsule = await getOrCreateCapsule(telegramId, clientName);
            await addCapsuleItem(capsule.id, telegramId, {
              product_id: product.product_id,
              source: product.source as 'wildberries' | 'lamoda',
              name: product.name,
              price: product.price,
              url: product.url,
              image_url: product.image_url,
            });
            const count = await countCapsuleItems(capsule.id);
            const cleanQuery: SearchQuery = {
              type: query.type, item_type: query.item_type,
              color: query.color, style: query.style,
              additional_details: query.additional_details,
            };
            await updateSession(telegramId, { current_query: cleanQuery });
            await bot.sendMessage(chatId, MESSAGES.addedToCapsule(clientName, count), { parse_mode: 'Markdown', reply_markup: afterAddKeyboard() });
            if (count >= 20) await bot.sendMessage(chatId, MESSAGES.capsuleWarning(count), { parse_mode: 'Markdown' });
          }
        } else {
          await bot.sendMessage(chatId,
            `✅ сохраняем для *${clientName}*. отправь фото или опиши вещь`,
            { parse_mode: 'Markdown' });
        }
        return;
      }

      // ── Обычный поисковый запрос ──
      await updateSession(telegramId, { state: 'idle', current_query: null });
      const statusMsg = await bot.sendMessage(chatId, MESSAGES.analyzingText);
      const query = await parseTextQuery(text, telegramId);
      await bot.deleteMessage(chatId, statusMsg.message_id);

      await updateSession(telegramId, { state: 'waiting_segment', current_query: query });
      if (query) {
        await bot.sendMessage(chatId, MESSAGES.confirmQuery(query), {
          parse_mode: 'Markdown',
          reply_markup: confirmKeyboard(),
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error('[text handler]', error);
      await bot.sendMessage(chatId, '❌ что-то пошло не так, попробуй ещё раз');
    }
  });
}
