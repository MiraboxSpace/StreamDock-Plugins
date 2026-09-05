import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { log } from "@mirabox/streamdock-sdk/node";

const PROFILE_ROOT = path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Roaming"), "HotSpot", "StreamDock", "profiles");
const IMAGE_EXTENSIONS = ["", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".mbg"];

interface ProfileActionState {
    Image?: string;
}

interface ProfileAction {
    ActionID?: string;
    State?: number;
    States?: ProfileActionState[];
    UUID?: string;
}

interface ProfileManifest {
    Actions?: Record<string, ProfileAction>;
}

export interface ActionManifestRef {
    manifestPath: string;
    key: string;
    context: string;
    action: string;
    state: number;
}

function normalizeActionId(value: string): string {
    return value.replace(/-/g, "").toLowerCase();
}

async function getManifestPaths(dir: string, result: string[] = []): Promise<string[]> {
    let entries: fs.Dirent[];
    try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
        return result;
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await getManifestPaths(fullPath, result);
        } else if (entry.isFile() && entry.name === "manifest.json") {
            result.push(fullPath);
        }
    }
    return result;
}

async function readManifest(filePath: string): Promise<ProfileManifest | null> {
    try {
        return JSON.parse(await fsp.readFile(filePath, "utf8")) as ProfileManifest;
    } catch (error) {
        log.error("read profile manifest failed", { filePath, error });
        return null;
    }
}

async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fsp.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function resolveImagePath(manifestPath: string, image: string): Promise<string> {
    if (!image) return "";
    const manifestDir = path.dirname(manifestPath);
    const rawCandidates = path.isAbsolute(image) ? [image] : [path.join(manifestDir, image), path.join(manifestDir, "Images", image)];
    const candidates = rawCandidates.flatMap((candidate) => (path.extname(candidate) ? [candidate] : IMAGE_EXTENSIONS.map((ext) => `${candidate}${ext}`)));
    for (const candidate of candidates) {
        if (await pathExists(candidate)) return candidate;
    }
    return "";
}

async function getActionStateImage(ref: ActionManifestRef): Promise<string> {
    const action = (await readManifest(ref.manifestPath))?.Actions?.[ref.key];
    if (!action?.ActionID || normalizeActionId(action.ActionID) !== ref.context) return "";
    if (action.UUID && ref.action && action.UUID !== ref.action) return "";

    const image = action.States?.[ref.state]?.Image || action.States?.[Number(action.State ?? 0)]?.Image || action.States?.[0]?.Image || "";
    return resolveImagePath(ref.manifestPath, image);
}

export function isActionManifestRef(value: unknown): value is ActionManifestRef {
    const ref = value as Partial<ActionManifestRef> | null;
    return Boolean(ref && typeof ref.manifestPath === "string" && typeof ref.key === "string" && typeof ref.context === "string" && typeof ref.action === "string" && typeof ref.state === "number");
}

export function manifestRefMatches(data: StreamDockEvents.WillAppear, ref: ActionManifestRef | null): boolean {
    const coordinates = data.payload?.coordinates;
    if (!coordinates || !data.context || !ref) return false;
    const key = `${coordinates.column},${coordinates.row}`;
    return ref.key === key && ref.context === normalizeActionId(data.context) && ref.action === (data.action || "") && ref.state === Number(data.payload?.state ?? 0);
}

export async function findActionManifestAsync(data: StreamDockEvents.WillAppear): Promise<ActionManifestRef | null> {
    const coordinates = data.payload?.coordinates;
    if (!coordinates || !data.context) return null;

    const key = `${coordinates.column},${coordinates.row}`;
    const context = normalizeActionId(data.context);
    const state = Number(data.payload?.state ?? 0);
    const actionId = data.action || "";

    for (const manifestPath of await getManifestPaths(PROFILE_ROOT)) {
        const action = (await readManifest(manifestPath))?.Actions?.[key];
        if (!action?.ActionID || normalizeActionId(action.ActionID) !== context) continue;
        if (action.UUID && actionId && action.UUID !== actionId) continue;

        return { manifestPath, key, context, action: actionId, state };
    }

    return null;
}

export async function readActionStateImageAsync(ref: ActionManifestRef | null): Promise<string> {
    return ref ? getActionStateImage(ref) : "";
}
