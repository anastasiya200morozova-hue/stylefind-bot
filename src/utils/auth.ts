export function isAuthorized(telegramId: number | undefined): boolean {
  if (!telegramId) return false;
  const stylistId = process.env.STYLIST_TELEGRAM_ID;
  if (!stylistId) {
    console.error('[auth] STYLIST_TELEGRAM_ID не задан в .env');
    return false;
  }
  return telegramId === parseInt(stylistId, 10);
}
