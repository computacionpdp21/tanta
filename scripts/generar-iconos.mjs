/**
 * Genera los íconos PWA a partir de un dibujo sencillo (letra J sobre marrón).
 *
 * Uso: node scripts/generar-iconos.mjs
 *
 * Para el logo real de la panadería, reemplaza estos archivos:
 *   public/logo.svg
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/maskable-512.png
 *   public/apple-touch-icon.png
 * y vuelve a generar con este script o exporta PNG 192 y 512 desde el logo.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

const BROWN = [122, 74, 33];
const CREAM = [255, 248, 238];
const ORANGE = [224, 138, 46];

const LETTER_J = [
  "011110",
  "000010",
  "000010",
  "000010",
  "000010",
  "100010",
  "011100",
];

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 3 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixels[y * width + x];
      const i = rowStart + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawIcon(size, { padding = 0 } = {}) {
  const pixels = Array.from({ length: size * size }, () => BROWN);
  const inner = size - padding * 2;
  const cellW = Math.floor(inner / 10);
  const cellH = Math.floor(inner / 12);
  const offsetX = padding + Math.floor((inner - cellW * 6) / 2);
  const offsetY = padding + Math.floor((inner - cellH * 7) / 2);

  function fillRect(x0, y0, w, h, color) {
    for (let y = y0; y < y0 + h; y += 1) {
      if (y < 0 || y >= size) continue;
      for (let x = x0; x < x0 + w; x += 1) {
        if (x < 0 || x >= size) continue;
        pixels[y * size + x] = color;
      }
    }
  }

  const accentY = padding + Math.floor(inner * 0.12);
  fillRect(padding + Math.floor(inner * 0.2), accentY, Math.floor(inner * 0.6), Math.max(4, Math.floor(size / 40)), ORANGE);

  LETTER_J.forEach((row, rowIndex) => {
    [...row].forEach((bit, colIndex) => {
      if (bit !== "1") return;
      fillRect(offsetX + colIndex * cellW, offsetY + rowIndex * cellH, cellW, cellH, CREAM);
    });
  });

  return pixels;
}

function writePng(path, size, options) {
  writeFileSync(path, encodePng(size, size, drawIcon(size, options)));
}

writePng(join(iconsDir, "icon-192.png"), 192);
writePng(join(iconsDir, "icon-512.png"), 512);
writePng(join(iconsDir, "maskable-512.png"), 512, { padding: 80 });
writePng(join(root, "public", "apple-touch-icon.png"), 180);

console.log("Íconos PWA generados en public/icons y public/apple-touch-icon.png");
