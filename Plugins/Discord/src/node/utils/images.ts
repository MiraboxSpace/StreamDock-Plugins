import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import "./fileFetchShim.js";
import { createJimp } from "@jimp/core";
import { defaultFormats, defaultPlugins } from "jimp";
import webp from "@jimp/wasm-webp";
import { log } from "@mirabox/streamdock-sdk/node";
import { fetchWithTimeout } from "./http.js";

const Jimp = createJimp({
    formats: [...defaultFormats, webp],
    plugins: defaultPlugins,
});

const CACHE_DIR = path.resolve(process.cwd(), "cache/images");
const DIGITS: Record<string, string[]> = {
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"],
};

const NOTICE_BADGE_LAYOUT = {
    xPercent: 85,
    yPercent: 15,
    widthPercent: 20,
    heightPercent: 20,
    digitScale: 3,
    alpha: 0.62,
};

function md5(value: string): string {
    return crypto.createHash("md5").update(value).digest("hex");
}

function normalizeDiscordImageUrl(url: string): string {
    if (!url) return "";
    return url.includes("?size=") ? url : `${url}${url.includes("?") ? "&" : "?"}size=128`;
}

function dataUrlToBuffer(dataUrl: string): Buffer | null {
    const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(dataUrl);
    return match ? Buffer.from(match[1], "base64") : null;
}

function escapeXml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function ensureCacheDir(): Promise<void> {
    await fsp.mkdir(CACHE_DIR, { recursive: true });
}

async function getNoticeBaseIcon(customIconPath = ""): Promise<any> {
    const candidates = [customIconPath, path.resolve(process.cwd(), "icon/notice.png"), path.resolve(process.cwd(), "public/icon/notice.png")].filter(Boolean);
    for (const existing of candidates.filter((item) => fs.existsSync(item))) {
        try {
            const image = await Jimp.read(existing);
            image.resize({ w: 128, h: 128 });
            return image;
        } catch (error) {
            log.error("read notice base icon failed", { path: existing, error });
        }
    }
    return new Jimp({ width: 128, height: 128, color: 0x2c2f33ff });
}

async function getNoneBaseImage(width: number, height: number): Promise<any> {
    const candidates = [path.resolve(process.cwd(), "icon/none.png"), path.resolve(process.cwd(), "public/icon/none.png")];
    const existing = candidates.find((item) => fs.existsSync(item));
    if (!existing) return new Jimp({ width, height, color: 0x00000000 });
    const image = await Jimp.read(existing);
    image.resize({ w: width, h: height });
    return image;
}

async function getNoticeBadgeImage(diameter: number): Promise<any | null> {
    const candidates = [path.resolve(process.cwd(), "icon/notice_badge.png"), path.resolve(process.cwd(), "public/icon/notice_badge.png")];
    const existing = candidates.find((item) => fs.existsSync(item));
    if (!existing) return null;
    try {
        const image = await Jimp.read(existing);
        image.resize({ w: diameter, h: diameter });
        return image;
    } catch (error) {
        log.error("read notice badge image failed", { path: existing, error });
        return null;
    }
}

async function normalizeImageBuffer(buffer: Buffer): Promise<Buffer> {
    const image = await Jimp.fromBuffer(buffer);
    image.resize({ w: 128, h: 128 });
    return Buffer.from(await image.getBuffer("image/png"));
}

export async function getImageAndCache(url: string, returnBuffer = false): Promise<string | Buffer | null> {
    if (!url) return null;
    await ensureCacheDir();
    const normalizedUrl = normalizeDiscordImageUrl(url);
    const cacheFilePath = path.join(CACHE_DIR, `${md5(normalizedUrl)}.png`);
    try {
        const cached = await fsp.readFile(cacheFilePath);
        return returnBuffer ? cached : `data:image/png;base64,${cached.toString("base64")}`;
    } catch {}

    try {
        const response = await fetchWithTimeout(normalizedUrl, {}, 6000);
        if (!response.ok) return null;
        const normalized = await normalizeImageBuffer(Buffer.from(await response.arrayBuffer()));
        await fsp.writeFile(cacheFilePath, normalized);
        return returnBuffer ? normalized : `data:image/png;base64,${normalized.toString("base64")}`;
    } catch (error) {
        log.error("getImageAndCache failed", error);
        return null;
    }
}

export async function cacheDataUrl(key: string, dataUrl: string): Promise<string | null> {
    const buffer = dataUrlToBuffer(dataUrl);
    if (!buffer) return dataUrl || null;
    await ensureCacheDir();
    const cacheFilePath = path.join(CACHE_DIR, `${md5(key)}.png`);
    try {
        const cached = await fsp.readFile(cacheFilePath);
        return `data:image/png;base64,${cached.toString("base64")}`;
    } catch {}

    try {
        const normalized = await normalizeImageBuffer(buffer);
        await fsp.writeFile(cacheFilePath, normalized);
        return `data:image/png;base64,${normalized.toString("base64")}`;
    } catch (error) {
        log.error("cacheDataUrl failed", error);
        return dataUrl || null;
    }
}

export async function getCachedDataUrl(key: string): Promise<string | null> {
    await ensureCacheDir();
    const cacheFilePath = path.join(CACHE_DIR, `${md5(key)}.png`);
    try {
        const cached = await fsp.readFile(cacheFilePath);
        return `data:image/png;base64,${cached.toString("base64")}`;
    } catch {
        return null;
    }
}

export async function cacheDataUrlPath(key: string, dataUrl: string): Promise<string | null> {
    const buffer = dataUrlToBuffer(dataUrl);
    if (!buffer) return null;
    await ensureCacheDir();
    const cacheFilePath = path.join(CACHE_DIR, `${md5(key)}.png`);
    try {
        await fsp.access(cacheFilePath);
        return cacheFilePath;
    } catch {}

    try {
        const normalized = await normalizeImageBuffer(buffer);
        await fsp.writeFile(cacheFilePath, normalized);
        return cacheFilePath;
    } catch (error) {
        log.error("cacheDataUrlPath failed", error);
        return null;
    }
}

export async function getCachedDataUrlPath(key: string): Promise<string | null> {
    await ensureCacheDir();
    const cacheFilePath = path.join(CACHE_DIR, `${md5(key)}.png`);
    try {
        await fsp.access(cacheFilePath);
        return cacheFilePath;
    } catch {
        return null;
    }
}

function drawDigit(image: any, digit: string, x: number, y: number, scale: number, color: number): void {
    const rows = DIGITS[digit] || DIGITS["0"];
    rows.forEach((row, rowIndex) => {
        [...row].forEach((cell, colIndex) => {
            if (cell !== "1") return;
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    image.setPixelColor(color, x + colIndex * scale + dx, y + rowIndex * scale + dy);
                }
            }
        });
    });
}

function blendPixel(image: any, x: number, y: number, r: number, g: number, b: number, alpha: number): void {
    if (x < 0 || y < 0 || x >= image.bitmap.width || y >= image.bitmap.height) return;
    const current = image.getPixelColor(x, y) >>> 0;
    const currentR = (current >>> 24) & 0xff;
    const currentG = (current >>> 16) & 0xff;
    const currentB = (current >>> 8) & 0xff;
    const currentA = current & 0xff;
    const inv = 1 - alpha;
    const outR = Math.round(r * alpha + currentR * inv);
    const outG = Math.round(g * alpha + currentG * inv);
    const outB = Math.round(b * alpha + currentB * inv);
    image.setPixelColor((outR << 24) | (outG << 16) | (outB << 8) | currentA, x, y);
}

function drawCircleBadge(image: any, x: number, y: number, diameter: number, alpha: number): void {
    const radius = diameter / 2;
    const cx = x + radius;
    const cy = y + radius;
    const right = x + diameter - 1;
    const bottom = y + diameter - 1;
    const rr = radius * radius;
    for (let py = y; py <= bottom; py++) {
        for (let px = x; px <= right; px++) {
            const dx = px - cx;
            const dy = py - cy;
            if (dx * dx + dy * dy <= rr) blendPixel(image, px, py, 0, 0, 0, alpha);
        }
    }
}

function percentRect(image: any, layout: typeof NOTICE_BADGE_LAYOUT): { x: number; y: number; width: number; height: number } {
    const width = Math.max(1, Math.round((image.bitmap.width * layout.widthPercent) / 100));
    const height = Math.max(1, Math.round((image.bitmap.height * layout.heightPercent) / 100));
    const diameter = Math.min(width, height);
    const centerX = Math.round((image.bitmap.width * layout.xPercent) / 100);
    const centerY = Math.round((image.bitmap.height * layout.yPercent) / 100);
    const x = Math.min(image.bitmap.width - diameter, Math.max(0, Math.round(centerX - diameter / 2)));
    const y = Math.min(image.bitmap.height - diameter, Math.max(0, Math.round(centerY - diameter / 2)));
    return { x, y, width: diameter, height: diameter };
}

async function drawNotificationDigits(image: any, text: string): Promise<void> {
    // const value = "99";
    const value = text.length > 2 ? "99" : text || "0";
    const badge = percentRect(image, NOTICE_BADGE_LAYOUT);
    const badgeImage = await getNoticeBadgeImage(badge.width);
    if (badgeImage) await image.composite(badgeImage, badge.x, badge.y);
    else drawCircleBadge(image, badge.x, badge.y, badge.width, NOTICE_BADGE_LAYOUT.alpha);

    const fitScale = Math.floor(Math.min((badge.height - 6) / 5, (badge.width - 8) / (2 * 3 + 0.5)));
    const scale = Math.max(1, Math.min(NOTICE_BADGE_LAYOUT.digitScale, fitScale));
    const digitWidth = 4 * scale;
    const gap = Math.max(1, Math.round(scale / 2));
    const totalWidth = value.length * digitWidth + (value.length - 1) * gap;
    const startX = badge.x + Math.round((badge.width - totalWidth) / 2);
    const startY = badge.y + Math.round((badge.height - 5 * scale) / 2);
    [...value].forEach((digit, index) => drawDigit(image, digit, startX + index * (digitWidth + gap), startY, scale, 0xffffffff));
}

export async function renderNotificationImage(count: string | number, baseIconPath = ""): Promise<string> {
    const image = await getNoticeBaseIcon(baseIconPath);
    await drawNotificationDigits(image, String(count ?? 0));
    return image.getBase64("image/png");
}

export async function renderShakeFrame(source: Buffer, offsetX: number): Promise<string> {
    const icon = await Jimp.fromBuffer(source);
    icon.resize({ w: 128, h: 128 });
    const canvas = await getNoneBaseImage(128, 128);
    await canvas.composite(icon, offsetX, 0);
    return canvas.getBase64("image/png");
}

export interface VoiceAvatarItem {
    id: string;
    imagePath: string;
    speaking?: boolean;
}

export interface VoiceAvatarRenderOptions {
    width?: number;
    height?: number;
    avatarAreaTop?: number;
    avatarAreaHeight?: number;
    maxVisible?: number;
    showCountBadge?: boolean;
}

function drawFilledCircle(image: any, cx: number, cy: number, r: number, color: number): void {
    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(image.bitmap.width - 1, Math.ceil(cx + r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(image.bitmap.height - 1, Math.ceil(cy + r));
    const rr = r * r;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= rr) image.setPixelColor(color, x, y);
        }
    }
}

function maskCircle(image: any, cx: number, cy: number, r: number): void {
    const rr = r * r;
    for (let y = 0; y < image.bitmap.height; y++) {
        for (let x = 0; x < image.bitmap.width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy > rr) image.setPixelColor(0x00000000, x, y);
        }
    }
}

async function loadCircularAvatar(imagePath: string, size: number): Promise<any> {
    const avatar = await Jimp.read(imagePath);
    avatar.resize({ w: size, h: size });
    maskCircle(avatar, size / 2, size / 2, size / 2);
    return avatar;
}

function getVoiceAvatarLayout(count: number, width: number, areaTop: number, areaHeight: number): Array<{ cx: number; cy: number; r: number }> {
    if (count <= 0) return [];
    const cy = areaTop + areaHeight / 2;
    const r = Math.max(12, Math.min(areaHeight * 0.38, width / (count === 1 ? 3.4 : count + 1.2)));
    if (count === 1) return [{ cx: width / 2, cy, r }];
    const overlap = r * 0.78;
    const totalWidth = r * 2 + overlap * (count - 1);
    const start = (width - totalWidth) / 2 + r;
    return Array.from({ length: count }, (_, index) => ({ cx: start + overlap * index, cy, r }));
}

function drawBadge(image: any, count: number, width: number): void {
    if (count <= 4) return;
    const badgeWidth = Math.max(30, Math.min(42, width * 0.32));
    const badgeHeight = Math.max(20, Math.min(30, width * 0.22));
    const x0 = width - badgeWidth - 8;
    const y0 = 8;
    const radius = badgeHeight / 2;
    drawFilledCircle(image, x0 + radius, y0 + radius, radius, 0x23272ad8);
    drawFilledCircle(image, x0 + badgeWidth - radius, y0 + radius, radius, 0x23272ad8);
    for (let y = y0; y < y0 + badgeHeight; y++) {
        for (let x = x0 + radius; x < x0 + badgeWidth - radius; x++) image.setPixelColor(0x23272ad8, x, y);
    }
    const text = String(88);
    const scale = text.length > 1 ? 3 : 4;
    const digitWidth = 4 * scale;
    const gap = 2;
    const totalTextWidth = text.length * digitWidth + (text.length - 1) * gap;
    const startX = Math.round(x0 + badgeWidth / 2 - totalTextWidth / 2);
    const startY = Math.round(y0 + badgeHeight / 2 - (5 * scale) / 2);
    [...text.slice(0, 2)].forEach((digit, index) => drawDigit(image, digit, startX + index * (digitWidth + gap), startY, scale, 0xffffffff));
}

export async function renderVoiceChannelImage(users: VoiceAvatarItem[], totalCount: number, options: VoiceAvatarRenderOptions = {}): Promise<string> {
    const width = options.width || 128;
    const height = options.height || 128;
    const avatarAreaTop = options.avatarAreaTop ?? 0;
    const avatarAreaHeight = options.avatarAreaHeight ?? height;
    const maxVisible = options.maxVisible || 4;
    const visible = users.slice(0, maxVisible);
    const image = await getNoneBaseImage(width, height);
    const layout = getVoiceAvatarLayout(visible.length, width, avatarAreaTop, avatarAreaHeight);

    for (let index = visible.length - 1; index >= 0; index--) {
        const user = visible[index];
        const item = layout[index];
        if (!item) continue;
        const ringWidth = Math.max(4, Math.round(item.r * 0.14));
        if (user.speaking) drawFilledCircle(image, item.cx, item.cy, item.r + ringWidth, 0x35e55aff);
        const avatarSize = Math.round(item.r * 2);
        const avatar = await loadCircularAvatar(user.imagePath, avatarSize);
        await image.composite(avatar, Math.round(item.cx - item.r), Math.round(item.cy - item.r));
    }

    if (options.showCountBadge !== false) drawBadge(image, totalCount, width);
    return image.getBase64("image/png");
}

export function renderVoiceChannelSvg(users: VoiceAvatarItem[], totalCount: number): string {
    const visible = users.slice(0, 4);
    const layouts = [
        [{ cx: 64, cy: 58, r: 36 }],
        [
            { cx: 48, cy: 58, r: 34 },
            { cx: 80, cy: 58, r: 34 },
        ],
        [
            { cx: 38, cy: 58, r: 31 },
            { cx: 64, cy: 58, r: 31 },
            { cx: 90, cy: 58, r: 31 },
        ],
        [
            { cx: 32, cy: 58, r: 29 },
            { cx: 54, cy: 58, r: 29 },
            { cx: 76, cy: 58, r: 29 },
            { cx: 98, cy: 58, r: 29 },
        ],
    ];
    const layout = layouts[Math.max(visible.length - 1, 0)] || [];
    const defs = visible
        .map((user, index) => {
            const item = layout[index];
            return `<clipPath id="avatarClip${index}"><circle cx="${item.cx}" cy="${item.cy}" r="${item.r}"/></clipPath>`;
        })
        .join("");
    const avatars = visible
        .map((user, index) => {
            const item = layout[index];
            const size = item.r * 2;
            const x = item.cx - item.r;
            const y = item.cy - item.r;
            const ring = user.speaking ? `<circle cx="${item.cx}" cy="${item.cy}" r="${item.r + 4}" fill="none" stroke="#35e55a" stroke-width="8"/>` : "";
            return `${ring}<image x="${x}" y="${y}" width="${size}" height="${size}" clip-path="url(#avatarClip${index})" href="${escapeXml(user.imagePath)}" xlink:href="${escapeXml(user.imagePath)}"/>`;
        })
        .join("");
    const badge =
        totalCount > 4
            ? `<g><rect x="84" y="10" width="36" height="26" rx="13" fill="rgba(35,39,42,0.78)"/><text x="102" y="29" text-anchor="middle" font-size="18" font-family="Arial" font-weight="700" fill="#ffffff">${totalCount}</text></g>`
            : "";
    const svg = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs>${defs}</defs>${avatars}${badge}</svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
