import type { SearchQuery } from '../types';

export const MESSAGES = {
  start: `🫶 *привет!* я твой стилевый помощник — помогу найти вещи и собрать образ

выбери с чего начать 👇`,

  help: `✨ *что я умею*

📸 *фото* — скинь референс, разберу
✍🏽 *текст* — опиши вещь, найду похожее
🪩 */outfit* — пришли до 5 фото, соберу целый образ
🗂️ */capsule* — посмотреть сохранённое
🔄 */newclient* — начать новую подборку

_пиши без запятых и максимально подробно_`,

  analyzingPhoto: '🔮 смотрю, что тут...',
  analyzingText: '💫 разбираю запрос...',
  searching: '🕵🏽 ищу варианты, подожди секунду',
  generatingPdf: '🗂️ собираю pdf, займёт секунд 10',

  geminiError: '😮‍💨 не получилось разобрать фото, попробуй написать текстом, что ищешь',
  geminiLimitReached: 'ai временно на паузе, поиск по тексту работает ок ✌️',

  noResults: '🫠 ничего не нашлось, попробуй переформулировать',
  wbUnavailable: 'wildberries сейчас недоступен, ищу на lamoda',
  lamodaUnavailable: 'lamoda сейчас недоступна, ищу на wildberries',
  bothUnavailable: '💤 магазины временно лежат, попробуй через пару минут',

  emptyCapsule: '🛍️ подборка пустая — сначала добавь что-нибудь',
  askClientName: '🎀 как назовём подборку? напиши имя или тему\n_например: зимний образ, настя, базовый гардероб_',
  photoTooLarge: '😬 фото слишком тяжёлое, отправь файл до 20 мб',
  unsupportedType: 'скинь фото или напиши текстом, что ищешь 🫶',
  newClientStarted: '🆕 погнали! отправь фото или опиши вещь',

  confirmQuery: (q: SearchQuery) =>
    `🔥 *вижу:* ${q.item_type}${q.color ? `, ${q.color}` : ''}${q.style ? `, ${q.style}` : ''}${q.brand ? `\n🏷️ *бренд:* ${q.brand}` : ''}${q.additional_details ? `\n_${q.additional_details}_` : ''}\n\nэто то, что нужно?`,

  chooseSegment: '💸 *какой бюджет?*',

  addedToCapsule: (clientName: string, count: number) =>
    `🫶 *добавлено* в подборку *${clientName}*\nуже ${count} ${pluralItems(count)} 🗂️`,

  capsuleWarning: (count: number) =>
    `уже *${count} вещей* — может, скачаем pdf и начнём новую? 😅`,

  capsuleHeader: (clientName: string, count: number) =>
    `🗂️ *подборка ${clientName}* — ${count} ${pluralItems(count)}`,

  capsuleEmpty: (clientName: string) =>
    `*подборка ${clientName}* пока пустая 🫙`,
};

function pluralItems(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'вещь';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'вещи';
  return 'вещей';
}
