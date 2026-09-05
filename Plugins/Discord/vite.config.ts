import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
export default defineConfig({
    root: "./src/web",
    publicDir: "../../public",
    build: {
        emptyOutDir: true,
        outDir: "../../build/vite_build",
        // sourcemap: "inline",
        // minify: false,
    },
    plugins: [vue(), viteSingleFile()],
});
