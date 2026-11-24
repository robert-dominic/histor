// src/lib/pdf.ts
// A small PDF writer, enough for the case report (review-fixes brief, 12): A4 pages, filled and stroked rectangles,
// lines, and text in the standard PDF fonts (no font files: Courier for the typed voice, Times for the record).
// Pure: it returns the file's bytes. Text is written in WinAnsi (Windows-1252), which covers the case's curly quotes,
// dashes and accented letters; anything outside it becomes "?".

export const A4 = { width: 595.28, height: 841.89 } as const;

export type PdfFont = 'courier' | 'courier-bold' | 'times' | 'times-bold' | 'times-italic';
const FONT_NAMES: Record<PdfFont, string> = {
  courier: 'Courier',
  'courier-bold': 'Courier-Bold',
  times: 'Times-Roman',
  'times-bold': 'Times-Bold',
  'times-italic': 'Times-Italic',
};
const FONT_KEYS = Object.keys(FONT_NAMES) as PdfFont[];

/** An RGB colour, each 0 to 255. */
export type Rgb = readonly [number, number, number];

/** Courier's every glyph is 600/1000 of the size wide: lines are measured exactly. */
export const COURIER_ADVANCE = 0.6;

/** Windows-1252's characters from 0x80 to 0x9F, by their Unicode code point. */
const WIN_ANSI_HIGH: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

/** One character's WinAnsi byte, or "?" where it has none. */
function winAnsi(char: string): number {
  const code = char.codePointAt(0) ?? 63;
  if ((code >= 0x20 && code < 0x7f) || (code >= 0xa0 && code <= 0xff)) {
    return code;
  }
  return WIN_ANSI_HIGH[code] ?? 63;
}

/** A PDF string literal of `text`, in WinAnsi, with ( ) and \ escaped. Its characters are all single bytes. */
export function pdfString(text: string): string {
  let out = '(';
  for (const char of text.normalize('NFC')) {
    const byte = winAnsi(char);
    out += byte === 0x28 || byte === 0x29 || byte === 0x5c ? `\\${String.fromCharCode(byte)}` : String.fromCharCode(byte);
  }
  return `${out})`;
}

const num = (value: number) => (Math.round(value * 100) / 100).toString();
const colour = ([r, g, b]: Rgb) => [r, g, b].map(channel => num(channel / 255)).join(' ');

export class PdfDocument {
  private readonly pages: string[][] = [];

  /** Starts a new page; drawing goes onto it. Coordinates are in points from the bottom left. */
  addPage(): void {
    this.pages.push([]);
  }

  get pageCount(): number {
    return this.pages.length;
  }

  private get ops(): string[] {
    if (this.pages.length === 0) {
      this.addPage();
    }
    return this.pages[this.pages.length - 1];
  }

  fillRect(x: number, y: number, width: number, height: number, fill: Rgb): void {
    this.ops.push(`${colour(fill)} rg ${num(x)} ${num(y)} ${num(width)} ${num(height)} re f`);
  }

  strokeRect(x: number, y: number, width: number, height: number, stroke: Rgb, lineWidth = 1, rotateDegrees = 0): void {
    if (rotateDegrees === 0) {
      this.ops.push(`${colour(stroke)} RG ${num(lineWidth)} w ${num(x)} ${num(y)} ${num(width)} ${num(height)} re S`);
      return;
    }
    const angle = (rotateDegrees * Math.PI) / 180;
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    this.ops.push(`q ${num(cos)} ${num(sin)} ${num(-sin)} ${num(cos)} ${num(x)} ${num(y)} cm ${colour(stroke)} RG ${num(lineWidth)} w 0 0 ${num(width)} ${num(height)} re S Q`);
  }

  /**
   * A rubber stamp: `text` in a frame `pad` points around it, both turned `rotateDegrees` about the text's baseline
   * start at (x, y), so frame and letters stay together.
   */
  stamp(text: string, x: number, y: number, font: PdfFont, size: number, ink: Rgb, rotateDegrees: number, pad: { x: number; y: number }): void {
    const key = `F${FONT_KEYS.indexOf(font) + 1}`;
    const angle = (rotateDegrees * Math.PI) / 180;
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    const width = text.length * size * COURIER_ADVANCE;
    this.ops.push(
      `q ${num(cos)} ${num(sin)} ${num(-sin)} ${num(cos)} ${num(x)} ${num(y)} cm ` +
        `${colour(ink)} RG 1.6 w ${num(-pad.x)} ${num(-pad.y)} ${num(width + 2 * pad.x)} ${num(size * 0.72 + 2 * pad.y)} re S ` +
        `BT /${key} ${num(size)} Tf ${colour(ink)} rg 0 0 Td ${pdfString(text)} Tj ET Q`
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: Rgb, lineWidth = 0.5): void {
    this.ops.push(`${colour(stroke)} RG ${num(lineWidth)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`);
  }

  /** Text on one line, its baseline at (x, y). `rotateDegrees` turns it about that point. */
  text(text: string, x: number, y: number, font: PdfFont, size: number, fill: Rgb, rotateDegrees = 0): void {
    const key = `F${FONT_KEYS.indexOf(font) + 1}`;
    const angle = (rotateDegrees * Math.PI) / 180;
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    const matrix = `${num(cos)} ${num(sin)} ${num(-sin)} ${num(cos)} ${num(x)} ${num(y)} Tm`;
    this.ops.push(`BT /${key} ${num(size)} Tf ${colour(fill)} rg ${matrix} ${pdfString(text)} Tj ET`);
  }

  /** The finished file. */
  toBytes(): Uint8Array {
    if (this.pages.length === 0) {
      this.addPage();
    }
    const objects: string[] = [];
    const add = (body: string) => {
      objects.push(body);
      return objects.length;
    };
    const catalog = add('');
    const pagesId = add('');
    const fontIds = FONT_KEYS.map(font => add(`<< /Type /Font /Subtype /Type1 /BaseFont /${FONT_NAMES[font]} /Encoding /WinAnsiEncoding >>`));
    const fonts = fontIds.map((id, index) => `/F${index + 1} ${id} 0 R`).join(' ');
    const pageIds = this.pages.map(ops => {
      const stream = ops.join('\n');
      const contents = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      return add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${num(A4.width)} ${num(A4.height)}] /Resources << /Font << ${fonts} >> >> /Contents ${contents} 0 R >>`
      );
    });
    objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    // Every character is one byte (pdfString keeps text in WinAnsi), so string lengths are byte offsets.
    let file = '%PDF-1.4\n%âãÏÓ\n';
    const offsets: number[] = [];
    objects.forEach((body, index) => {
      offsets.push(file.length);
      file += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = file.length;
    file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    file += offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
    file += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(file.length);
    for (let i = 0; i < file.length; i += 1) {
      bytes[i] = file.charCodeAt(i) & 0xff;
    }
    return bytes;
  }
}
