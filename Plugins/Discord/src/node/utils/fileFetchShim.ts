import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const originalFetch = globalThis.fetch?.bind(globalThis);

function getLocalPath(input: unknown): string {
    const value = input instanceof URL ? input.href : typeof input === "string" ? input : typeof (input as { url?: unknown })?.url === "string" ? String((input as { url: string }).url) : "";
    if (!value) return "";
    if (/^[a-zA-Z]:[\\/]/.test(value)) return value;
    if (value.startsWith("file:")) return fileURLToPath(value);

    try {
        const url = new URL(value);
        if (url.protocol === "file:") return fileURLToPath(url);
        if (/^[a-zA-Z]:$/.test(url.protocol)) return `${url.protocol.slice(0, 1)}:${decodeURIComponent(url.pathname).replace(/\//g, "\\")}`;
        return "";
    } catch {}

    if (value.endsWith(".wasm")) return path.resolve(process.cwd(), value);
    return "";
}

if (originalFetch && !(globalThis as any).__streamDockFileFetchPatched) {
    (globalThis as any).__streamDockFileFetchPatched = true;
    globalThis.fetch = async (input: any, init?: RequestInit): Promise<Response> => {
        const filePath = getLocalPath(input);
        if (!filePath) return originalFetch(input, init);

        try {
            const body = await readFile(filePath);
            return new Response(body, {
                status: 200,
                headers: {
                    "content-type": filePath.endsWith(".wasm") ? "application/wasm" : "application/octet-stream",
                },
            });
        } catch {
            return new Response(null, { status: 404, statusText: "Not Found" });
        }
    };
}
