const log = require("./utils/plugin").log;
const apiWrapper = require("./apiWrapper");
class Cache {
    constructor() {
        this.cache = new Map();
    }

    set(key, value, ttlMs) {
        const expiry = ttlMs ? Date.now() + ttlMs : null;
        this.cache.set(key, { value, expiry });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (item.expiry && Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    invalidate(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }
}

const cache = new Cache();
async function getAllPlaylists(spotifyApi) {
    let playlists = [];
    let offset = 0;
    const limit = 40;
    while (true) {
        try {
            let res;
            res = await apiWrapper.withRetry(() => spotifyApi.getUserPlaylists({ limit, offset }));
            const items = res && res.body && res.body.items ? res.body.items : [];
            playlists = playlists.concat(items);
            if (!res || !res.body || !res.body.next) break;
            offset += limit;
        } catch {
            return { body: { items: playlists } };
        }
    }
    return { body: { items: playlists } };
}
async function getCachedMe(spotifyApi) {
    const cacheKey = "user:me";
    const cached = cache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const result = await apiWrapper.withRetry(() => spotifyApi.getMe());
    cache.set(cacheKey, result, 20 * 60 * 1000);
    return result;
}

async function getCachedDevices(spotifyApi) {
    const cacheKey = "user:devices";
    const cached = cache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const result = await apiWrapper.withRetry(() => spotifyApi.getMyDevices());
    cache.set(cacheKey, result, 30 * 1000);
    return result;
}

async function getCachedPlaylists(spotifyApi) {
    const cacheKey = "user:playlists";
    const cached = cache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const result = await getAllPlaylists(spotifyApi);
    cache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
}
async function getCachedPlaylist(spotifyApi, playlist_id) {
    const cacheKey = "user:playlist";
    const cached = cache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const result = await apiWrapper.withRetry(() => spotifyApi.getPlaylist(playlist_id));
    cache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
}
async function getCachedMyCurrentPlaybackState(spotifyApi) {
    const cacheKey = "user:playbackstate";
    const cached = cache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const result = await apiWrapper.withRetry(() => spotifyApi.getMyCurrentPlaybackState());
    cache.set(cacheKey, result, 4 * 1000);
    return result;
}

async function getCachedImage(imageUrl, fetchFn) {
    if (!imageUrl) return null;

    const cacheKey = `image:${imageUrl}`;
    const cached = cache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const response = await apiWrapper.withRetry(() => fetchFn(imageUrl));
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    cache.set(cacheKey, buffer, 60 * 60 * 1000);
    return buffer;
}

function invalidateCache(key) {
    cache.invalidate(key);
}

function invalidatePlaybackStateCache() {
    cache.invalidate("user:playbackstate");
}

function clearAllCache() {
    cache.clear();
}

module.exports = {
    getCachedMe,
    getCachedDevices,
    getCachedPlaylists,
    getCachedPlaylist,
    getCachedImage,
    invalidateCache,
    invalidatePlaybackStateCache,
    clearAllCache,
    getCachedMyCurrentPlaybackState,
};
