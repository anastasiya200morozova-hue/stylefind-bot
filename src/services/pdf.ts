import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { CapsuleItem } from '../types';
import { log } from '../utils/logger';

const MARGIN = 40;
const PAGE_W = 595;
const PAGE_H = 842;
const PHOTO_W = 170;
const PHOTO_H = 170;
const ROW_H = PHOTO_H + 20;   // высота строки
const TEXT_X = MARGIN + PHOTO_W + 16;
const TEXT_W = PAGE_W - TEXT_X - MARGIN;

let cachedFont: Awaited<ReturnType<PDFDocument['embedFont']>> | null = null;

async function getFont(pdfDoc: PDFDocument) {
  if (cachedFont) return cachedFont;
  const fontPath = join(__dirname, '../../src/assets/Roboto-Regular.ttf');
  const fontBytes = readFileSync(fontPath);
  pdfDoc.registerFontkit(fontkit);
  return pdfDoc.embedFont(fontBytes);
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
    const font = await getFont(pdfDoc);

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - 50;

    // ── Заголовок ──
    page.drawText(`Подборка для: ${clientName}`, {
      x: MARGIN, y,
      size: 20, font, color: rgb(0.1, 0.1, 0.1),
    });
    y -= 22;

    const dateStr = new Date().toLocaleDateString('ru-RU');
    page.drawText(dateStr, {
      x: MARGIN, y,
      size: 10, font, color: rgb(0.5, 0.5, 0.5),
    });
    y -= 30;

    // ── Разделитель ──
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 16;

    // ── Товары: фото слева, описание справа ──
    for (const item of items) {
      if (y - ROW_H < MARGIN + 30) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - 40;
      }

      const imgY = y - PHOTO_H;

      // Фото
      const imgBytes = await downloadImage(item.image_url);
      if (imgBytes) {
        try {
          const img = item.image_url.toLowerCase().includes('.png')
            ? await pdfDoc.embedPng(imgBytes)
            : await pdfDoc.embedJpg(imgBytes);
          page.drawImage(img, { x: MARGIN, y: imgY, width: PHOTO_W, height: PHOTO_H });
        } catch {
          page.drawRectangle({ x: MARGIN, y: imgY, width: PHOTO_W, height: PHOTO_H, color: rgb(0.92, 0.92, 0.92) });
        }
      } else {
        page.drawRectangle({ x: MARGIN, y: imgY, width: PHOTO_W, height: PHOTO_H, color: rgb(0.92, 0.92, 0.92) });
        page.drawText('фото\nнедоступно', { x: MARGIN + 45, y: imgY + 75, size: 9, font, color: rgb(0.6, 0.6, 0.6) });
      }

      // Описание справа
      const textTopY = y - 18;

      // Название
      page.drawText(truncate(item.name, 45), {
        x: TEXT_X, y: textTopY,
        size: 11, font, color: rgb(0.1, 0.1, 0.1),
        maxWidth: TEXT_W,
      });

      // Цена
      const priceText = item.price > 0
        ? `${item.price.toLocaleString('ru-RU')} ₽`
        : 'цена не указана';
      page.drawText(priceText, {
        x: TEXT_X, y: textTopY - 22,
        size: 14, font, color: rgb(0.1, 0.1, 0.1),
      });

      // Магазин
      const store = item.source === 'wildberries' ? 'Wildberries' : 'Lamoda';
      page.drawText(store, {
        x: TEXT_X, y: textTopY - 42,
        size: 9, font, color: rgb(0.5, 0.5, 0.5),
      });

      // Ссылка
      const shortUrl = item.url.replace('https://', '').replace('www.', '').slice(0, 50);
      page.drawText(shortUrl, {
        x: TEXT_X, y: textTopY - 56,
        size: 7, font, color: rgb(0.3, 0.5, 0.9),
        maxWidth: TEXT_W,
      });

      // Разделитель
      y -= ROW_H + 4;
      page.drawLine({
        start: { x: MARGIN, y: y + 8 },
        end: { x: PAGE_W - MARGIN, y: y + 8 },
        thickness: 0.3,
        color: rgb(0.9, 0.9, 0.9),
      });
      y -= 8;
    }

    // ── Итого ──
    const total = items.reduce((s, i) => s + i.price, 0);
    if (total > 0) {
      if (y < MARGIN + 20) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - 60;
      }
      page.drawText(`Итого: ${total.toLocaleString('ru-RU')} ₽  ·  ${items.length} ${pluralItems(items.length)}`, {
        x: MARGIN, y: MARGIN + 16,
        size: 12, font, color: rgb(0.1, 0.1, 0.1),
      });
    }

    const buf = Buffer.from(await pdfDoc.save());
    await log('pdf_generate', { clientName, itemCount: items.length }, { sizeKb: Math.round(buf.length / 1024) }, Date.now() - start, undefined, telegramId);
    return buf;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await log('pdf_generate', { clientName }, {}, Date.now() - start, error, telegramId);
    throw err;
  }
}

function pluralItems(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'вещь';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'вещи';
  return 'вещей';
}
