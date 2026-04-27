import type TelegramBot from 'node-telegram-bot-api';
import { isAuthorized } from '../../utils/auth';
import { MESSAGES } from '../messages';
import { confirmKeyboard } from '../keyboards';
import { analyzePhoto } from '../../services/gemini';
import { getOrCreateSession, updateSession } from '../../services/supabase';
import type { SearchQuery } from '../../types';

const MAX_PHOTO_SIZE = 20 * 1024 * 1024;

export function registerPhotoHandler(bot: TelegramBot): void {
  bot.on('photo', async (msg) => {
    if (!isAuthorized(msg.from?.id)) return;

    const telegramId = msg.from!.id;
    const chatId = msg.chat.id;

    try {
      const photos = msg.photo!;
      const largest = photos[photos.length - 1];

      if (largest.file_size && largest.file_size > MAX_PHOTO_SIZE) {
        await bot.sendMessage(chatId, MESSAGES.photoTooLarge);
        return;
      }

      const session = await getOrCreateSession(telegramId);

      // ── Режим сборки образа ──
      if (session.state === 'collecting_outfit') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query = (session.current_query as any) ?? {};
        const photoIds: string[] = query.outfit_photo_ids ?? [];

        if (photoIds.length >= 5) {
          await bot.sendMessage(chatId, 'уже 5 фото — нажми *найти образ* 👇', { parse_mode: 'Markdown' });
          return;
        }

        photoIds.push(largest.file_id);
        await updateSession(telegramId, {
          current_query: { ...query, outfit_photo_ids: photoIds } as never,
        });

        const remaining = 5 - photoIds.length;
        if (photoIds.length < 5) {
          await bot.sendMessage(chatId,
            `📸 фото ${photoIds.length} получила!${remaining > 0 ? ` можешь прислать ещё ${remaining}` : ''}\n\nили нажми кнопку ниже 👇`,
            {
              reply_markup: {
                inline_keyboard: [[
                  { text: '🔍 найти образ', callback_data: 'analyze_outfit' },
                ]],
              },
            }
          );
        } else {
          await bot.sendMessage(chatId, '5 фото получила! нажми *найти образ* 👇',
            {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [[{ text: '🔍 найти образ', callback_data: 'analyze_outfit' }]] },
            }
          );
        }
        return;
      }

      // ── Обычный режим ──
      await updateSession(telegramId, { state: 'idle', current_query: null });
      const statusMsg = await bot.sendMessage(chatId, MESSAGES.analyzingPhoto);

      const fileLink = await bot.getFileLink(largest.file_id);
      const response = await fetch(fileLink, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Не удалось скачать фото');

      const base64 = Buffer.from(await response.arrayBuffer()).toString('base64');
      const query = await analyzePhoto(base64, telegramId);

      await bot.deleteMessage(chatId, statusMsg.message_id);

      if (!query) {
        await bot.sendMessage(chatId, MESSAGES.geminiError);
        return;
      }

      await updateSession(telegramId, {
        state: 'waiting_segment',
        current_query: query as SearchQuery,
      });

      await bot.sendMessage(chatId, MESSAGES.confirmQuery(query), {
        parse_mode: 'Markdown',
        reply_markup: confirmKeyboard(),
      });
    } catch (err) {
      console.error('[photo handler]', err instanceof Error ? err.message : err);
      await bot.sendMessage(chatId, MESSAGES.geminiError);
    }
  });
}
