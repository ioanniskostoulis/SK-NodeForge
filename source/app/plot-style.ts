// Licensed under the GNU General Public License v2 or later. See LICENSE.
// The look of an exported schematic image (2026-11-21), copied from PlotForge's plot (PLOT_STYLE and layoutPlot in its
// plot.ts) so a NodeForge figure sits beside a PlotForge plot in a report: black on white, a 0.75 pt black border round
// the image and round the schematic, one 8 pt outer margin on all four sides, and an optional title above the schematic,
// 11 pt by default, centred on it and halfway between the top edge and the schematic's box. NodeForge keeps its own copy
// of these values (the owner's choice: not shared through the shell).
import { FONT_FALLBACK } from "forge-shell/app/font-choice";
import type { MeasureText, TextInk } from "forge-shell/app/text-math";

/** Points to print pixels: an image is laid out at 96 pixels per inch, so 1 world unit is 1 pixel at print size. */
export const PT = 96 / 72;

export type { MeasureText, TextInk };

export const inkHeight = (ink: TextInk) => ink.ascent + ink.descent;
/** The baseline's offset from the middle of a text's ink, so that the letters are centred on a point. */
export const inkCentre = (ink: TextInk) => (ink.ascent - ink.descent) / 2;

/** PlotForge's plot style, in points. */
export const PLOT_STYLE = {
  /** The image's border and the schematic's box. */
  linePt: 0.75,
  ink: "#000000",
  paper: "#FFFFFF",
  /** The outer margin, the same on all four sides: from the border to the schematic's box or the title. */
  padPt: 8,
  /** From the title's letters to the schematic's box. */
  headGapPt: 6,
};

/** The text settings PlotForge ships: an 11 pt title in Libertinus Serif, with Libertinus Math for mathematics. */
export const BUILT_IN_PLOT_TEXT = { titlePt: 11, font: FONT_FALLBACK.text.shipped, mathFont: FONT_FALLBACK.math.shipped };
export const PLOT_TITLE_SIZES: readonly number[] = [7, 8, 9, 10, 11, 12, 14, 16];

export interface Box { x: number; y: number; width: number; height: number }

/** Where the parts of an exported image go, in print pixels (96 per inch). */
export interface FigureLayout {
  width: number;
  height: number;
  /** The schematic's box: its outline is drawn here and the schematic is drawn inside it, `pad` in from it. */
  frame: Box;
  /** The centre of the title's ink, or null without a title. */
  title: { x: number; y: number } | null;
  /** The outer margin, also kept between the schematic's box and the schematic. */
  pad: number;
  line: number;
}

/**
 * The figure round a schematic of `content` size (world units, which are print pixels): the schematic in its box,
 * `pad` in from it; the box `pad` in from the image's edges; a title adds its letters' height and the head gap at the
 * top, and sits halfway between the top edge and the box, centred on the box (PlotForge's rule, 2026-11-19).
 */
export function layoutFigure(content: { width: number; height: number }, title: TextInk | null): FigureLayout {
  const s = PLOT_STYLE, pad = s.padPt * PT, line = s.linePt * PT;
  const head = pad + (title && title.width ? inkHeight(title) + s.headGapPt * PT : 0);
  // a title wider than the schematic widens the box with it, so the title is never cut at the edges
  const boxWidth = Math.max(content.width + 2 * pad, title ? title.width : 0);
  const frame = { x: pad, y: head, width: boxWidth, height: content.height + 2 * pad };
  const width = frame.width + 2 * pad, height = frame.y + frame.height + pad;
  return { width, height, frame, pad, line, title: title && title.width ? { x: frame.x + frame.width / 2, y: frame.y / 2 } : null };
}
