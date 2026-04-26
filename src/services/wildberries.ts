import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Product, Segment, SearchQuery } from '../types';
import { log } from '../utils/logger';

const execFileAsync = promisify(execFile);

const PRICE_RANGES: Record<Segment, { min: number; max: number }> = {
  mass:    { min: 0,       max: 300000  },
  mid:     { min: 300000,  max: 1500000 },
  premium: { min: 1500000, max: 5000000 },
};

function buildSearchQuery(query: SearchQuery, withColor = true): string {
  const parts = [query.item_type];
  if (withColor && query.color) parts.push(query.color);
  if (query.additional_details) parts.push(query.additional_details);
  return parts.join(' ');
}

function getWbImageUrl(productId: number): string {
  const vol = Math.floor(productId / 100000);
  const part = Math.floor(productId / 1000);
  let basket: number;
  if (vol <= 143) basket = 1;
  else if (vol <= 287) basket = 2;
  else if (vol <= 431) basket = 3;
  else if (vol <= 719) basket = 4;
  else if (vol <= 1007) basket = 5;
  else if (vol <= 1061) basket = 6;
  else if (vol <= 1115) basket = 7;
  else if (vol <= 1169) basket = 8;
  else if (vol <= 1313) basket = 9;
  else if (vol <= 1601) basket = 10;
  else if (vol <= 1655) basket = 11;
  else if (vol <= 1919) basket = 12;
  else basket = 13;
  const b = String(basket).padStart(2, '0');
  return `https://basket-${b}.wbbasket.ru/vol${vol}/part${part}/${productId}/images/big/1.jpg`;
}

async function fetchWbViaCurl(queryStr: string, segment: Segment): Promise<Product[]> {
  const { min, max } = PRICE_RANGES[segment];
  const params = new URLSearchParams({
    query: queryStr,
    resultset: 'catalog',
    limit: '10',
    priceU: `${min}-${max}`,
    sort: 'popular',
    page: '1',
  });
  const url = `https://search.wb.ru/exactmatch/ru/common/v4/search?${params}`;

  const { stdout } = await execFileAsync('curl', [
    '-s',
    '--max-time', '15',
    '-H', 'User-Agent: WBAndroid/3.0.3800',
    '-H', 'Accept: application/json',
    url,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = JSON.parse(stdout) as any;
  const products: any[] = json.data?.products ?? json.products ?? [];

  return products.slice(0, 10).map((p: any) => {
    // WB меняет расположение цены — проверяем несколько мест
    const rawPrice =
      p.salePriceU ??
      p.priceU ??
      p.sizes?.[0]?.price?.total ??
      p.sizes?.[0]?.price?.product ??
      p.extended?.basicSale?.total ??
      0;
    const price = Math.round(rawPrice / 100);

    return {
      product_id: String(p.id),
      source: 'wildberries' as const,
      name: p.name,
      price,
      url: `https://www.wildberries.ru/catalog/${p.id}/detail.aspx`,
      image_url: getWbImageUrl(p.id),
    };
  });
}

export async function searchWildberries(
  query: SearchQuery,
  segment: Segment,
  telegramId: number
): Promise<Product[]> {
  const start = Date.now();
  const queryStr = buildSearchQuery(query);

  try {
    let products = await fetchWbViaCurl(queryStr, segment);

    // Fallback без цвета при 0 результатов
    if (products.length === 0) {
      products = await fetchWbViaCurl(buildSearchQuery(query, false), segment);
    }

    await log('wb_search', { query: queryStr, segment }, { count: products.length }, Date.now() - start, undefined, telegramId);
    return products;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await log('wb_search', { query: queryStr, segment }, {}, Date.now() - start, error, telegramId);
    throw err;
  }
}
