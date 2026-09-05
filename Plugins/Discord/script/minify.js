import fs from "fs-extra";
import { minifySync } from "oxc-minify";
import path from "path";
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filename = "index.js";
const code = fs.readFileSync(path.resolve(__dirname, "../build/ncc_build/index.js"), { encoding: "utf-8" });
const options = {
    compress: {
        target: "esnext",
    },
    mangle: {
        toplevel: false,
    },
    codegen: {
        removeWhitespace: true,
    },
    sourcemap: true,
};
const result = minifySync(filename, code, options);
fs.writeFileSync(path.resolve(__dirname, "../build/ncc_build/index_minify.js"), result.code);
