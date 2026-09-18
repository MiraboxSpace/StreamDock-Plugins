// Renders the plugin and category PNGs from the SVG sources in icons/ (npm run icons).
// Each image is written at its base size and as @2x, the convention read by Stream Deck and StreamDock.
// Sizes satisfy both the Elgato Marketplace and the Mirabox Space style guides.
//
// The action images in imgs/actions/ are edited by hand and are NOT generated here,
// so running this script never overwrites them.
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SD_PLUGIN = "com.mcristoni.windows-shortcuts.sdPlugin";

const IMAGES = [
	{ source: "plugin", output: "imgs/plugin/marketplace", size: 256 },
	{ source: "category", output: "imgs/plugin/category-icon", size: 28 }
];

for (const { source, output, size } of IMAGES) {
	const svg = readFileSync(`icons/${source}.svg`);
	for (const [suffix, width] of [["", size], ["@2x", size * 2]]) {
		const file = path.join(SD_PLUGIN, `${output}${suffix}.png`);
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(file, new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());
		console.log(`${file} (${width}x${width})`);
	}
}
