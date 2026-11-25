// Licensed under the GNU General Public License v2 or later. See LICENSE.
// The schematic as an image (2026-11-21): the whole circuit or the selected parts drawn as a technical drawing, in a
// figure laid out as PlotForge lays out a plot (plot-style.ts): a black-outlined white image, the schematic in a
// black-outlined box, and an optional title above it, with mathematics between dollar signs (forge-shell's text-math). It
// is drawn at its print size (96 pixels per inch, one world unit a pixel) times the resolution, and written as PNG or JPEG
// with that resolution recorded in the file (forge-shell's raster-export).
import type { CircuitElm } from "../engine";
import { fontFamily } from "forge-shell/app/font-choice";
import { Viewport } from "forge-shell/app/viewport";
import { canvasBytes, rasterSize } from "forge-shell/app/raster-export";
import { drawTextRuns, hasMath, layoutMath, withMath, type MeasureText, type TextInk } from "forge-shell/app/text-math";
import type { SimulationModel } from "./model";
import { inkCentre, layoutFigure, PLOT_STYLE, PT } from "./plot-style";
import { SchematicRenderer } from "./renderer";
import { plotTheme } from "./theme";

export type ImageFormat = "png" | "jpeg";
export const IMAGE_FORMATS: readonly ImageFormat[] = ["png", "jpeg"];

export interface SchematicImageOptions {
  format: ImageFormat;
  /** Dots per inch at print size. */
  dpi: number;
  /** 1–100, for JPEG. */
  jpegQuality: number;
  /** The title above the schematic; empty or null shows none. */
  title: string | null;
  titlePt: number;
  /** Font names (forge-shell's font choice), drawn with their shipped fallbacks. */
  font: string;
  mathFont: string;
  /** Just these parts and wires; null for the whole circuit. */
  only: ReadonlySet<CircuitElm> | null;
}

/** A text's ink, measured on a canvas, at a size in points: in the family given, or the title's own. */
function canvasMeasure(ctx: CanvasRenderingContext2D, ownFamily: string): MeasureText {
  return (text, pt, family) => {
    ctx.font = `${pt * PT}px ${family ?? ownFamily}`;
    const m = ctx.measureText(text);
    return { width: m.width, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent };
  };
}

/** Wait for the figure's fonts, so the first export is not set in a fallback. */
async function fontsReady(families: readonly string[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(families.map((family) => document.fonts.load(`12px ${family}`).catch(() => [])));
}

/** Draw the schematic image and encode it. Throws a sentence when there is nothing to draw or it is too large. */
export async function schematicImage(model: SimulationModel, options: SchematicImageOptions): Promise<Uint8Array> {
  const text = fontFamily(options.font, "text"), math = fontFamily(options.mathFont, "math");
  await fontsReady([text, math]);
  const renderer = new SchematicRenderer(model);
  const plot = { only: options.only, labelFamily: text };
  const measureCanvas = document.createElement("canvas").getContext("2d")!;
  const extent = renderer.plotExtent(measureCanvas, plotTheme, plot);
  if (!extent) throw new Error(options.only ? "Select the parts to export first." : "The circuit is empty: there is nothing to export.");

  const title = options.title?.trim() ?? "";
  const plain = canvasMeasure(measureCanvas, text);
  const measure = withMath(plain, PT, () => ({ text, math }));
  const titleInk: TextInk | null = title ? measure(title, options.titlePt) : null;
  const layout = layoutFigure({ width: extent.w, height: extent.h }, titleInk);
  const size = rasterSize(layout.width, layout.height, options.dpi);
  if ("error" in size) throw new Error(size.error);

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d")!;
  const k = options.dpi / 96;
  ctx.scale(k, k);
  ctx.fillStyle = PLOT_STYLE.paper;
  ctx.fillRect(0, 0, layout.width, layout.height);

  // the schematic, centred in its box (a long title can make the box wider than the schematic), clipped to the box
  const { frame, pad, line } = layout;
  const ox = frame.x + (frame.width - extent.w) / 2 - extent.x, oy = frame.y + pad - extent.y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.width, frame.height);
  ctx.clip();
  ctx.translate(frame.x, frame.y);
  renderer.draw(ctx, frame.width, frame.height, new Viewport(1, ox - frame.x, oy - frame.y), plotTheme, null, { marquee: null, handles: false, pointer: null }, plot);
  ctx.restore();

  ctx.strokeStyle = PLOT_STYLE.ink;
  ctx.lineWidth = line;
  ctx.strokeRect(line / 2, line / 2, layout.width - line, layout.height - line);
  ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

  if (layout.title && titleInk) drawTitle(ctx, title, layout.title, options.titlePt * PT, titleInk, plain, { text, math });

  return canvasBytes(canvas, options.format, { quality: options.jpegQuality, dpi: options.dpi });
}

/** The title, its letters centred on `at`: plain text in the text font, or runs of text and mathematics as PlotForge sets them. */
function drawTitle(ctx: CanvasRenderingContext2D, title: string, at: { x: number; y: number }, sizePx: number, ink: TextInk, plain: MeasureText, families: { text: string; math: string }): void {
  const baseline = at.y + inkCentre(ink);
  ctx.fillStyle = PLOT_STYLE.ink;
  ctx.textBaseline = "alphabetic";
  if (!hasMath(title)) {
    ctx.font = `${sizePx}px ${families.text}`;
    ctx.textAlign = "center";
    ctx.fillText(title, at.x, baseline);
    return;
  }
  const laid = layoutMath(title, sizePx, PT, plain, families);
  drawTextRuns(ctx, laid.runs, at.x - laid.ink.width / 2, baseline);
}
