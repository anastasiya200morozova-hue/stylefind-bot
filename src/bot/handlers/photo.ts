import type TelegramBot from 'node-telegram-bot-api';
import { isAuthorized } from '../../utils/auth';
import { MESSAGES } from '../messages';
import { confirmKeyboard } from '../keyboards';
import { analyzePhoto } from '../../services/gemini';
import { getOrCreateSession, updateSession } from '../../services/supabase';

const MAX_PHOTO_SIZE = 20 * 1024 * 1024; // 20 МБ

export function registerPhotoHandler(bot: TelegramBot): void {
  bot.on('photo', async (msg) => {
    if (!isAuthorized(msg.from?.id)) return;

    const telegramId = msg.from!.id;
    const chatId = msg.chat.id;

    try {
      // Берём фото максимального размера
      const photos = msg.photo!;
      const largest = photos[photos.length - 1];

      if (largest.file_size && largest.file_size > MAX_PHOTO_SIZE) {
        await bot.sendMessage(chatId, MESSAGES.photoTooLarge);
        return;
      }

      // Сбрасываем состояние при новом фото
      await updateSession(telegramId, { state: 'idle', current_query: null });

      const statusMsg = await bot.sendMessage(chatId, MESSAGES.analyzingPhoto);

      // Скачиваем фото
      const fileLink = await bot.getFileLink(largest.file_id);
      const response = await fetch(fileLink, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Не удалось скачать фото');

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      // Анализируем через Gemini
      const query = await analyzePhoto(base64, telegramId);

      await bot.deleteMessage(chatId, statusMsg.message_id);

      if (!query) {
        await bot.sendMessage(chatId, MESSAGES.geminiError);
        return;
      }

      // Сохраняем в сессию и ждём подтверждения
      const session = await getOrCreateSession(telegramId);
      await updateSession(telegramId, {
        state: 'waiting_segment',
        current_query: query,
      });

      await bot.sendMessage(chatId, MESSAGES.confirmQuery(query), {
        parse_mode: 'Markdown',
        reply_markup: confirmKeyboard(),
      });

      void session; // используется выше через getOrCreateSession
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error('[photo handler]', error);
      await bot.sendMessage(chatId, MESSAGES.geminiError);
    }
  });
}
