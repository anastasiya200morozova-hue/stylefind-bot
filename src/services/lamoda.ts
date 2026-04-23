import * as cheerio from 'cheerio';
import type { Product, Segment, SearchQuery } from '../types';
import { log } from '../utils/logger';

const PRICE_LIMITS: Record<Segment, { min: number; max: number }> = {
  mass:    { min: 0,     max: 3000  },
  mid:     { min: 3000,  max: 15000 },
  premium: { min: 15000, max: 50000 },
};

function buildQuery(query: SearchQuery): string {
  const parts = [query.item_type];
  if (query.color) parts.push(query.color);
  return parts.join(' ');
}

// Метод 1: Google Custom Search API
async function searchViaGoogleCSE(queryStr: string): Promise<Product[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !cx) throw new Error('Google CSE не настроен');

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: `${queryStr} site:lamoda.ru`,
    num: '5',
  });
  const url = `https://www.googleapis.com/customsearch/v1?${params}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Google CSE: ${response.status}`);

  const json = await response.json() as {
    items?: Array<{ title: string; link: string; snippet?: string }>;
  };

  return (json.items ?? []).map((item, i) => ({
    product_id: `lamoda_cse_${i}_${Date.now()}`,
    source: 'lamoda' as const,
    name: item.title.replace(' — Lamoda', '').trim(),
    price: 0,
    url: item.link,
    image_url: '',
  })).filter((p) => p.url.includes('/p/') || p.url.includes('/product/'));
}

// Метод 2: прямой парсинг через cheerio (fallback)
async function searchViaCheerio(queryStr: string, segment: Segment): Promise<Product[]> {
  const url = `https://www.lamoda.ru/catalogsearch/result/?q=${encodeURIComponent(queryStr)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru-RU,ru;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`Lamoda HTTP: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const { min, max } = PRICE_LIMITS[segment];
  const products: Product[] = [];

  $('.products-list-item, .grid-item, [class*="product"]').each((_, el) => {
    if (products.length >= 5) return;

    const nameEl = $(el).find('[class*="name"], [class*="title"]').first();
    const priceEl = $(el).find('[class*="price"]').first();
    const linkEl = $(el).find('a[href*="/p/"]').first();
    const imgEl = $(el).find('img').first();

    const name = nameEl.text().trim();
    const href = linkEl.attr('href') ?? '';
    const priceText = priceEl.text().replace(/\D/g, '');
    const price = parseInt(priceText, 10) || 0;

    if (!name || !href) return;
    if (price > 0 && (price < min || price > max)) return;

    products.push({
      product_id: `lamoda_${href.replace(/\//g, '_')}`,
      source: 'lamoda',
      name,
      price,
      url: href.startsWith('http') ? href : `https://www.lamoda.ru${href}`,
      image_url: imgEl.attr('src') ?? imgEl.attr('data-src') ?? '',
    });
  });

  return products;
}

export async function searchLamoda(
  query: SearchQuery,
  segment: Segment,
  telegramId: number
): Promise<Product[]> {
  const start = Date.now();
  const queryStr = buildQuery(query);

  try {
    let products: Product[] = [];

    try {
      products = await searchViaGoogleCSE(queryStr);
    } catch {
      // Google CSE недоступен или не настроен — пробуем cheerio
      products = await searchViaCheerio(queryStr, segment);
    }

    // Фильтрация по цене (для CSE результатов без цены — пропускаем фильтр)
    const { min, max } = PRICE_LIMITS[segment];
    const filtered = products.filter((p) => p.price === 0 || (p.price >= min && p.price <= max));

    await log('lamoda_search', { query: queryStr, segment }, { count: filtered.length }, Date.now() - start, undefined, telegramId);
    return filtered;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await log('lamoda_search', { query: queryStr, segment }, {}, Date.now() - start, error, telegramId);
    throw err;
  }
}
