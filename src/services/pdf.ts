import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { CapsuleItem } from '../types';
import { log } from '../utils/logger';

const ITEMS_PER_ROW = 2;
const ITEM_WIDTH = 220;
const ITEM_HEIGHT = 200;
const MARGIN = 40;
const PAGE_WIDTH = 595;  // A4
const PAGE_HEIGHT = 842; // A4

async function downloadImage(url: string): Promise<Uint8Array | null> {
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
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // ── Заголовок ──
    page.drawText(`Kapsulya dlya: ${clientName}`, {
      x: MARGIN,
      y: PAGE_HEIGHT - 50,
      size: 20,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const dateStr = new Date().toLocaleDateString('ru-RU');
    page.drawText(dateStr, {
      x: MARGIN,
      y: PAGE_HEIGHT - 75,
      size: 11,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    // ── Товары (сетка 2 колонки) ──
    let col = 0;
    let rowY = PAGE_HEIGHT - 120;

    for (const item of items) {
      const x = MARGIN + col * (ITEM_WIDTH + 20);

      // Новая страница если не хватает места
      if (rowY - ITEM_HEIGHT < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        rowY = PAGE_HEIGHT - 60;
      }

      // Фото товара
      const imgBytes = await downloadImage(item.image_url);
      if (imgBytes) {
        try {
          const img = await (item.image_url.endsWith('.png')
            ? pdfDoc.embedPng(imgBytes)
            : pdfDoc.embedJpg(imgBytes));
          page.drawImage(img, {
            x,
            y: rowY - 155,
            width: ITEM_WIDTH,
            height: 150,
          });
        } catch {
          // placeholder при ошибке встраивания
          page.drawRectangle({
            x,
            y: rowY - 155,
            width: ITEM_WIDTH,
            height: 150,
            color: rgb(0.9, 0.9, 0.9),
          });
        }
      } else {
        // placeholder при недоступности URL
        page.drawRectangle({
          x,
          y: rowY - 155,
          width: ITEM_WIDTH,
          height: 150,
          color: rgb(0.9, 0.9, 0.9),
        });
        page.drawText('no image', {
          x: x + 75,
          y: rowY - 85,
          size: 9,
          font: helvetica,
          color: rgb(0.6, 0.6, 0.6),
        });
      }

      // Название (ASCII/латиница — кириллица требует отдельного шрифта)
      page.drawText(truncate(item.name, 36), {
        x,
        y: rowY - 170,
        size: 9,
        font: helvetica,
        color: rgb(0.15, 0.15, 0.15),
      });

      // Цена
      page.drawText(`${item.price.toLocaleString('ru-RU')} rub.`, {
        x,
        y: rowY - 183,
        size: 11,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Магазин
      const storeName = item.source === 'wildberries' ? 'Wildberries' : 'Lamoda';
      page.drawText(storeName, {
        x,
        y: rowY - 196,
        size: 9,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });

      col++;
      if (col >= ITEMS_PER_ROW) {
        col = 0;
        rowY -= ITEM_HEIGHT + 30;
      }
    }

    // ── Итого ──
    const total = items.reduce((sum, i) => sum + i.price, 0);
    page.drawText(`Itogo: ${total.toLocaleString('ru-RU')} rub. (${items.length} vesci)`, {
      x: MARGIN,
      y: MARGIN + 20,
      size: 12,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });

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
