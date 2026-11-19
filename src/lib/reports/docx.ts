import {
  Paragraph, Table, TableRow, TableCell, TextRun, ImageRun, WidthType, AlignmentType,
  HeadingLevel, ShadingType, HeightRule, VerticalAlign, PageBreak,
} from "docx";
import fs from "fs";
import path from "path";

// A4 portrait with 0.6" margins → usable width in twentieths of a point.
export const PAGE_MARGIN = 900;
export const CONTENT_WIDTH = 11906 - 2 * PAGE_MARGIN;

const FONT  = "Arial";
const BLUE  = "1D5FA8";
const GREY  = "666666";
const HEAD  = "D9E4F2";
const ZEBRA = "F7F5F1";

export type Cell = string | number | { text: string | number; bold?: boolean; color?: string; fill?: string; italic?: boolean };

export function getLogo(): Buffer | null {
  try {
    const p = path.join(process.cwd(), "public", "knet-logo.jpg");
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch {}
  return null;
}

export function text(value: string, opts: { size?: number; bold?: boolean; color?: string; italic?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing:   { after: 80 },
    children:  [new TextRun({ text: value, size: opts.size ?? 20, bold: opts.bold, italics: opts.italic, color: opts.color, font: FONT })],
  });
}

export const gap = () => new Paragraph({ children: [new TextRun({ text: "" })] });
export const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

export function sectionTitle(value: string) {
  return new Paragraph({
    heading:  HeadingLevel.HEADING_1,
    spacing:  { before: 240, after: 120 },
    border:   { bottom: { color: BLUE, size: 12, style: "single", space: 4 } },
    children: [new TextRun({ text: value, bold: true, size: 30, color: BLUE, font: FONT })],
  });
}

export function heading(value: string, note?: string) {
  return [
    new Paragraph({
      heading:  HeadingLevel.HEADING_2,
      spacing:  { before: 200, after: note ? 40 : 100 },
      children: [new TextRun({ text: value, bold: true, size: 24, font: FONT })],
    }),
    ...(note ? [text(note, { size: 16, color: GREY, italic: true })] : []),
  ];
}

export function emptyNote(value: string) {
  return text(value, { size: 18, color: GREY, italic: true });
}

function cell(value: Cell, width: number, header: boolean, zebra: boolean, align?: "center" | "right") {
  const v = typeof value === "object" ? value : { text: value };
  return new TableCell({
    width:         { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins:       { top: 40, bottom: 40, left: 80, right: 80 },
    shading:       header || v.fill || zebra
      ? { type: ShadingType.CLEAR, color: "auto", fill: header ? HEAD : v.fill ?? ZEBRA }
      : undefined,
    children: [new Paragraph({
      alignment: align === "center" ? AlignmentType.CENTER : align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children:  [new TextRun({ text: String(v.text ?? ""), bold: header || v.bold, italics: v.italic, color: v.color, size: header ? 17 : 16, font: FONT })],
    })],
  });
}

// weights: relative column widths; align: per-column alignment for body cells.
export function table(opts: {
  headers: string[];
  rows:    Cell[][];
  weights: number[];
  align?:  ("left" | "center" | "right")[];
}) {
  const total  = opts.weights.reduce((a, b) => a + b, 0);
  const widths = opts.weights.map((w) => Math.floor((w / total) * CONTENT_WIDTH));
  const align  = (i: number) => (opts.align?.[i] === "left" ? undefined : opts.align?.[i]);

  return new Table({
    width:        { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        height:      { value: 360, rule: HeightRule.ATLEAST },
        children:    opts.headers.map((h, i) => cell(h, widths[i], true, false, align(i))),
      }),
      ...opts.rows.map((r, ri) => new TableRow({
        cantSplit: true,
        children:  r.map((c, i) => cell(c, widths[i], false, ri % 2 === 1, align(i))),
      })),
    ],
  });
}

// Small key-figures table: [label, value, note]
export function keyFigures(items: [string, string | number, string][]) {
  return table({
    headers: ["Figure", "Value", "What it means"],
    weights: [3, 1.4, 5],
    align:   ["left", "center", "left"],
    rows:    items.map(([l, v, n]) => [l, { text: v, bold: true }, { text: n, color: GREY }]),
  });
}

export function reportHeader(opts: { title: string; lines: string[] }) {
  const logo = getLogo();
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children:  logo
        ? [new ImageRun({ data: logo, type: "jpg", transformation: { width: 80, height: 65 } })]
        : [new TextRun({ text: "KNET", bold: true, size: 36, font: FONT })],
    }),
    text("KIMS — KNET INVENTORY MANAGEMENT SYSTEM", { size: 24, bold: true, align: AlignmentType.CENTER }),
    text(opts.title.toUpperCase(), { size: 32, bold: true, color: BLUE, align: AlignmentType.CENTER }),
    gap(),
    ...opts.lines.map((l, i) => text(l, { size: i === 0 ? 22 : 18, color: i === 0 ? undefined : GREY })),
    gap(),
  ];
}
