import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '../types/database';
import type { BotState, Segment, SearchQuery, Product, ProductSource, CapsuleItem } from '../types';

const db = createClient<Database>(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function getOrCreateSession(telegramId: number) {
  const { data } = await db
    .from('sessions')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (data) return data;

  const { data: created, error } = await db
    .from('sessions')
    .insert({ telegram_id: telegramId })
    .select()
    .single();

  if (error) throw new Error(`Ошибка создания сессии: ${error.message}`);
  return created!;
}

export async function updateSession(
  telegramId: number,
  fields: {
    state?: BotState;
    current_query?: SearchQuery | null;
    current_segment?: Segment;
    current_client_name?: string | null;
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { ...fields };
  if ('current_query' in fields) {
    update.current_query = fields.current_query as unknown as Json;
  }
  const { error } = await db
    .from('sessions')
    .update(update)
    .eq('telegram_id', telegramId);

  if (error) throw new Error(`Ошибка обновления сессии: ${error.message}`);
}

// ─── Search Results ───────────────────────────────────────────────────────────

export async function clearSearchResults(telegramId: number) {
  await db.from('search_results').delete().eq('telegram_id', telegramId);
}

export async function saveSearchResults(
  telegramId: number,
  sessionId: string,
  products: Product[]
) {
  if (products.length === 0) return;

  const rows = products.map((p) => ({
    telegram_id: telegramId,
    session_id: sessionId,
    product_id: p.product_id,
    source: p.source,
    name: p.name,
    price: p.price,
    url: p.url,
    image_url: p.image_url,
  }));

  const { error } = await db.from('search_results').insert(rows);
  if (error) throw new Error(`Ошибка сохранения результатов: ${error.message}`);
}

export async function getSearchResult(productId: string, source: ProductSource, telegramId: number) {
  const { data } = await db
    .from('search_results')
    .select('*')
    .eq('product_id', productId)
    .eq('source', source)
    .eq('telegram_id', telegramId)
    .single();
  return data;
}

// ─── Capsules ─────────────────────────────────────────────────────────────────

export async function getOrCreateCapsule(telegramId: number, clientName: string) {
  const { data: existing } = await db
    .from('capsules')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('client_name', clientName)
    .eq('status', 'active')
    .single();

  if (existing) return existing;

  const { data: created, error } = await db
    .from('capsules')
    .insert({ telegram_id: telegramId, client_name: clientName })
    .select()
    .single();

  if (error) throw new Error(`Ошибка создания капсулы: ${error.message}`);
  return created!;
}

export async function getActiveCapsule(telegramId: number, clientName: string) {
  const { data } = await db
    .from('capsules')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('client_name', clientName)
    .eq('status', 'active')
    .single();
  return data;
}

export async function addCapsuleItem(capsuleId: string, telegramId: number, product: Product) {
  const { error } = await db.from('capsule_items').insert({
    capsule_id: capsuleId,
    telegram_id: telegramId,
    source: product.source,
    product_id: product.product_id,
    name: product.name,
    price: product.price,
    url: product.url,
    image_url: product.image_url,
  });
  if (error) throw new Error(`Ошибка добавления товара: ${error.message}`);
}

export async function getCapsuleItems(capsuleId: string): Promise<CapsuleItem[]> {
  const { data, error } = await db
    .from('capsule_items')
    .select('*')
    .eq('capsule_id', capsuleId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Ошибка получения товаров: ${error.message}`);
  return (data ?? []) as CapsuleItem[];
}

export async function removeCapsuleItem(itemId: string) {
  const { error } = await db.from('capsule_items').delete().eq('id', itemId);
  if (error) throw new Error(`Ошибка удаления товара: ${error.message}`);
}

export async function setCapsuleExported(capsuleId: string) {
  await db.from('capsules').update({ status: 'exported' }).eq('id', capsuleId);
}

export async function countCapsuleItems(capsuleId: string): Promise<number> {
  const { count } = await db
    .from('capsule_items')
    .select('*', { count: 'exact', head: true })
    .eq('capsule_id', capsuleId);
  return count ?? 0;
}
