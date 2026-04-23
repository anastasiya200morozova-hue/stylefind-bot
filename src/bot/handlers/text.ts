import type TelegramBot from 'node-telegram-bot-api';
import { isAuthorized } from '../../utils/auth';
import { MESSAGES } from '../messages';
import { confirmKeyboard } from '../keyboards';
import { parseTextQuery } from '../../services/gemini';
import type { SearchQuery } from '../../types';
import {
  getOrCreateSession,
  updateSession,
  getSearchResult,
  getOrCreateCapsule,
  addCapsuleItem,
  countCapsuleItems,
} from '../../services/supabase';

export function registerTextHandler(bot: TelegramBot): void {
  bot.on('message', async (msg) => {
    if (!isAuthorized(msg.from?.id)) return;

    // Пропускаем команды, фото, видео и прочее
    if (!msg.text || msg.text.startsWith('/')) return;
    if (msg.photo || msg.video || msg.voice || msg.document || msg.sticker) return;

    const telegramId = msg.from!.id;
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (text.length < 2) return;

    try {
      const session = await getOrCreateSession(telegramId);

      // ── Ожидаем имя клиента (после нажатия "В капсулу" без имени) ──
      if (session.state === 'building_capsule' && !session.current_client_name) {
        const clientName = text;
        await updateSession(telegramId, { current_client_name: clientName });

        // Если был ожидающий товар — добавляем его
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

            // Очищаем pending из current_query
            const cleanQuery: SearchQuery = {
              type: query.type,
              item_type: query.item_type,
              color: query.color,
              style: query.style,
              additional_details: query.additional_details,
            };
            await updateSession(telegramId, { current_query: cleanQuery });

            await bot.sendMessage(
              chatId,
              MESSAGES.addedToCapsule(clientName, count),
              { parse_mode: 'Markdown' }
            );

            if (count >= 20) {
              await bot.sendMessage(chatId, MESSAGES.capsuleWarning(count), { parse_mode: 'Markdown' });
            }
          }
        } else {
          await bot.sendMessage(chatId, `✅ Клиент: *${clientName}*. Отправь фото или описание вещи.`, {
            parse_mode: 'Markdown',
          });
        }
        return;
      }

      // ── Новый текстовый запрос ──
      if (text.split(' ').length < 2) {
        await bot.sendMessage(chatId, '⚠️ Напиши хотя бы 2 слова для поиска.');
        return;
      }

      await updateSession(telegramId, { state: 'idle', current_query: null });

      const statusMsg = await bot.sendMessage(chatId, MESSAGES.analyzingText);

      const query = await parseTextQuery(text, telegramId);

      await bot.deleteMessage(chatId, statusMsg.message_id);

      if (!query) {
        await bot.sendMessage(chatId, MESSAGES.geminiError);
        return;
      }

      await updateSession(telegramId, {
        state: 'waiting_segment',
        current_query: query,
      });

      await bot.sendMessage(chatId, MESSAGES.confirmQuery(query), {
        parse_mode: 'Markdown',
        reply_markup: confirmKeyboard(),
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error('[text handler]', error);
      await bot.sendMessage(chatId, '❌ Что-то пошло не так. Попробуй ещё раз.');
    }
  });
}
