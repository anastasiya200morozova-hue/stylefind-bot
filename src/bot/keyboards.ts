import type TelegramBot from 'node-telegram-bot-api';

export function confirmKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [[
      { text: '✅ верно', callback_data: 'confirm_query' },
      { text: '✏️ уточнить', callback_data: 'edit_query' },
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

const SHOES = ['кроссовки','туфли','ботинки','сапоги','кеды','мокасины','лоферы','сандалии','тапки','слипоны','кроссовок','обувь','угги','балетки','мюли'];
const JEANS = ['джинсы','джинс'];
const TOPS = ['футболка','майка','блуза','блузка','рубашка','свитер','худи','толстовка','куртка','пальто','тренч','пуховик','жакет','пиджак','кардиган','жилет','блейзер','ветровка','бомбер','парка','водолазка','боди','туника','лонгслив','свитшот','топ','платье','сарафан','комбинезон'];
const BOTTOMS = ['брюки','штаны','юбка','лосины','леггинсы','легинсы','шорты'];
const NO_SIZE = ['сумка','пояс','шарф','шапка','кепка','перчатки','ремень','очки','украшения','браслет','колье','серьги'];

export type SizeCategory = 'shoes' | 'jeans' | 'clothes' | 'none';

export function detectSizeCategory(itemType: string): SizeCategory {
  const t = itemType.toLowerCase();
  if (NO_SIZE.some(w => t.includes(w))) return 'none';
  if (SHOES.some(w => t.includes(w))) return 'shoes';
  if (JEANS.some(w => t.includes(w))) return 'jeans';
  if (TOPS.some(w => t.includes(w)) || BOTTOMS.some(w => t.includes(w))) return 'clothes';
  return 'clothes'; // default
}

export function sizeKeyboard(category: SizeCategory): TelegramBot.InlineKeyboardMarkup | null {
  if (category === 'none') return null;

  if (category === 'shoes') {
    return {
      inline_keyboard: [
        [{ text: '36', callback_data: 'size:36' }, { text: '37', callback_data: 'size:37' }, { text: '38', callback_data: 'size:38' }, { text: '39', callback_data: 'size:39' }],
        [{ text: '40', callback_data: 'size:40' }, { text: '41', callback_data: 'size:41' }, { text: '42', callback_data: 'size:42' }, { text: '43', callback_data: 'size:43' }],
        [{ text: '44', callback_data: 'size:44' }, { text: '45', callback_data: 'size:45' }, { text: '46', callback_data: 'size:46' }, { text: '47', callback_data: 'size:47' }],
        [{ text: 'пропустить →', callback_data: 'size:skip' }],
      ],
    };
  }

  if (category === 'jeans') {
    return {
      inline_keyboard: [
        [{ text: '25', callback_data: 'size:25' }, { text: '26', callback_data: 'size:26' }, { text: '27', callback_data: 'size:27' }, { text: '28', callback_data: 'size:28' }],
        [{ text: '29', callback_data: 'size:29' }, { text: '30', callback_data: 'size:30' }, { text: '31', callback_data: 'size:31' }, { text: '32', callback_data: 'size:32' }],
        [{ text: '33', callback_data: 'size:33' }, { text: '34', callback_data: 'size:34' }, { text: '36', callback_data: 'size:36' }, { text: '38', callback_data: 'size:38' }],
        [{ text: 'пропустить →', callback_data: 'size:skip' }],
      ],
    };
  }

  // clothes
  return {
    inline_keyboard: [
      [{ text: 'XS', callback_data: 'size:XS' }, { text: 'S', callback_data: 'size:S' }, { text: 'M', callback_data: 'size:M' }, { text: 'L', callback_data: 'size:L' }],
      [{ text: 'XL', callback_data: 'size:XL' }, { text: 'XXL', callback_data: 'size:XXL' }, { text: '3XL', callback_data: 'size:3XL' }],
      [{ text: '42', callback_data: 'size:42' }, { text: '44', callback_data: 'size:44' }, { text: '46', callback_data: 'size:46' }, { text: '48', callback_data: 'size:48' }],
      [{ text: '50', callback_data: 'size:50' }, { text: '52', callback_data: 'size:52' }, { text: '54', callback_data: 'size:54' }],
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
