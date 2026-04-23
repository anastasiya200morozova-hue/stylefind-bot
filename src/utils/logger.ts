import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Отдельный клиент только для логирования (избегаем циклического импорта)
const db = createClient<Database>(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

export async function log(
  action: string,
  input: Record<string, unknown> = {},
  output: Record<string, unknown> = {},
  durationMs?: number,
  error?: string,
  telegramId?: number
): Promise<void> {
  const prefix = error ? '❌' : '✅';
  console.log(`${prefix} [${action}]${durationMs !== undefined ? ` ${durationMs}ms` : ''}${error ? ` | ERROR: ${error}` : ''}`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;

  await db.from('bot_logs').insert([{
    action,
    input: input as import('../types/database').Json,
    output: output as import('../types/database').Json,
    duration_ms: durationMs ?? null,
    error: error ?? null,
    telegram_id: telegramId ?? null,
  }]);
}
