import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { registerCommands } from './bot/handlers/commands';
import { registerPhotoHandler } from './bot/handlers/photo';
import { registerTextHandler } from './bot/handlers/text';
import { registerCallbackHandler } from './bot/handlers/callback';

function validateEnv(): void {
  const required = ['TELEGRAM_BOT_TOKEN', 'STYLIST_TELEGRAM_ID', 'GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('❌ Отсутствуют переменные окружения:', missing.join(', '));
    process.exit(1);
  }
}

function startBot(): void {
  validateEnv();

  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const bot = new TelegramBot(token, { polling: true });

  registerCommands(bot);
  registerPhotoHandler(bot);
  registerTextHandler(bot);
  registerCallbackHandler(bot);

  // Обработка ошибок polling
  bot.on('polling_error', (err) => {
    console.error('⚠️ Polling error:', err.message);
  });

  console.log('🚀 StyleFind бот запущен');
  console.log(`👤 Stylist ID: ${process.env.STYLIST_TELEGRAM_ID}`);

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Остановка бота...');
    bot.stopPolling().then(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startBot();
