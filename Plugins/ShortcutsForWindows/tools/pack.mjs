// Builds the plugin and writes the release artifacts to dist/ (npm run pack):
//   com.mcristoni.windows-shortcuts.streamDeckPlugin -> Elgato Stream Deck installer (double-click to install)
//   com.mcristoni.windows-shortcuts.sdPlugin.zip     -> StreamDock / Fifine Control Deck (extract into the plugins folder)
// A .streamDeckPlugin file is a zip whose root is the .sdPlugin folder, so the StreamDock zip is the same bytes.
import { execSync } from "node:child_process";
import { copyFileSync, rmSync } from "node:fs";

const UUID = "com.mcristoni.windows-shortcuts";
const OUT_DIR = "dist";

const run = (command) => execSync(command, { stdio: "inherit" });

rmSync(OUT_DIR, { recursive: true, force: true });
run("npm run build");
run(`npx streamdeck pack ${UUID}.sdPlugin --output ${OUT_DIR} --force --no-update-check`);
copyFileSync(`${OUT_DIR}/${UUID}.streamDeckPlugin`, `${OUT_DIR}/${UUID}.sdPlugin.zip`);

console.log(`\nRelease artifacts:\n  ${OUT_DIR}/${UUID}.streamDeckPlugin\n  ${OUT_DIR}/${UUID}.sdPlugin.zip`);
