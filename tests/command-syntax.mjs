// Every command syntax and every literal tooltip follows the wording rules of the shell.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: `
    export { CONSOLE_COMMANDS, SCOPE_SUBCOMMANDS, PLOT_SUBCOMMANDS } from "./source/app/commands";
    export { helpCatalog } from "./source/app/command-help";
    export { buildMenus } from "./source/app/menus";
    export { BLOCKS, ENVIRONMENT, forgeApp } from "./source/app/profile";
    export { checkCommandSyntax } from "forge-shell/app/command-help";
    export { blockConformance } from "forge-shell/app/conformance";
    export { shellSettingsPages } from "forge-shell/app/settings-dialog";
    export { createTerminalPreferences } from "forge-shell/app/terminal-preferences";
    export { checkTipWording } from "forge-shell/app/tips";
    export { runSharedCommand } from "forge-shell/app/shared-commands";`, resolveDir: ".", loader: "ts" },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "error",
});
const { CONSOLE_COMMANDS, SCOPE_SUBCOMMANDS, PLOT_SUBCOMMANDS, helpCatalog, buildMenus, BLOCKS, ENVIRONMENT, forgeApp, checkCommandSyntax, blockConformance, shellSettingsPages, createTerminalPreferences, checkTipWording, runSharedCommand } =
  await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);

const problems = [];
for (const command of CONSOLE_COMMANDS) {
  problems.push(...checkCommandSyntax(command.syntax));
  for (const sub of command.subcommands ?? []) problems.push(...checkCommandSyntax(sub.syntax));
}
for (const sub of [...SCOPE_SUBCOMMANDS, ...PLOT_SUBCOMMANDS]) problems.push(...checkCommandSyntax(sub.syntax));
// descriptions: one fragment of at most 70 characters, an initial capital and no final period
for (const { name, description } of CONSOLE_COMMANDS) {
  if (description.length > 70 || /\.$/.test(description) || !/^[A-Z]/.test(description)) problems.push(`${name}: description "${description}"`);
}
assert.deepEqual(problems, [], `command syntax:\n${problems.join("\n")}`);
// the shell's conformance pack: the shared commands' help byte for byte, the File items of the documents block, and every
// menu, Terminal and Settings text in the shell's wording
const settings = { appearance: "dark", showInspector: true, inspectorSide: "right", showBottomPanel: true, autosave: "off" };
const settingsPages = shellSettingsPages(forgeApp, {
  general: { settings, update: () => {} },
  terminal: { fontSize: () => 12, setFontSize: () => {}, preferences: createTerminalPreferences() },
  updates: { info: { productName: "NodeForge", legalName: "SK NodeForge", purpose: "circuit simulator", logo: "", version: "0.0.0" } },
});
const menuState = { canUndo: false, canRedo: false, hasSelection: false, tool: null, hasDocument: true, recent: [] };
const menus = buildMenus([], { root: [] }, true, menuState);
assert.deepEqual(blockConformance({ blocks: BLOCKS, environment: ENVIRONMENT, catalog: helpCatalog, menus, settingsPages }), []);

// settings <key> [value|reset] and settings list run over the Settings pages, so the Terminal hands the shell the pages
// themselves: page ids alone only open pages, and settings image-dpi 300 answered "No settings page"
const mainSource = readFileSync("source/app/main.ts", "utf8");
assert.match(mainSource, /settingsPages: \(\) => visiblePages\(settingsPages\(\)\),/, "the settings command gets the Settings pages, not their ids");
const settingsSpec = CONSOLE_COMMANDS.find((command) => command.name === "settings");
for (const arg of ["list", "image-title-shown on", 'image-title "A title"', "image-dpi reset", "image-dpi 300"])
  assert.ok(settingsSpec.args.test(arg), `settings ${arg} passes the syntax check`);
const host = { run: () => {}, actions: ["app.settings"], hasDocument: true, noun: "circuit", productName: "NodeForge", version: "0.0.0",
  openSettings: () => {}, settingsPages: () => settingsPages };
const listed = runSharedCommand("settings", "list", host);
assert.ok(listed && JSON.stringify(listed).includes("settings "), "settings list lists the keyed rows");
assert.ok(listed?.groups?.some((group) => group.items.some((item) => item.label === "settings autosave")), "settings list lists the keyed rows");
assert.deepEqual(runSharedCommand("settings", "autosave", host), { lines: ["Autosave is off."] }, "settings <key> shows its value");
for (const arg of ["autosave on", "autosave reset", "general"])
  assert.doesNotMatch(JSON.stringify(runSharedCommand("settings", arg, host)), /No settings page/, `settings ${arg} is not a page name`);

// literal tooltips: setTip(element, "text")
const tips = [];
for (const file of readdirSync("source/app").filter((name) => name.endsWith(".ts"))) {
  const text = readFileSync(`source/app/${file}`, "utf8");
  for (const match of text.matchAll(/setTip\(\s*[\w.\[\]()]+,\s*"((?:[^"\\]|\\.)*)"\s*\)/g)) tips.push([file, match[1]]);
}
const tipProblems = tips.flatMap(([file, tip]) => checkTipWording(tip).map((problem) => `${file}: ${problem}`));
console.log(`${CONSOLE_COMMANDS.length} commands and ${tips.length} literal tooltips checked.`);
assert.deepEqual(tipProblems, [], `tooltip wording:\n${tipProblems.join("\n")}`);
