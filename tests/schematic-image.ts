// The exported image's figure (source/app/plot-style.ts) and its title's mathematics (forge-shell/app/text-math): pure
// layout, no canvas. The spacing is PlotForge's: an 8 pt margin, a 6 pt gap under the title, a 0.75 pt line.
import assert from "node:assert/strict";
import { test } from "node:test";
import { inkHeight, layoutFigure, PT } from "../source/app/plot-style";
import { rasterSize } from "forge-shell/app/raster-export";
import { hasMath, layoutMath } from "forge-shell/app/text-math";

const pad = 8 * PT;

test("without a title the schematic's box is one margin in from every edge, and the schematic one margin in from the box", () => {
  const f = layoutFigure({ width: 400, height: 200 }, null);
  assert.equal(f.title, null);
  assert.deepEqual(f.frame, { x: pad, y: pad, width: 400 + 2 * pad, height: 200 + 2 * pad });
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  near(f.width, 400 + 4 * pad);
  near(f.height, 200 + 4 * pad);
  assert.equal(f.line, 0.75 * PT);
});

test("a title adds its letters and the head gap at the top, and sits halfway between the top edge and the box, centred on it", () => {
  const ink = { width: 120, ascent: 10, descent: 3 };
  const f = layoutFigure({ width: 400, height: 200 }, ink);
  assert.equal(f.frame.y, pad + inkHeight(ink) + 6 * PT);
  assert.deepEqual(f.title, { x: f.frame.x + f.frame.width / 2, y: f.frame.y / 2 });
  assert.equal(f.height, f.frame.y + f.frame.height + pad);
});

test("a title wider than the schematic widens the box with it", () => {
  const f = layoutFigure({ width: 50, height: 50 }, { width: 300, ascent: 10, descent: 3 });
  assert.equal(f.frame.width, 300);
});

test("an empty title takes no room", () => {
  assert.deepEqual(layoutFigure({ width: 100, height: 100 }, { width: 0, ascent: 0, descent: 0 }), layoutFigure({ width: 100, height: 100 }, null));
});

test("the title's mathematics is set as PlotForge sets it", () => {
  assert.equal(hasMath("ZVS driver"), false);
  assert.equal(hasMath("ZVS driver, $V_{in} = 12$ V"), true);
  const measure = (text: string, pt: number) => ({ width: text.length * pt * 0.5, ascent: pt * 0.7, descent: pt * 0.2 });
  const laid = layoutMath("$V_{in}$", 11 * PT, PT, measure, { text: "serif", math: "math" });
  assert.ok(laid.runs.length >= 2);
  assert.ok(laid.runs.some((run) => run.dy > 0), "the subscript drops below the baseline");
  assert.ok(laid.runs.every((run) => run.family === "math"));
});

test("the image is the print size times the resolution, and a size Chromium cannot draw is refused", () => {
  assert.deepEqual(rasterSize(96, 48, 300), { width: 300, height: 150 });
  const big = rasterSize(10000, 10000, 600);
  assert.ok("error" in big && /too large to draw/.test(big.error));
});
