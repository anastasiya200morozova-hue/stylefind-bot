import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { CapsuleItem } from '../types';
import { log } from '../utils/logger';

const ITEMS_PER_ROW = 2;
const ITEM_WIDTH = 220;
const ITEM_HEIGHT = 220;
const MARGIN = 40;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

let cachedFontBytes: ArrayBuffer | null = null;

async function getFullFont(): Promise<ArrayBuffer | null> {
  if (cachedFontBytes) return cachedFontBytes;
  try {
    // Google Fonts с IE User-Agent возвращает TTF (один файл: Latin + Cyrillic)
    const css = await fetch(
      'https://fonts.googleapis.com/css?family=Roboto:400&subset=cyrillic,latin',
      { headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0)' }, signal: AbortSignal.timeout(8000) }
    ).then(r => r.text());
    const url = css.match(/url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    const font = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!font.ok) return null;
    cachedFontBytes = await font.arrayBuffer();
    return cachedFontBytes;
  } catch {
    return null;
  }
}

async function downloadImage(url: string): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    return new Uint8Array(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

export async function generateCapsulePDF(
  clientName: string,
  items: CapsuleItem[],
  telegramId: number
): Promise<Buffer> {
  const start = Date.now();

  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontBytes = await getFullFont();
    const font = fontBytes
      ? await pdfDoc.embedFont(fontBytes)
      : await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // ── Заголовок ──
    page.drawText(`Подборка для: ${clientName}`, {
      x: MARGIN, y: PAGE_HEIGHT - 50,
      size: 20, font,
      color: rgb(0.1, 0.1, 0.1),
    });

    const dateStr = new Date().toLocaleDateString('ru-RU');
    page.drawText(dateStr, {
      x: MARGIN, y: PAGE_HEIGHT - 72,
      size: 11, font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // ── Товары ──
    let col = 0;
    let rowY = PAGE_HEIGHT - 110;

    for (const item of items) {
      const x = MARGIN + col * (ITEM_WIDTH + 20);

      if (rowY - ITEM_HEIGHT < MARGIN + 40) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        rowY = PAGE_HEIGHT - 60;
      }

      // Фото
      const imgBytes = await downloadImage(item.image_url);
      if (imgBytes) {
        try {
          const img = await (item.image_url.toLowerCase().endsWith('.png')
            ? pdfDoc.embedPng(imgBytes)
            : pdfDoc.embedJpg(imgBytes));
          page.drawImage(img, { x, y: rowY - 155, width: ITEM_WIDTH, height: 150 });
        } catch {
          drawPlaceholder(page, x, rowY - 155, ITEM_WIDTH, 150);
        }
      } else {
        drawPlaceholder(page, x, rowY - 155, ITEM_WIDTH, 150);
      }

      // Название
      page.drawText(truncate(item.name, 32), {
        x, y: rowY - 172,
        size: 9, font,
        color: rgb(0.15, 0.15, 0.15),
      });

      // Цена
      const priceText = item.price > 0 ? `${item.price.toLocaleString('ru-RU')} ₽` : 'цена неизвестна';
      page.drawText(priceText, {
        x, y: rowY - 185,
        size: 11, font,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Магазин
      const storeName = item.source === 'wildberries' ? 'Wildberries' : 'Lamoda';
      page.drawText(storeName, {
        x, y: rowY - 197,
        size: 8, font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Ссылка (короткая)
      const shortUrl = item.url.replace('https://', '').replace('www.', '').slice(0, 40);
      page.drawText(shortUrl, {
        x, y: rowY - 208,
        size: 7, font: helvetica,
        color: rgb(0.3, 0.5, 0.9),
      });

      col++;
      if (col >= ITEMS_PER_ROW) {
        col = 0;
        rowY -= ITEM_HEIGHT + 10;
      }
    }

    // ── Итого ──
    const total = items.reduce((s, i) => s + i.price, 0);
    if (total > 0) {
      page.drawText(`Итого: ${total.toLocaleString('ru-RU')} ₽  (${items.length} вещей)`, {
        x: MARGIN, y: MARGIN + 20,
        size: 12, font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const buf = Buffer.from(pdfBytes);
    await log('pdf_generate', { clientName, itemCount: items.length }, { sizeKb: Math.round(buf.length / 1024) }, Date.now() - start, undefined, telegramId);
    return buf;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await log('pdf_generate', { clientName }, {}, Date.now() - start, error, telegramId);
    throw err;
  }
}

function drawPlaceholder(page: ReturnType<PDFDocument['addPage']>, x: number, y: number, w: number, h: number) {
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.92, 0.92, 0.92) });
}
