import type { SearchQuery } from '../types';

export const MESSAGES = {
  start: `👋 Привет! Я StyleFind — твой помощник по поиску вещей.

Отправь мне:
📸 Фото или скрин референса
✍️ Текстовое описание вещи

И я найду похожее на Wildberries и Lamoda!`,

  help: `📋 Команды:
/start — приветствие
/capsule — показать текущую капсулу
/newclient — начать капсулу для нового клиента
/help — эта справка

Просто отправь фото или текст — и я начну поиск.`,

  analyzingPhoto: '🔍 Анализирую фото...',
  analyzingText: '🔍 Обрабатываю описание...',
  searching: '🔍 Ищу похожие вещи на Wildberries и Lamoda...',
  generatingPdf: '📄 Генерирую PDF... подождите 10–15 секунд',

  geminiError: '⚠️ Не смог проанализировать фото. Напиши текстом что ищешь.',
  geminiLimitReached: '⚠️ Дневной лимит AI исчерпан. Описывай вещи текстом — поиск работает.',

  noResults: '😔 Ничего не нашёл. Попробуй уточнить описание.',
  wbUnavailable: '⚠️ Wildberries временно недоступен — ищу только на Lamoda.',
  lamodaUnavailable: '⚠️ Lamoda временно недоступна — ищу только на Wildberries.',
  bothUnavailable: '❌ Магазины временно недоступны. Попробуй через 5 минут.',

  emptyCapsule: '📦 Капсула пуста. Добавь вещи перед скачиванием.',
  askClientName: '👤 Для какого клиента эта капсула? Напиши имя:',
  photoTooLarge: '⚠️ Фото слишком большое. Отправь файл меньше 20 МБ.',
  unsupportedType: '⚠️ Отправь фото или текстовое описание вещи.',
  newClientStarted: '✅ Клиент сброшен. Отправь фото или описание для новой капсулы.',

  confirmQuery: (q: SearchQuery) =>
    `✅ Вижу: *${q.item_type}*${q.color ? `, ${q.color}` : ''}${q.style ? `, ${q.style}` : ''}${q.additional_details ? `\n_${q.additional_details}_` : ''}\n\nВерно?`,

  chooseSegment: '💰 Выбери ценовой сегмент:',

  addedToCapsule: (clientName: string, count: number) =>
    `✅ Добавлено в капсулу *${clientName}* (${count} ${pluralItems(count)})`,

  capsuleWarning: (count: number) =>
    `⚠️ В капсуле уже ${count} вещей — рекомендую скачать PDF и начать новую.`,

  capsuleHeader: (clientName: string, count: number) =>
    `📦 Капсула *${clientName}* — ${count} ${pluralItems(count)}:`,

  capsuleEmpty: (clientName: string) =>
    `📦 Капсула *${clientName}* пуста.`,
};

function pluralItems(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'вещь';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'вещи';
  return 'вещей';
}
