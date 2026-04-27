import type TelegramBot from 'node-telegram-bot-api';
import { isAuthorized } from '../../utils/auth';
import { MESSAGES } from '../messages';
import { segmentKeyboard, productKeyboard, afterAddKeyboard, sizeKeyboard, detectSizeCategory } from '../keyboards';
import { searchWildberries } from '../../services/wildberries';
import { searchLamoda } from '../../services/lamoda';
import { generateCapsulePDF } from '../../services/pdf';
import type { Segment, Product, SearchQuery } from '../../types';

function buildFallbackSearchText(query: SearchQuery): string {
  const parts = [query.item_type];
  if (query.color) parts.push(query.color);
  if (query.additional_details) parts.push(query.additional_details);
  return parts.join(' ');
}
import {
  getOrCreateSession,
  updateSession,
  clearSearchResults,
  saveSearchResults,
  getSearchResult,
  getOrCreateCapsule,
  addCapsuleItem,
  countCapsuleItems,
  removeCapsuleItem,
  getCapsuleItems,
  setCapsuleExported,
  getActiveCapsule,
} from '../../services/supabase';

export function registerCallbackHandler(bot: TelegramBot): void {
  bot.on('callback_query', async (query) => {
    if (!isAuthorized(query.from?.id)) return;

    const telegramId = query.from.id;
    const chatId = query.message?.chat.id;
    const data = query.data ?? '';

    if (!chatId) return;

    await bot.answerCallbackQuery(query.id);

    try {
      if (data === 'confirm_query') {
        await handleConfirmQuery(bot, chatId);
      } else if (data === 'edit_query') {
        await handleEditQuery(bot, chatId, telegramId);
      } else if (data.startsWith('segment_')) {
        const segment = data.replace('segment_', '') as Segment;
        await updateSession(telegramId, { state: 'choosing_size', current_segment: segment });
        const session = await getOrCreateSession(telegramId);
        const query = session.current_query as unknown as SearchQuery | null;
        const category = detectSizeCategory(query?.item_type ?? '');
        const keyboard = sizeKeyboard(category);
        if (!keyboard) {
          // Для аксессуаров размер не нужен — сразу ищем
          await handleSegment(bot, chatId, telegramId, segment);
        } else {
          const hint = category === 'shoes' ? 'размер обуви 👟' : category === 'jeans' ? 'размер джинс (обхват талии) 👖' : 'размер одежды 👕';
          await bot.sendMessage(chatId, `выбери ${hint} или пропусти 👇`, {
            reply_markup: keyboard,
          });
        }
      } else if (data.startsWith('size:')) {
        const size = data.split(':')[1];
        await handleSizeAndSearch(bot, chatId, telegramId, size);
      } else if (data.startsWith('add_to_capsule:')) {
        const parts = data.split(':');
        if (parts.length !== 3) return;
        await handleAddToCapsule(bot, chatId, telegramId, parts[1], parts[2] as 'wildberries' | 'lamoda');
      } else if (data.startsWith('remove_from_capsule:')) {
        const itemId = data.split(':')[1];
        if (itemId) await handleRemoveFromCapsule(bot, chatId, itemId);
      } else if (data === 'download_pdf') {
        await handleDownloadPdf(bot, chatId, telegramId);
      } else if (data === 'cancel_url') {
        await bot.sendMessage(chatId, 'окей, не добавляем 👌');
      } else if (data === 'search_more') {
        await bot.sendMessage(chatId, '🔍 окей! напиши что ищем или скинь фото');
      } else if (data === 'view_capsule') {
        await handleViewCapsule(bot, chatId, telegramId);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error('[callback]', data, error);
      await bot.sendMessage(chatId, '❌ что-то пошло не так, попробуй ещё раз');
    }
  });
}

async function handleSizeAndSearch(bot: TelegramBot, chatId: number, telegramId: number, size: string) {
  const session = await getOrCreateSession(telegramId);
  if (!session.current_query) {
    await bot.sendMessage(chatId, '⚠️ сначала отправь фото или описание вещи');
    return;
  }

  // Добавляем размер к запросу если выбран
  let query = session.current_query as unknown as SearchQuery;
  if (size !== 'skip') {
    query = {
      ...query,
      additional_details: query.additional_details
        ? `${query.additional_details} размер ${size}`
        : `размер ${size}`,
    };
    await updateSession(telegramId, { current_query: query });
  }

  await handleSegment(bot, chatId, telegramId, session.current_segment as Segment ?? 'mid');
}

async function handleConfirmQuery(bot: TelegramBot, chatId: number) {
  await bot.sendMessage(chatId, MESSAGES.chooseSegment, {
    reply_markup: segmentKeyboard(),
  });
}

async function handleEditQuery(bot: TelegramBot, chatId: number, telegramId: number) {
  await updateSession(telegramId, { state: 'idle', current_query: null });
  await bot.sendMessage(chatId, '✏️ Опиши вещь текстом или отправь другое фото.');
}

async function handleSegment(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  segment: Segment
) {
  await updateSession(telegramId, { state: 'searching', current_segment: segment });

  const session = await getOrCreateSession(telegramId);
  if (!session.current_query) {
    await bot.sendMessage(chatId, '⚠️ Сначала отправь фото или описание вещи.');
    return;
  }

  const statusMsg = await bot.sendMessage(chatId, MESSAGES.searching);

  const currentQuery = session.current_query as unknown as SearchQuery;

  // Запускаем поиск параллельно
  const [wbResult, lamodaResult] = await Promise.allSettled([
    searchWildberries(currentQuery, segment, telegramId),
    searchLamoda(currentQuery, segment, telegramId),
  ]);

  const wbOk = wbResult.status === 'fulfilled';
  const lamodaOk = lamodaResult.status === 'fulfilled';

  if (!wbOk) await bot.sendMessage(chatId, MESSAGES.wbUnavailable);
  if (!lamodaOk) await bot.sendMessage(chatId, MESSAGES.lamodaUnavailable);

  if (!wbOk && !lamodaOk) {
    await bot.deleteMessage(chatId, statusMsg.message_id);
    await bot.sendMessage(chatId, MESSAGES.bothUnavailable);
    return;
  }

  const wbProducts = wbOk ? wbResult.value : [];
  const lamodaProducts = lamodaOk ? lamodaResult.value : [];
  const allProducts: Product[] = [...wbProducts, ...lamodaProducts];

  await bot.deleteMessage(chatId, statusMsg.message_id);

  if (allProducts.length === 0) {
    // Fallback: отправляем ссылки для ручного поиска
    const searchText = buildFallbackSearchText(currentQuery);
    // WB priceU = цена в рублях * 100 (копейки)
    const wbPriceMap = { mass: '0%3B300000', mid: '300000%3B1500000', premium: '1500000%3B5000000' };
    const segmentLabel = { mass: 'до 3 000 ₽', mid: '3 000 — 15 000 ₽', premium: 'от 15 000 ₽' };
    const lamodaSortMap = { mass: 'price_asc', mid: 'price_asc', premium: 'price_desc' };
    const wbUrl = `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(searchText)}&priceU=${wbPriceMap[segment]}&sort=popular`;
    const lamodaUrl = `https://www.lamoda.ru/catalogsearch/result/?q=${encodeURIComponent(searchText)}&sort=${lamodaSortMap[segment]}`;
    const aliUrl = `https://aliexpress.ru/wholesale?SearchText=${encodeURIComponent(searchText)}`;

    await bot.sendMessage(chatId,
      `😔 *автоматический поиск временно недоступен*\n\nоткрой ссылки вручную — там уже нужный запрос\n*бюджет: ${segmentLabel[segment]}*\n\nнашла подходящее? пришли ссылку на товар, добавлю в подборку 👇`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔍 Wildberries', url: wbUrl }],
            [{ text: '🔍 Lamoda', url: lamodaUrl }],
            [{ text: '🔍 AliExpress', url: aliUrl }],
          ],
        },
      }
    );
    await updateSession(telegramId, { state: 'idle' });
    return;
  }

  // Сохраняем результаты в БД
  await clearSearchResults(telegramId);
  await saveSearchResults(telegramId, session.id, allProducts);
  await updateSession(telegramId, { state: 'browsing_results' });

  // Показываем карточки
  for (const product of allProducts.slice(0, 8)) {
    const storeLabel = product.source === 'wildberries' ? 'Wildberries' : 'Lamoda';
    const caption = `*${product.name}*\n${product.price.toLocaleString('ru-RU')} руб. · ${storeLabel}`;

    try {
      await bot.sendPhoto(chatId, product.image_url, {
        caption,
        parse_mode: 'Markdown',
        reply_markup: productKeyboard(product.product_id, product.source, product.url),
      });
    } catch {
      // Если фото не загрузилось — отправляем текстовую карточку
      await bot.sendMessage(chatId, caption, {
        parse_mode: 'Markdown',
        reply_markup: productKeyboard(product.product_id, product.source, product.url),
      });
    }
  }
}

async function handleAddToCapsule(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  productId: string,
  source: 'wildberries' | 'lamoda'
) {
  const session = await getOrCreateSession(telegramId);
  const clientName = session.current_client_name;

  const product = await getSearchResult(productId, source, telegramId);
  if (!product) {
    await bot.sendMessage(chatId, '⚠️ Товар не найден. Попробуй новый поиск.');
    return;
  }

  // Если нет имени клиента — спрашиваем
  if (!clientName) {
    const base: SearchQuery = (session.current_query as unknown as SearchQuery | null)
      ?? { type: 'text', item_type: '', color: null, style: null, additional_details: null };
    await updateSession(telegramId, {
      state: 'building_capsule',
      current_query: { ...base, pending_product_id: productId, pending_source: source },
    });
    await bot.sendMessage(chatId, MESSAGES.askClientName);
    return;
  }

  // Добавляем в капсулу
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
  await updateSession(telegramId, { state: 'building_capsule' });

  await bot.sendMessage(chatId, MESSAGES.addedToCapsule(clientName, count), {
    parse_mode: 'Markdown',
    reply_markup: afterAddKeyboard(),
  });

  if (count >= 20) {
    await bot.sendMessage(chatId, MESSAGES.capsuleWarning(count), { parse_mode: 'Markdown' });
  }
}

async function handleViewCapsule(bot: TelegramBot, chatId: number, telegramId: number) {
  const session = await getOrCreateSession(telegramId);
  const clientName = session.current_client_name;
  if (!clientName) {
    await bot.sendMessage(chatId, '📁 нет активной подборки — сначала добавь вещи');
    return;
  }
  const capsule = await getActiveCapsule(telegramId, clientName);
  if (!capsule) {
    await bot.sendMessage(chatId, MESSAGES.capsuleEmpty(clientName), { parse_mode: 'Markdown' });
    return;
  }
  const items = await getCapsuleItems(capsule.id);
  if (items.length === 0) {
    await bot.sendMessage(chatId, MESSAGES.capsuleEmpty(clientName), { parse_mode: 'Markdown' });
    return;
  }

  // Всё в одном сообщении: список + кнопки
  const lines = items.map((item, i) => {
    const storeLabel = item.source === 'wildberries' ? 'WB' : 'Lamoda';
    const priceText = item.price > 0 ? ` · ${item.price.toLocaleString('ru-RU')} ₽` : '';
    return `${i + 1}. ${item.name}${priceText} _${storeLabel}_`;
  });

  const total = items.reduce((s, i) => s + i.price, 0);
  const totalText = total > 0 ? `\n\n*итого: ${total.toLocaleString('ru-RU')} ₽*` : '';

  const text = `${MESSAGES.capsuleHeader(clientName, items.length)}\n\n${lines.join('\n')}${totalText}`;

  // Кнопки: открыть каждый товар + удалить
  const itemButtons = items.map(item => ([
    { text: `🔗 ${item.name.slice(0, 20)}...`, url: item.url },
    { text: '🗑️', callback_data: `remove_from_capsule:${item.id}` },
  ]));

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        ...itemButtons,
        [{ text: '📄 скачать pdf', callback_data: 'download_pdf' }],
      ],
    },
  });
}

async function handleRemoveFromCapsule(bot: TelegramBot, chatId: number, itemId: string) {
  await removeCapsuleItem(itemId);
  await bot.sendMessage(chatId, '🗑️ удалено из подборки', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📋 посмотреть подборку', callback_data: 'view_capsule' }],
        [{ text: '🔍 искать ещё', callback_data: 'search_more' }],
        [{ text: '📄 скачать pdf', callback_data: 'download_pdf' }],
      ],
    },
  });
}

async function handleDownloadPdf(bot: TelegramBot, chatId: number, telegramId: number) {
  const session = await getOrCreateSession(telegramId);
  const clientName = session.current_client_name;

  if (!clientName) {
    await bot.sendMessage(chatId, MESSAGES.askClientName);
    return;
  }

  const capsule = await getActiveCapsule(telegramId, clientName);
  if (!capsule) {
    await bot.sendMessage(chatId, MESSAGES.emptyCapsule);
    return;
  }

  const items = await getCapsuleItems(capsule.id);
  if (items.length === 0) {
    await bot.sendMessage(chatId, MESSAGES.emptyCapsule);
    return;
  }

  const statusMsg = await bot.sendMessage(chatId, MESSAGES.generatingPdf);

  const pdfBuffer = await generateCapsulePDF(clientName, items, telegramId);

  const date = new Date().toISOString().split('T')[0];
  const filename = `capsule_${clientName.replace(/\s+/g, '_')}_${date}.pdf`;

  await bot.deleteMessage(chatId, statusMsg.message_id);
  await bot.sendDocument(chatId, pdfBuffer, {}, { filename, contentType: 'application/pdf' });

  await setCapsuleExported(capsule.id);
}
