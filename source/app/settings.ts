// Licensed under the GNU General Public License v2 or later. See LICENSE.
import { currentShape, type CurrentShape } from "./current-flow";
import { createSettingsStore } from "forge-shell/app/settings";
import { settingsStorageKey } from "forge-shell/app/profile";
import { forgeApp } from "./profile";
import { parseAutosave, type AutosaveChoice } from "forge-shell/app/saving";
import { isFontName } from "forge-shell/app/font-choice";
import { BUILT_IN_PLOT_TEXT } from "./plot-style";
import { APPEARANCES, resolveAppearance, type Appearance } from "forge-shell/app/shell-preferences";

/** App-wide options (the CircuitJS Options menu), persisted in local storage. */
export interface Settings {
  /** Appearance of the application chrome and schematic sheet; System follows the system's light or dark. */
  appearance: Appearance;
  showCurrent: boolean;
  showVoltage: boolean;
  showValues: boolean;
  /** Draw a bridge where separate wires cross without a junction. */
  showWireJumps: boolean;
  /** The hover card: the details of the part or wire under the pointer, beside it (the shell's Show hover card). */
  hoverCard: boolean;
  /** Show the hovered scope's circuit-time readout on every visible time plot. */
  linkedReadout: boolean;
  /** Schematic and toolbar symbol convention, for every part with a distinct variant. */
  symbolStyle: "us" | "iec";
  /** Temperatures are shown and typed in °C, °F or K (the circuit stores °C). */
  temperatureUnit: "C" | "F" | "K";
  whiteBackground: boolean;
  /** Fade a text field's caret in and out as it blinks (forge-shell text-caret; Settings › General). */
  smoothFieldCaret: boolean;
  conventionalCurrent: boolean;
  currentShape: CurrentShape;
  currentSteadyBand: boolean;
  currentSteadyArrows: boolean;
  /**
   * The scroll wheel always zooms (for a mouse the trackpad check gets wrong); otherwise a
   * trackpad's two-finger scroll pans and a mouse wheel zooms.
   */
  wheelZooms: boolean;
  /** NodeForge's engine (error-controlled steps) or CircuitJS (fixed steps, exactly as CircuitJS). */
  solver: "nodeforge" | "circuitjs";
  /** NodeForge engine: allowed relative error per step. */
  relTol: number;
  /** Work out recommended settings in the background whenever a circuit sits unedited. */
  backgroundAnalysis: boolean;
  /** Current marker speed relative to the default (0.1–5×). */
  dotSpeed: number;
  showInspector: boolean;
  inspectorSide: "left" | "right";
  showBottomPanel: boolean;
  bottomPanelHeight: number;
  inspectorWidth: number;
  adjustExpanded: boolean;
  propertiesExpanded: boolean;
  pointerExpanded: boolean;
  sliderConfigExpanded: boolean;
  terminalFontSize: number;
  /** Save circuits that have a file: off, a while after the last edit, or when the window loses focus (desktop). */
  autosave: AutosaveChoice;
  /** Settings › Export › Image: how the schematic is written as an image (schematic-image.ts). */
  imageFormat: "png" | "jpeg";
  imageDpi: number;
  imageJpegQuality: number;
  /** Whether the title is drawn above the schematic, and its text (mathematics between dollar signs). */
  imageTitleShown: boolean;
  imageTitle: string;
  imageTitlePt: number;
  /** The figure's text and maths fonts (PlotForge's Libertinus Serif and Libertinus Math by default). */
  imageFont: string;
  imageMathFont: string;
}

export const DEFAULTS: Settings = {
  appearance: "dark",
  showCurrent: true,
  showVoltage: true,
  showValues: true,
  showWireJumps: false,
  hoverCard: true,
  linkedReadout: false,
  symbolStyle: "us",
  temperatureUnit: "C",
  whiteBackground: false,
  smoothFieldCaret: true,
  conventionalCurrent: true,
  currentShape: "dots",
  currentSteadyBand: false,
  currentSteadyArrows: true,
  wheelZooms: false,
  dotSpeed: 1,
  solver: "nodeforge",
  relTol: 1e-5,
  backgroundAnalysis: true,
  showInspector: true,
  inspectorSide: "right",
  showBottomPanel: true,
  bottomPanelHeight: 246,
  inspectorWidth: 246,
  adjustExpanded: false,
  propertiesExpanded: true,
  pointerExpanded: true,
  sliderConfigExpanded: false,
  terminalFontSize: 12,
  autosave: "off",
  imageFormat: "png",
  imageDpi: 300,
  imageJpegQuality: 90,
  imageTitleShown: false,
  imageTitle: "",
  imageTitlePt: BUILT_IN_PLOT_TEXT.titlePt,
  imageFont: BUILT_IN_PLOT_TEXT.font,
  imageMathFont: BUILT_IN_PLOT_TEXT.mathFont,
};

const RANGES: Partial<Record<keyof Settings, [number, number]>> = {
  inspectorWidth: [246, 420], bottomPanelHeight: [246, 640], terminalFontSize: [10, 24], dotSpeed: [0.1, 5], relTol: [1e-9, 1],
  imageDpi: [72, 1200], imageJpegQuality: [1, 100], imageTitlePt: [5, 36],
};
const CHOICES: Partial<Record<keyof Settings, readonly string[]>> = {
  appearance: APPEARANCES, inspectorSide: ["left", "right"], imageFormat: ["png", "jpeg"],
};

/**
 * Restore saved preferences: a missing or invalid value takes its default, a key that is no longer defined is dropped,
 * and names used by previous app versions are mapped to the current ones.
 */
export function restoreSettings(stored: Record<string, unknown>): Settings {
  const loaded: Record<string, unknown> = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    const value = stored[key];
    if (typeof value !== typeof DEFAULTS[key]) continue;
    const range = RANGES[key];
    if (typeof value === "number") {
      if (Number.isFinite(value)) loaded[key] = range ? Math.min(range[1], Math.max(range[0], value)) : value;
    } else if (!CHOICES[key] || CHOICES[key]!.includes(value as string)) loaded[key] = value;
  }
  loaded.symbolStyle = stored.symbolStyle === "iec" || stored.symbolStyle === "us" ? stored.symbolStyle
    : stored.symbolStyle === "eu" || stored.euroResistors === true || stored.europeanSymbols === true ? "iec" : DEFAULTS.symbolStyle;
  loaded.temperatureUnit = stored.temperatureUnit === "F" || stored.temperatureUnit === "K" ? stored.temperatureUnit : "C";
  if (stored.currentShape === "steady") loaded.currentSteadyBand = true;
  // the canvas readout under the pointer, before the shell's hover card replaced it
  if (typeof stored.hoverCard !== "boolean" && stored.showReadout === false) loaded.hoverCard = false;
  // the NodeForge engine was saved as "accurate" before it was named
  loaded.solver = stored.solver === "circuitjs" ? "circuitjs" : "nodeforge";
  for (const key of ["imageDpi", "imageJpegQuality"] as const) loaded[key] = Math.round(loaded[key] as number);
  for (const key of ["imageFont", "imageMathFont"] as const) if (!isFontName(loaded[key])) loaded[key] = DEFAULTS[key];
  loaded.autosave = parseAutosave(stored.autosave) ?? DEFAULTS.autosave;
  loaded.currentShape = typeof stored.currentShape === "string" ? currentShape(stored.currentShape) ?? DEFAULTS.currentShape : DEFAULTS.currentShape;
  return loaded as unknown as Settings;
}

export const { settings, updateSettings, onSettingsChange } = createSettingsStore(settingsStorageKey(forgeApp), DEFAULTS, restoreSettings);

/** Whether the sheet and scopes are drawn light: the Light appearance, or System while the system is light. */
export function lightAppearance(): boolean {
  const systemDark = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)").matches : true;
  return resolveAppearance(settings.appearance, systemDark) === "light";
}
