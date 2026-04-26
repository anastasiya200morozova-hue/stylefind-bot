import type { SearchQuery } from '../types';

export const MESSAGES = {
  start: `👋🏽 *привет!* я твой стилевый помощник, помогу найти вещи, которые ты ищешь

📸 отправь фото или скрин референса
✍🏽 или просто опиши, что хочешь найти

_найду похожее на wildberries и lamoda_

*пара советов:*
— пиши без запятых
— чем подробнее — тем точнее
_например: синие джинсы широкие низкая посадка_`,

  help: `*что я умею* ✨

📸 *фото* — скинь референс, разберу
✍🏽 *текст* — опиши вещь, найду похожее
💾 */capsule* — посмотреть сохранённое
🔄 */newclient* — начать новую подборку

_пиши без запятых и максимально подробно_`,

  analyzingPhoto: '👀 *смотрю, что тут...*',
  analyzingText: '🧠 *понимаю, что ищем...*',
  searching: '🔍 *ищу варианты*, подожди секунду',
  generatingPdf: '🗂️ *собираю pdf...* займёт секунд 10',

  geminiError: '😔 не смогла разобрать фото\n_попробуй написать текстом, что ищешь_',
  geminiLimitReached: 'ai временно на паузе, но поиск по тексту работает ок ✌️',

  noResults: '😭 *ничего не нашлось*\n_попробуй переформулировать_',
  wbUnavailable: '_wildberries сейчас недоступен, ищу на lamoda_',
  lamodaUnavailable: '_lamoda сейчас недоступна, ищу на wildberries_',
  bothUnavailable: '😴 магазины временно лежат\n_попробуй через пару минут_',

  emptyCapsule: '🛍️ подборка пустая — сначала добавь что-нибудь',
  askClientName: '👤 *для кого сохраняем?*\nнапиши имя',
  photoTooLarge: '😬 фото слишком тяжёлое\n_отправь файл до 20 мб_',
  unsupportedType: 'скинь фото или напиши текстом, что ищешь',
  newClientStarted: '🆕 *готово!* начинаем новую подборку\nотправь фото или опиши вещь',

  confirmQuery: (q: SearchQuery) =>
    `🔥 *вижу:* ${q.item_type}${q.color ? `, ${q.color}` : ''}${q.style ? `, ${q.style}` : ''}${q.additional_details ? `\n_${q.additional_details}_` : ''}\n\nэто то, что нужно?`,

  chooseSegment: '*какой бюджет?* 💸',

  addedToCapsule: (clientName: string, count: number) =>
    `✅ *добавила* в подборку ${clientName} _(${count} ${pluralItems(count)})_`,

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
