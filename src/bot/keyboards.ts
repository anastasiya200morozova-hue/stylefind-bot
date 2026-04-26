import type TelegramBot from 'node-telegram-bot-api';

export function confirmKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [[
      { text: '✅ Верно', callback_data: 'confirm_query' },
      { text: '✏️ Уточнить', callback_data: 'edit_query' },
    ]],
  };
}

export function segmentKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'до 3 000 ₽', callback_data: 'segment_mass' }],
      [{ text: '3 000 — 15 000 ₽', callback_data: 'segment_mid' }],
      [{ text: 'от 15 000 ₽', callback_data: 'segment_premium' }],
    ],
  };
}

export function productKeyboard(
  productId: string,
  source: string,
  url: string
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [[
      { text: '➕ В капсулу', callback_data: `add_to_capsule:${productId}:${source}` },
      { text: '🔗 Открыть', url },
    ]],
  };
}

export function capsuleItemKeyboard(itemId: string): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [[
      { text: '🗑️ Удалить', callback_data: `remove_from_capsule:${itemId}` },
    ]],
  };
}

export function capsuleActionsKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [[
      { text: '📄 Скачать PDF', callback_data: 'download_pdf' },
    ]],
  };
}

export function afterAddKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: '📋 посмотреть подборку', callback_data: 'view_capsule' }],
      [{ text: '🔍 искать ещё', callback_data: 'search_more' }],
      [{ text: '📄 скачать pdf', callback_data: 'download_pdf' }],
    ],
  };
}
