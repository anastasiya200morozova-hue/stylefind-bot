import type { SearchQuery } from '../types';

export const MESSAGES = {
  start: `привет! я помогу найти вещи которые ты ищешь 🔍

отправь мне фото или скрин референса 📸
или просто опиши что хочешь найти ✍🏽

найду похожее на wildberries и lamoda

_пара советов:_
_— пиши без запятых_
_— чем подробнее описание тем точнее результат_
_например: синие джинсы широкие низкая посадка_`,

  help: `вот что я умею ✨

📸 анализирую фото — скинь референс
✍🏽 ищу по описанию — напиши что нужно
💾 /capsule — посмотреть сохранённое
🔄 /newclient — начать новую подборку
❓ /help — это сообщение

_пиши без запятых и максимально подробно — так найду точнее_`,

  analyzingPhoto: 'смотрю что тут... 👀',
  analyzingText: 'понимаю что ищем... 🧠',
  searching: 'ищу варианты, подожди секунду 🔍',
  generatingPdf: 'собираю pdf... займёт секунд 10 🗂️',

  geminiError: 'не смогла разобрать фото 😔 попробуй написать текстом что ищешь',
  geminiLimitReached: 'ai временно на паузе, но поиск по тексту работает ок',

  noResults: 'упс, ничего не нашлось 😭 попробуй переформулировать',
  wbUnavailable: 'wildberries сейчас недоступен, ищу на lamoda',
  lamodaUnavailable: 'lamoda сейчас недоступна, ищу на wildberries',
  bothUnavailable: 'магазины временно лежат 😴 попробуй через пару минут',

  emptyCapsule: 'подборка пустая — сначала добавь что-нибудь 🛍️',
  askClientName: 'для кого сохраняем? напиши имя',
  photoTooLarge: 'фото слишком тяжёлое 😬 отправь файл до 20 мб',
  unsupportedType: 'скинь фото или напиши текстом что ищешь',
  newClientStarted: 'готово! начинаем новую подборку 🆕 отправь фото или опиши вещь',

  confirmQuery: (q: SearchQuery) =>
    `окей, вижу: *${q.item_type}*${q.color ? ` ${q.color}` : ''}${q.style ? ` ${q.style}` : ''}${q.additional_details ? `\n_${q.additional_details}_` : ''}\n\nэто то что нужно? 🔥`,

  chooseSegment: 'какой бюджет? 💸',

  addedToCapsule: (clientName: string, count: number) =>
    `✅ добавила в подборку *${clientName}* (${count} ${pluralItems(count)})`,

  capsuleWarning: (count: number) =>
    `уже ${count} вещей — может скачаем pdf и начнём новую? 😅`,

  capsuleHeader: (clientName: string, count: number) =>
    `подборка *${clientName}* — ${count} ${pluralItems(count)} 🗂️`,

  capsuleEmpty: (clientName: string) =>
    `подборка *${clientName}* пока пустая 🫙`,
};

function pluralItems(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'вещь';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'вещи';
  return 'вещей';
}
