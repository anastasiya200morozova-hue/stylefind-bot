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

export function sizeKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: 'XS', callback_data: 'size:XS' },
        { text: 'S', callback_data: 'size:S' },
        { text: 'M', callback_data: 'size:M' },
        { text: 'L', callback_data: 'size:L' },
        { text: 'XL', callback_data: 'size:XL' },
        { text: 'XXL', callback_data: 'size:XXL' },
      ],
      [
        { text: '36', callback_data: 'size:36' },
        { text: '37', callback_data: 'size:37' },
        { text: '38', callback_data: 'size:38' },
        { text: '39', callback_data: 'size:39' },
        { text: '40', callback_data: 'size:40' },
        { text: '41', callback_data: 'size:41' },
      ],
      [
        { text: '42', callback_data: 'size:42' },
        { text: '43', callback_data: 'size:43' },
        { text: '44', callback_data: 'size:44' },
        { text: '46', callback_data: 'size:46' },
        { text: '48', callback_data: 'size:48' },
        { text: '50', callback_data: 'size:50' },
      ],
      [{ text: 'пропустить →', callback_data: 'size:skip' }],
    ],
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
