// Licensed under the GNU General Public License v2 or later. See LICENSE.

import { formatNumber, SI_PREFIXES } from "forge-shell/app/number-format";

/** Plane angle and percent are written against the number: 90°, 20%. */
const NO_SPACE = new Set(["°", "%"]);

/** The value at `digits` significant digits, so the shell writes it without trailing zeros. */
const rounded = (v: number, digits: number) => Number(v.toPrecision(Math.max(1, Math.min(21, digits))));

/**
 * The shell's SI prefix notation at `digits` significant digits: si(4700, "Ω") = "4.7 kΩ", si(0.0123, "A") = "12.3 mA",
 * with a true minus sign. NaN is a dash; °C and °F are written as they are (0.5 °C, never 500 m°C).
 */
export function si(v: number, unit: string, spaced = true, digits = 3): string {
  const sp = spaced && unit && !NO_SPACE.has(unit) ? " " : "";
  if (Number.isNaN(v)) return "–" + sp + unit;
  const value = Math.abs(v) < 1e-14 ? 0 : rounded(v, digits);
  const text = unit.startsWith("°") || unit === "%"
    ? formatNumber(value, { notation: "fixed", decimals: null, unit: unit || undefined })
    : formatNumber(value, { notation: "si", decimals: null, unit: unit || undefined });
  const joined = unit ? text : text.replace(" ", "");
  return spaced ? joined : joined.replace(" ", "");
}

/** The SI prefix exponent of a size, kilo-style steps from femto to tera. */
function prefixExponent(size: number): number {
  if (size < 1e-14) return 0;
  return Math.max(-15, Math.min(12, Math.floor(Math.log10(size / 0.9995) / 3) * 3));
}

/**
 * Labels for one axis in one form of its unit: the SI prefix of its largest value, and as many
 * decimals as its step needs, the same on every label (0.5 V, 1.0 V, 1.5 V; never 500mV and 1V).
 */
export function axisFormat(max: number, step: number, unit: string): (v: number) => string {
  const exponent = unit.startsWith("°") ? 0 : prefixExponent(Math.abs(max));
  const scale = 10 ** exponent, label = `${SI_PREFIXES[exponent] ?? ""}${unit}` || undefined;
  const decimals = step > 0 ? Math.min(6, Math.max(0, Math.ceil(-Math.log10(step / scale) - 1e-9))) : 0;
  return (v: number) => {
    const x = v / scale;
    return formatNumber(Number(x.toFixed(decimals)) === 0 ? 0 : x, { notation: "fixed", decimals, unit: label });
  };
}

const MULTIPLIERS: Record<string, number> = { T: 1e12, G: 1e9, M: 1e6, k: 1e3, K: 1e3, m: 1e-3, u: 1e-6, "µ": 1e-6, "μ": 1e-6, n: 1e-9, p: 1e-12, f: 1e-15 };

/**
 * Parse a typed value with an optional SI prefix and unit (CircuitJS's EditDialog.parseUnits):
 * "4.7k", "10u", "2.2 µF", "1M" (mega; "m" is milli), "5e-3". Returns NaN if it isn't a number.
 */
/** A time typed as a number with an optional SI prefix and an optional "s" ("50ns", "1 ms", "2e-6"); NaN for anything
 * else, such as a value in another unit ("5V"), which parseSI would read as 5. */
export function parseTime(text: string): number {
  return /^[-+]?\d*\.?\d+(?:e[-+]?\d+)?\s*(?:meg|[TGMkKmuµμnpf])?s?$/i.test(text.trim()) ? parseSI(text.replace(/μ/g, "µ"), "s") : NaN;
}

export function parseSI(text: string, unit = ""): number {
  let s = text.trim().replace(/,/g, ".").replace(/−/g, "-");
  // a trailing unit symbol is optional
  for (const u of [unit, "Ω", "ohms", "ohm", "Hz", "F", "H", "V", "A", "W", "s", "°"]) {
    if (u && s.endsWith(u) && s.length > u.length) {
      s = s.slice(0, -u.length).trim();
      break;
    }
  }
  if (/meg$/i.test(s)) return Number(s.slice(0, -3)) * 1e6;
  const m = MULTIPLIERS[s.slice(-1)];
  if (m !== undefined && s.length > 1) return Number(s.slice(0, -1).trim()) * m;
  return s === "" ? NaN : Number(s);
}
