import type TelegramBot from 'node-telegram-bot-api';
import { isAuthorized } from '../../utils/auth';
import { MESSAGES } from '../messages';
import { capsuleActionsKeyboard, capsuleItemKeyboard } from '../keyboards';
import {
  getOrCreateSession,
  updateSession,
  getActiveCapsule,
  getCapsuleItems,
} from '../../services/supabase';

export function registerCommands(bot: TelegramBot): void {
  bot.onText(/\/start/, handleStart(bot));
  bot.onText(/\/help/, handleHelp(bot));
  bot.onText(/\/newclient/, handleNewClient(bot));
  bot.onText(/\/capsule/, handleCapsule(bot));
  bot.onText(/\/outfit/, handleOutfit(bot));
}

function handleOutfit(bot: TelegramBot) {
  return async (msg: TelegramBot.Message) => {
    if (!isAuthorized(msg.from?.id)) return;
    const telegramId = msg.from!.id;
    await updateSession(telegramId, {
      state: 'collecting_outfit',
      current_query: { type: 'photo', item_type: '', color: null, style: null, additional_details: null, outfit_photo_ids: [] } as never,
    });
    await bot.sendMessage(msg.chat.id,
      `✨ *режим сборки образа*\n\nпришли до 5 фото — скриншоты с pinterest или референсы готового образа 📸\n\n_когда пришлёшь все фото — нажми кнопку ниже_`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔍 найти образ', callback_data: 'analyze_outfit' },
          ]],
        },
      }
    );
  };
}

function handleStart(bot: TelegramBot) {
  return async (msg: TelegramBot.Message) => {
    if (!isAuthorized(msg.from?.id)) return;
    await bot.sendMessage(msg.chat.id, MESSAGES.start, { parse_mode: 'Markdown' });
  };
}

function handleHelp(bot: TelegramBot) {
  return async (msg: TelegramBot.Message) => {
    if (!isAuthorized(msg.from?.id)) return;
    await bot.sendMessage(msg.chat.id, MESSAGES.help, { parse_mode: 'Markdown' });
  };
}

function handleNewClient(bot: TelegramBot) {
  return async (msg: TelegramBot.Message) => {
    if (!isAuthorized(msg.from?.id)) return;
    const telegramId = msg.from!.id;

    await updateSession(telegramId, {
      state: 'idle',
      current_client_name: null,
    });

    await bot.sendMessage(msg.chat.id, MESSAGES.newClientStarted);
  };
}

function handleCapsule(bot: TelegramBot) {
  return async (msg: TelegramBot.Message) => {
    if (!isAuthorized(msg.from?.id)) return;
    const telegramId = msg.from!.id;

    try {
      const session = await getOrCreateSession(telegramId);
      const clientName = session.current_client_name;

      if (!clientName) {
        await bot.sendMessage(msg.chat.id, MESSAGES.askClientName);
        return;
      }

      const capsule = await getActiveCapsule(telegramId, clientName);
      if (!capsule) {
        await bot.sendMessage(msg.chat.id, MESSAGES.capsuleEmpty(clientName), { parse_mode: 'Markdown' });
        return;
      }

      const items = await getCapsuleItems(capsule.id);
      if (items.length === 0) {
        await bot.sendMessage(msg.chat.id, MESSAGES.capsuleEmpty(clientName), { parse_mode: 'Markdown' });
        return;
      }

      await bot.sendMessage(
        msg.chat.id,
        MESSAGES.capsuleHeader(clientName, items.length),
        { parse_mode: 'Markdown' }
      );

      for (const item of items) {
        const storeLabel = item.source === 'wildberries' ? 'Wildberries' : 'Lamoda';
        const text = `*${item.name}*\n${item.price.toLocaleString('ru-RU')} руб. · ${storeLabel}`;
        await bot.sendMessage(msg.chat.id, text, {
          parse_mode: 'Markdown',
          reply_markup: capsuleItemKeyboard(item.id),
        });
      }

      await bot.sendMessage(msg.chat.id, '⬇️', {
        reply_markup: capsuleActionsKeyboard(),
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error('[commands] /capsule error:', error);
      await bot.sendMessage(msg.chat.id, '❌ Ошибка при загрузке капсулы.');
    }
  };
}
