const { Plugins, Actions, log } = require("./utils/plugin");
const { execSync } = require("child_process");
const { Jimp } = require("jimp");
const SpotifyWebApi = require("spotify-web-api-node");
const plugin = new Plugins("spotify");

const cache = require("./cache");
const apiWrapper = require("./apiWrapper");
let ImageBuffer = null;
let lastImageUrl = "";
let currentQPM = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const updateImageBuffer = async (imageUrl) => {
    if (lastImageUrl === imageUrl) return;
    lastImageUrl = imageUrl;
    if (imageUrl) {
        log.info("获取新的封面图片");
        ImageBuffer = await cache.getCachedImage(imageUrl, fetch);
    }
};
const stateManager = {
    hasToken: false,
    isPremium: false,
    get isReady() {
        return this.hasToken;
    },

    events: new Map(),
    contexts: new Set(),
    playbackState: null,
    lastPlaybackState: null,
    lastLikeState: null,
    isLiked: false,
    volume: {
        current: 0,
        target: null,
        debounceTimer: null,
        debounceDelay: 500,
        protectionWindow: 3000,
        setTargetVolume(volume, skipDebounce = false) {
            this.target = Math.max(0, Math.min(100, volume));
            stateManager.emit("volume:changed", {});
            if (skipDebounce) {
                stateManager._applyVolume();
            } else {
                stateManager._scheduleVolumeUpdate();
            }
        },

        adjustVolume(delta, skipDebounce = false) {
            const baseVolume = this.target ?? this.current ?? 0;
            const newVolume = Math.max(0, Math.min(100, baseVolume + delta));
            this.setTargetVolume(newVolume, skipDebounce);
        },
    },

    setTargetVolume(volume, skipDebounce = false) {
        this.volume.setTargetVolume(volume, skipDebounce);
    },

    adjustVolume(delta, skipDebounce = false) {
        this.volume.adjustVolume(delta, skipDebounce);
    },

    _scheduleVolumeUpdate() {
        if (this.volume.debounceTimer) {
            clearTimeout(this.volume.debounceTimer);
        }
        this.volume.debounceTimer = setTimeout(async () => {
            await this._applyVolume();
        }, this.volume.debounceDelay);
    },

    async _applyVolume() {
        if (this.volume.target === null) return;
        try {
            await apiWrapper.withRetry(() => spotifyApi.setVolume(this.volume.target));
        } catch (error) {
            log.error("设置音量失败:", error);
        }
    },

    getDisplayVolume() {
        return this.volume.target ?? this.volume.current ?? 0;
    },
    on(eventType, listener, context) {
        if (!this.events.has(eventType)) {
            this.events.set(eventType, new Map());
        }
        const listeners = this.events.get(eventType);
        if (!listeners.has(context)) {
            listeners.set(context, new Set());
        }
        listeners.get(context).add(listener);
    },
    off(eventType, listener, context) {
        const listeners = this.events.get(eventType);
        if (listeners && listeners.has(context)) {
            listeners.get(context).delete(listener);
            if (listeners.get(context).size === 0) {
                listeners.delete(context);
            }
        }
    },
    offContext(context) {
        for (const [eventType, listeners] of this.events) {
            listeners.delete(context);
        }
    },
    register(context) {
        this.contexts.add(context);
    },
    unregister(context) {
        this.contexts.delete(context);
    },
    getAllContexts() {
        return Array.from(this.contexts);
    },
    emit(eventType, data) {
        const listeners = this.events.get(eventType);
        if (listeners) {
            for (const [context, contextListeners] of listeners) {
                for (const listener of contextListeners) {
                    try {
                        listener(data, context);
                    } catch (error) {
                        log.error(`事件 ${eventType} 处理失败:`, error);
                    }
                }
            }
        }
    },
    detectChanges(newState) {
        if (!this.lastPlaybackState) {
            this.lastPlaybackState = newState;
            this.volume.current = newState.body?.device?.volume_percent || 0;
            const { is_playing, item, progress_ms } = newState.body;
            if (item) {
                updateImageBuffer(item.album.images[0]?.url);
            }
            this.emit("shuffle:changed", { state: newState.body?.shuffle_state });
            this.emit("repeat:changed", { state: newState.body?.repeat_state });
            this.emit("track:changed", {
                item: newState.body?.item,
                imageUrl: newState.body?.item?.album?.images?.[0]?.url,
            });
            async () => {
                const checkSaved = await apiWrapper.withRetry(() => spotifyApi.containsMySavedTracks([`spotify:track:${newState.body?.item?.id}`]));
                this.isLiked = checkSaved.body[0];
                this.emit("like:changed", { isLiked: this.isLiked, trackId: newState.body?.item?.id });
            };
            this.emit("volume:changed", { volume: newState.body?.device?.volume_percent });
            this.emit("playback:state", { isPlaying: newState.body?.is_playing });
            return;
        }

        const oldState = this.lastPlaybackState;

        if (oldState.body?.is_playing !== newState.body?.is_playing) {
            this.emit("playback:state", { isPlaying: newState.body?.is_playing });
        }

        const oldProgress = oldState.body?.progress_ms ?? 0;
        const newProgress = newState.body?.progress_ms ?? 0;
        if (Math.abs(newProgress - oldProgress) > 100) {
            this.emit("progress:changed", {
                progress_ms: newProgress,
                is_playing: newState.body?.is_playing,
                item: newState.body?.item,
            });
        }

        const oldVolume = oldState.body?.device?.volume_percent;
        const newVolume = newState.body?.device?.volume_percent || 0;
        if (oldVolume !== newVolume && newVolume !== undefined) {
            if (this.volume.target == newVolume) {
                this.volume.target = null;
            }
            this.volume.current = newVolume;
            this.emit("volume:changed", {});
        }

        const oldTrack = oldState.body?.item?.id;
        const newTrack = newState.body?.item?.id;
        if (oldTrack !== newTrack) {
            const { is_playing, item, progress_ms } = newState.body;
            if (item) {
                updateImageBuffer(item.album.images[0]?.url);
            }
            this.emit("track:changed", {
                item: newState.body?.item,
                imageUrl: newState.body?.item?.album?.images?.[0]?.url,
            });
            async () => {
                const checkSaved = await apiWrapper.withRetry(() => spotifyApi.containsMySavedTracks([`spotify:track:${newState.body?.item?.id}`]));
                this.isLiked = checkSaved.body[0];
                this.emit("like:changed", { isLiked: this.isLiked, trackId: newState.body?.item?.id });
            };
        }

        if (oldState.body?.repeat_state !== newState.body?.repeat_state) {
            this.emit("repeat:changed", { state: newState.body?.repeat_state });
        }

        if (oldState.body?.shuffle_state !== newState.body?.shuffle_state) {
            this.emit("shuffle:changed", { state: newState.body?.shuffle_state });
        }

        this.lastPlaybackState = newState;
    },
    async updatePlaybackState() {
        if (!this.hasToken) return;

        try {
            await this.requireReady();
            const playbackState = await cache.getCachedMyCurrentPlaybackState(spotifyApi);
            this.playbackState = playbackState;

            const trackId = playbackState.body?.item?.id;
            // if (trackId) {
            //     const checkSaved = await apiWrapper.withRetry(() => spotifyApi.containsMySavedTracks([`spotify:track:${trackId}`]));
            //     this.isLiked = checkSaved.body[0];

            //     if (this.lastLikeState !== this.isLiked) {
            //         this.emit("like:changed", { isLiked: this.isLiked, trackId });
            //         this.lastLikeState = this.isLiked;
            //     }
            // } else {
            //     this.lastLikeState = null;
            // }
            this.detectChanges(playbackState);
            return playbackState;
        } catch (error) {
            return null;
        }
    },
    async check() {
        try {
            if (this.hasToken) {
                const me = await cache.getCachedMe(spotifyApi);
                this.isPremium = me.body?.product === "premium";
            } else {
                this.isPremium = true;
            }
            return this.isReady;
        } catch (error) {
            return false;
        }
    },

    async requireReady(context) {
        await this.check();
        if (!this.hasToken) {
            if (context) {
                plugin.setTitle(context, "No Token");
                plugin.showAlert(context);
            }
            log.info(`未准备就绪: hasToken=${this.hasToken}, isPremium=${this.isPremium}`);
            return false;
        }
        if (!this.isPremium) {
            if (context) {
                plugin.setTitle(context, "No Premium");
            }
        }
        return true;
    },
};
function extractSpotifyUri(url) {
    const parsedUrl = new URL(url);
    const [type, id] = parsedUrl.pathname.split("/").filter(Boolean);
    if (type && id) {
        return `spotify:${type}:${id}`;
    }
    return null;
}
stateManager.updatePlaybackStateInterval = setInterval(async () => {
    await stateManager.updatePlaybackState();
}, 10000);

function createSpotifyApiWithLogger(options, config = {}) {
    const excludeMethods = ["setClientSecret", "setClientId", "setRefreshToken", "setAccessToken", "getAccessToken"];
    const windowSizeMs = 60 * 1000;
    const api = new SpotifyWebApi(options);
    const requestTimestamps = [];
    function recordAndCalculateQPM() {
        const now = Date.now();
        requestTimestamps.push(now);
        const cutoff = now - windowSizeMs;
        while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
            requestTimestamps.shift();
        }
        const currentCount = requestTimestamps.length;
        const qpm = (currentCount * 60000) / windowSizeMs;
        return Math.round(qpm);
    }
    return new Proxy(api, {
        get(target, prop, receiver) {
            const original = Reflect.get(target, prop, receiver);
            if (typeof original !== "function") {
                return original;
            }
            const methodName = String(prop);
            if (methodName.startsWith("_") || excludeMethods.includes(methodName)) {
                return original;
            }
            return function (...args) {
                currentQPM = recordAndCalculateQPM();
                log.info(`[SpotifyApi] ${methodName} | Current avg QPM: ${currentQPM}`);
                return original.apply(this, args);
            };
        },
    });
}
const spotifyApi = createSpotifyApiWithLogger({
    redirectUri: "http://127.0.0.1:26433",
    timeout: 5000,
});

apiWrapper.register429Callback((retryAfter) => {
    const contexts = stateManager.getAllContexts();
    let text = `RetryAfter\n${retryAfter}s`;
    if (retryAfter == 0) {
        text = "";
    }
    for (const context of contexts) {
        plugin.setTitle(context, text);
    }
    log.warn(`遇到429限流，${retryAfter}秒后可重试`);
});

const getLoopText = (text) => {
    return text.slice(1) + text.slice(0, 1);
};

const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const secondsToHHMM = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

const formatSongText = (item, titleFormat) => {
    switch (titleFormat) {
        case "title":
            return item.name + " ";
        case "artist":
            return item.artists[0].name + " ";
        case "artist-title":
            return `${item.artists[0].name}-${item.name} `;
        case "title-artist":
        default:
            return `${item.name}-${item.artists[0].name} `;
    }
};

const createSvg = async (buffer, text, isPlaying, duration) => {
    let image = await Jimp.fromBuffer(buffer);
    image.resize({ w: 144 });
    let a = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    let temp = `
  <svg width="144" height="144" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
          <filter id="brightness">
              <feComponentTransfer>
                  <feFuncR type="linear" slope="${isPlaying ? "1" : "0.5"}"/>
                  <feFuncG type="linear" slope="${isPlaying ? "1" : "0.5"}"/>
                  <feFuncB type="linear" slope="${isPlaying ? "1" : "0.5"}"/>
              </feComponentTransfer>
          </filter>
          <filter id="textShadow">
              <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="black" flood-opacity="1"/>
          </filter>
      </defs>
      <image xlink:href="${await image.getBase64("image/jpeg", { quality: 70 })}" width="144" height="144" filter="url(#brightness)"/>
      <text x="72" y="44" font-family="Arial" font-weight="bold" font-size="36" fill="white" text-anchor="middle"
          stroke="black" stroke-width="2" paint-order="stroke" filter="url(#textShadow)">
          ${a}
      </text>
      <text x="72" y="130" font-family="Arial" font-weight="bold" font-size="40" fill="white" text-anchor="middle"
          stroke="black" stroke-width="2" paint-order="stroke" filter="url(#textShadow)">
          ${formatTime(duration)}
      </text>
  </svg>`;
    return temp;
};
const updateVolumeTitle = (context, show) => {
    const data = stateManager.volume;
    plugin.setState(context, data.current === 0 ? 1 : 0);
    if (show) {
        if (data.target != null) {
            plugin.setTitle(context, `${data.current}\n${data.target}`);
        } else {
            plugin.setTitle(context, `${data.current}`);
        }
    } else {
        plugin.setTitle(context, "");
    }
};
// playpause
plugin.playpause = new Actions({
    default: {},
    progressInterval: {},
    lastProgressTime: {},
    lastProgressMs: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        const updateLocalProgress = () => {
            try {
                const playbackState = stateManager.playbackState;
                if (!playbackState?.body) return;
                const { item, is_playing } = playbackState.body;
                if (!item || !is_playing) return;
                const now = Date.now();
                const timeSinceLastUpdate = now - (this.lastProgressTime[context] || now);
                this.lastProgressTime[context] = now;
                this.lastProgressMs[context] = (this.lastProgressMs[context] ?? 0) + timeSinceLastUpdate;
                if (this.data[context]?.text == undefined || this.data[context].id != item.id) {
                    let text = "";
                    switch (this.data[context].titleFormat) {
                        case "title":
                            text = item.name + " ";
                            break;
                        case "artist":
                            text = item.artists[0].name + " ";
                            break;
                        case "artist-title":
                            text = `${item.artists[0].name}-${item.name}` + " ";
                            break;
                        case "title-artist":
                        default:
                            text = `${item.name}-${item.artists[0].name}` + " ";
                            break;
                    }
                    this.data[context].text = this.data[context].showTitle ? text : "";
                } else {
                    this.data[context].text = this.data[context].showTitle ? getLoopText(this.data[context].text) : "";
                }
                this.data[context].id = item.id;
                const remaining_ms = item.duration_ms - this.lastProgressMs[context];
                const displayTime = this.data[context].timeDisplay == "elapsed" ? this.lastProgressMs[context] : remaining_ms;
                if (!ImageBuffer) {
                    return;
                }
                const svg = createSvg(ImageBuffer, this.data[context].text, is_playing, displayTime);
                svg.then((svg) => {
                    plugin.setImage(context, `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`);
                });
            } catch (error) {
                log.error("playpause updateLocalProgress:", error);
            }
        };
        const startLocalProgress = () => {
            if (this.progressInterval[context] == null) {
                this.progressInterval[context] = setInterval(updateLocalProgress, 1000);
            }
        };

        const stopLocalProgress = () => {
            if (this.progressInterval[context]) {
                clearInterval(this.progressInterval[context]);
                delete this.progressInterval[context];
            }
        };

        const checkPlayingState = () => {
            const playbackState = stateManager.playbackState;
            const isPlaying = playbackState?.body?.is_playing ?? false;
            if (isPlaying) {
                startLocalProgress();
            } else {
                stopLocalProgress();
            }
        };
        stateManager.register(context);
        stateManager.on(
            "progress:changed",
            (data) => {
                if (data.item) {
                    this.lastProgressTime[context] = Date.now();
                    this.lastProgressMs[context] = data.progress_ms;
                }
                if (data.is_playing !== undefined) {
                    checkPlayingState();
                }
            },
            context,
        );
        stateManager.on(
            "playback:state",
            (data) => {
                this.lastProgressTime[context] = Date.now();
                checkPlayingState();
            },
            context,
        );
    },
    _willDisappear({ context }) {
        stateManager.unregister(context);
        stateManager.offContext(context);
        if (this.progressInterval[context]) {
            clearInterval(this.progressInterval[context]);
            delete this.progressInterval[context];
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const devices = await cache.getCachedDevices(spotifyApi);
            if (devices.body.devices) {
                plugin.sendToPropertyInspector({
                    devices: devices.body.devices,
                });
            }
        } catch (error) {
            log.error("获取设备列表失败:", error);
        }
    },
    sendToPlugin({ payload, context }) {
        // 处理设备选择
        if (payload.type === "device_selected") {
            this.data[context].device_id = payload.device_id;
        }
    },
    async keyUp({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;

            const data = stateManager.playbackState;
            if (data.body && data.body.is_playing) {
                await apiWrapper.withRetry(() => spotifyApi.pause());
                plugin.showOk(context);
            } else {
                if (this.data[context].device_id) {
                    await apiWrapper.withRetry(() => spotifyApi.transferMyPlayback([this.data[context].device_id]));
                }
                await apiWrapper.withRetry(() => spotifyApi.play());
                plugin.showOk(context);
            }
        } catch (error) {
            log.error("控制播放失败:", error);
            plugin.showAlert(context);
        }
    },
});

// 上一曲
plugin.previous = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
    },
    async keyUp({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;

            await apiWrapper.withRetry(() => spotifyApi.skipToPrevious());
            plugin.showOk(context);
        } catch (error) {
            log.error("静音操作失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {},
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
    },
});

// 下一曲
plugin.next = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
    },
    async keyUp({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;

            await apiWrapper.withRetry(() => spotifyApi.skipToNext());
            plugin.showOk(context);
        } catch (error) {
            log.error("切换下一曲失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {},
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
    },
});

// 切换播放设备
plugin.changedevice = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
    },
    async keyUp({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;

            if (this.data[context].device_id) {
                await apiWrapper.withRetry(() => spotifyApi.transferMyPlayback([this.data[context].device_id]));
                plugin.showOk(context);
            } else {
                plugin.showAlert(context);
            }
        } catch (error) {
            log.error("切换设备失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const devices = await cache.getCachedDevices(spotifyApi);
            if (devices.body.devices) {
                plugin.sendToPropertyInspector({
                    devices: devices.body.devices,
                });
            }
        } catch (error) {
            log.error("获取设备列表失败:", error);
        }
    },
    async sendToPlugin({ payload, context }) {
        if (payload.type === "refresh") {
            this._propertyInspectorDidAppear({ context });
        }
    },
    _willDisappear({ context }) {
        stateManager.unregister(context);
    },
});

// 设置喜欢
plugin.likesong = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        const checkSaved = await apiWrapper.withRetry(() => spotifyApi.containsMySavedTracks([`spotify:track:${stateManager.playbackState?.body?.item?.id}`]));
        let isLiked = false;
        if (checkSaved) isLiked = checkSaved.body[0];
        stateManager.on(
            "like:changed",
            (data) => {
                plugin.setState(context, stateManager.isLiked ? 1 : 0);
            },
            context,
        );

        stateManager.on(
            "track:changed",
            () => {
                plugin.setState(context, stateManager.isLiked ? 1 : 0);
            },
            context,
        );
        plugin.setState(context, isLiked ? 1 : 0);
    },
    async keyUp({ context, payload }) {
        try {
            const playbackState = stateManager.playbackState;
            if (!playbackState.body || !playbackState.body.item) {
                log.warn("没有正在播放的歌曲");
                plugin.showAlert(context);
                return;
            }

            const trackId = playbackState.body.item.id;
            const checkSaved = await apiWrapper.withRetry(() => spotifyApi.containsMySavedTracks([`spotify:track:${trackId}`]));
            const isLiked = checkSaved.body[0];

            if (isLiked) {
                await apiWrapper.withRetry(() => spotifyApi.removeFromMySavedTracks([`spotify:track:${trackId}`]));
                plugin.setState(context, 0);
            } else {
                await apiWrapper.withRetry(() => spotifyApi.addToMySavedTracks([`spotify:track:${trackId}`]));
                plugin.setState(context, 1);
            }
            plugin.showOk(context);
        } catch (error) {
            log.error("设置喜欢失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {},
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
        stateManager.offContext(context);
    },
});

// 播放指定链接歌曲
plugin.playuri = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
    },
    async keyUp({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) {
                await sleep(1000);
                if (!(await stateManager.requireReady(context))) return;
            }

            if (!this.data[context].uri) {
                log.warn("未设置歌曲链接");
                plugin.showAlert(context);
                return;
            }
            let temp_uri = "";
            if (this.data[context].uri.startsWith("http")) {
                temp_uri = extractSpotifyUri(this.data[context].uri);
            } else {
                temp_uri = this.data[context].uri;
            }

            const spotifyUriRegex = /^spotify:(track|playlist):[a-zA-Z0-9]{22}(#\d{1,2}:\d{2})?$/;
            if (!spotifyUriRegex.test(temp_uri)) {
                log.warn("可能无效的Spotify URI格式");
            }

            const timeMatch = temp_uri.match(/#(\d{1,2}):(\d{2})$/);
            let position_ms = 0;
            let uri = temp_uri;
            if (timeMatch) {
                const minutes = parseInt(timeMatch[1]);
                const seconds = parseInt(timeMatch[2]);
                position_ms = (minutes * 60 + seconds) * 1000;
                uri = temp_uri.replace(/#.*$/, "");
            }

            if (this.data[context].device_id) {
                await apiWrapper.withRetry(() => spotifyApi.transferMyPlayback([this.data[context].device_id]));
            }

            if (this.data[context].playOption == "play") {
                if (uri.includes("playlist")) {
                    await apiWrapper.withRetry(() =>
                        spotifyApi.play({
                            context_uri: uri,
                        }),
                    );
                } else {
                    await apiWrapper.withRetry(() =>
                        spotifyApi.play({
                            uris: [`${uri}`],
                            position_ms: position_ms,
                        }),
                    );
                }
            } else {
                await apiWrapper.withRetry(() => spotifyApi.addToQueue(uri));
            }
            plugin.showOk(context);
            log.info("开始播放歌曲:");
        } catch (error) {
            log.error("播放歌曲失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const devices = await cache.getCachedDevices(spotifyApi);
            if (devices.body.devices) {
                plugin.sendToPropertyInspector({
                    devices: devices.body.devices,
                });
            }
        } catch (error) {
            log.error("获取设备列表失败:", error);
        }
    },
    async sendToPlugin({ payload, context }) {
        if (payload.type === "refresh") {
            this._propertyInspectorDidAppear({ context });
        }
    },
    _willDisappear({ context }) {
        stateManager.unregister(context);
    },
});

// 播放指定播放列表
plugin.playplaylist = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        this._didReceiveSettings({ context, payload });
    },
    async keyUp({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;

            if (this.data[context].device_id) {
                await apiWrapper.withRetry(() => spotifyApi.transferMyPlayback([this.data[context].device_id]));
            }

            await apiWrapper.withRetry(() =>
                spotifyApi.play({
                    context_uri: this.data[context].uri,
                }),
            );

            plugin.showOk(context);
        } catch (error) {
            log.error("播放播放列表失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            if (!(await stateManager.requireReady(context))) {
                await sleep(1000);
                if (!(await stateManager.requireReady(context))) return;
            }
            const devices = await cache.getCachedDevices(spotifyApi);
            const playlists = await cache.getCachedPlaylists(spotifyApi);
            const data = {};

            if (devices.body.devices) {
                data.devices = devices.body.devices;
            }
            if (playlists.body.items) {
                data.playlists = playlists.body.items.map((playlist) => ({
                    id: playlist.id,
                    name: playlist.name,
                    uri: playlist.uri,
                }));
            }

            plugin.sendToPropertyInspector(data);
        } catch (error) {
            log.error("获取播放列表失败:", error);
        }
    },
    async sendToPlugin({ payload, context }) {
        if (payload.type === "refresh") {
            this._propertyInspectorDidAppear({ context });
        }
    },
    async _didReceiveSettings({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) {
                await sleep(1000);
                if (!(await stateManager.requireReady(context))) return;
            }
            if (payload.settings.showCover && payload.settings.uri) {
                const playlistId = payload.settings.uri.split(":").pop();
                const playlist = await cache.getCachedPlaylist(spotifyApi, playlistId);

                if (playlist.body.images && playlist.body.images.length > 0) {
                    const imageUrl = playlist.body.images[0].url;
                    const buffer = await cache.getCachedImage(imageUrl, fetch);
                    plugin.setImage(context, `data:image/jpeg;base64,${buffer.toString("base64")}`);
                }
            } else if (payload.settings.showCover == false) {
                plugin.setImage(context, "");
            }
        } catch (error) {
            if (error.code === "ECONNRESET") {
                this._didReceiveSettings({ context, payload });
            } else {
                log.error("获取播放列表封面失败:", error);
            }
        }
    },
    _willDisappear({ context }) {
        stateManager.unregister(context);
    },
});

// 移除播放列表歌曲
plugin.removeplaylistsong = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        this._didReceiveSettings({ context, payload });
    },
    async keyUp({ context, payload }) {
        try {
            const playbackState = stateManager.playbackState;
            if (!playbackState.body || !playbackState.body.item) {
                log.warn("没有正在播放的歌曲");
                plugin.showAlert(context);
                return;
            }

            if (!this.data[context].playlist_id) {
                log.warn("未设置目标播放列表");
                plugin.showAlert(context);
                return;
            }

            const trackUri = playbackState.body.item.uri;

            await apiWrapper.withRetry(() => spotifyApi.removeTracksFromPlaylist(this.data[context].playlist_id, [{ uri: trackUri }]));

            if (playbackState.body.is_playing) {
                await apiWrapper.withRetry(() => spotifyApi.skipToNext());
            }

            plugin.showOk(context);
        } catch (error) {
            log.error("移除歌曲失败:", error);
            plugin.showAlert(context);
        }
    },
    async _didReceiveSettings({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) {
                await sleep(1000);
                if (!(await stateManager.requireReady(context))) return;
            }
            if (payload.settings.showCover && payload.settings.playlist_id) {
                const playlist = await cache.getCachedPlaylist(spotifyApi, payload.settings.playlist_id);

                if (playlist.body.images && playlist.body.images.length > 0) {
                    const imageUrl = playlist.body.images[0].url;
                    const buffer = await cache.getCachedImage(imageUrl, fetch);
                    plugin.setImage(context, `data:image/jpeg;base64,${buffer.toString("base64")}`);
                }
            } else if (payload.settings.showCover == false) {
                plugin.setImage(context, "");
            }
        } catch (error) {
            if (error.code === "ECONNRESET") {
                this._didReceiveSettings({ context, payload });
            } else {
                log.error("获取播放列表封面失败:", error);
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const playlists = await cache.getCachedPlaylists(spotifyApi);
            const data = {};
            if (playlists.body.items) {
                data.playlists = playlists.body.items.map((playlist) => ({
                    id: playlist.id,
                    name: playlist.name,
                    uri: playlist.uri,
                }));
                plugin.sendToPropertyInspector(data);
            }
        } catch (error) {
            log.error("获取播放列表失败:", error);
        }
    },
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
    },
});

// 添加到播放列表
plugin.addtoplaylist = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        this._didReceiveSettings({ context, payload });
    },
    async keyUp({ context, payload }) {
        try {
            const playbackState = stateManager.playbackState;
            if (!playbackState.body || !playbackState.body.item) {
                log.warn("没有正在播放的歌曲");
                plugin.showAlert(context);
                return;
            }

            if (!this.data[context].playlist_id) {
                log.warn("未设置目标播放列表");
                plugin.showAlert(context);
                return;
            }

            const trackUri = playbackState.body.item.uri;

            await apiWrapper.withRetry(() => spotifyApi.addTracksToPlaylist(this.data[context].playlist_id, [trackUri]));

            plugin.showOk(context);
        } catch (error) {
            log.error("添加歌曲失败:", error);
            plugin.showAlert(context);
        }
    },
    async _didReceiveSettings({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) {
                await sleep(1000);
                if (!(await stateManager.requireReady(context))) return;
            }
            if (payload.settings.showCover && payload.settings.playlist_id) {
                const playlist = await cache.getCachedPlaylist(spotifyApi, payload.settings.playlist_id);
                if (playlist.body.images && playlist.body.images.length > 0) {
                    const imageUrl = playlist.body.images[0].url;
                    const buffer = await cache.getCachedImage(imageUrl, fetch);
                    plugin.setImage(context, `data:image/jpeg;base64,${buffer.toString("base64")}`);
                }
            } else if (payload.settings.showCover == false) {
                plugin.setImage(context, "");
            }
        } catch (error) {
            if (error.code === "ECONNRESET") {
                this._didReceiveSettings({ context, payload });
            } else {
                log.error("获取播放列表封面失败:", error);
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const playlists = await cache.getCachedPlaylists(spotifyApi);
            const data = {};
            if (playlists.body.items) {
                data.playlists = playlists.body.items.map((playlist) => ({
                    id: playlist.id,
                    name: playlist.name,
                    uri: playlist.uri,
                }));
                plugin.sendToPropertyInspector(data);
            }
        } catch (error) {
            log.error("获取播放列表失败:", error);
        }
    },
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
    },
});

// 循环播放模式
plugin.repeat = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        stateManager.on(
            "repeat:changed",
            (data) => {
                this.updateRepeatState(context);
            },
            context,
        );

        await this.updateRepeatState(context);
    },
    async keyUp({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;

            const playbackState = stateManager.playbackState;
            if (!playbackState.body) {
                log.warn("无法获取播放状态");
                plugin.showAlert(context);
                return;
            }

            const currentState = playbackState.body.repeat_state;
            let nextState;
            switch (currentState) {
                case "off":
                    nextState = "context";
                    break;
                case "context":
                    nextState = "track";
                    break;
                case "track":
                    nextState = "off";
                    break;
                default:
                    nextState = "off";
            }

            await apiWrapper.withRetry(() => spotifyApi.setRepeat(nextState));

            switch (nextState) {
                case "off":
                    plugin.setState(context, 0);
                    break;
                case "context":
                    plugin.setState(context, 1);
                    break;
                case "track":
                    plugin.setState(context, 2);
                    break;
            }

            plugin.showOk(context);
        } catch (error) {
            plugin.showAlert(context);
            log.error("设置循环模式失败:", error);
        }
    },
    async updateRepeatState(context) {
        try {
            const playbackState = stateManager.playbackState;
            if (playbackState && playbackState.body) {
                switch (playbackState.body.repeat_state) {
                    case "off":
                        plugin.setState(context, 0);
                        break;
                    case "context":
                        plugin.setState(context, 1);
                        break;
                    case "track":
                        plugin.setState(context, 2);
                        break;
                }
            }
        } catch (error) {
            log.error("获取循环状态失败:", error);
        }
    },
    async _propertyInspectorDidAppear({ context }) {},
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
        stateManager.offContext(context);
    },
});

// 随机模式
plugin.shuffle = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        stateManager.on(
            "shuffle:changed",
            (data) => {
                plugin.setState(context, data.state ? 1 : 0);
            },
            context,
        );

        await this.updateShuffleState(context);
    },
    async keyUp({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;

            const playbackState = stateManager.playbackState;
            if (!playbackState.body) {
                log.warn("无法获取播放状态");
                plugin.showAlert(context);
                return;
            }

            const currentState = playbackState.body.shuffle_state;
            await apiWrapper.withRetry(() => spotifyApi.setShuffle(!currentState));
            plugin.setState(context, !currentState ? 1 : 0);
            plugin.showOk(context);
        } catch (error) {
            log.error("设置随机模式失败:", error);
            plugin.showAlert(context);
        }
    },
    async updateShuffleState(context) {
        try {
            const playbackState = stateManager.playbackState;
            if (playbackState && playbackState.body) {
                plugin.setState(context, playbackState.body.shuffle_state ? 1 : 0);
            }
        } catch (error) {
            log.error("获取随机状态失败:", error);
        }
    },
    async _propertyInspectorDidAppear({ context }) {},
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
        stateManager.offContext(context);
    },
});

// 歌曲详情
plugin.songinfo = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
    },
    async keyUp({ context, payload }) {
        try {
            const playbackState = stateManager.playbackState;
            if (playbackState.body && playbackState.body.item) {
                const item = playbackState.body.item;
                const artists = item.artists.map((artist) => artist.name).join(", ");

                let copyText = "";
                switch (this.data[context].mode) {
                    case "title":
                        copyText = item.name;
                        break;
                    case "artist":
                        copyText = artists;
                        break;
                    case "artist-title":
                        copyText = `${artists}-${item.name}`;
                        break;
                    case "uri":
                        copyText = item.uri;
                        break;
                    case "url":
                        copyText = item.external_urls.spotify;
                        break;
                    case "title-artist":
                    default:
                        copyText = `${item.name}-${artists}`;
                        break;
                }
                try {
                    if (process.platform === "win32") {
                        execSync(`echo|set /p="${copyText}" | clip`, { shell: "cmd.exe" });
                    } else if (process.platform === "darwin") {
                        execSync(`echo ${JSON.stringify(copyText)} | pbcopy`);
                    }
                    plugin.showOk(context);
                } catch (err) {
                    log.error("复制失败:", err);
                    plugin.showAlert(context);
                }
            } else {
                plugin.showAlert(context);
            }
        } catch (error) {
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {},
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
    },
});

// 音量加
plugin.volumeup = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        stateManager.on(
            "volume:changed",
            () => {
                updateVolumeTitle(context, this.data[context].show);
            },
            context,
        );
        updateVolumeTitle(context, this.data[context].show);
    },
    async keyDown({ context, payload }) {
        try {
            log.info("音量增大按下");
            if (!(await stateManager.requireReady(context))) return;
            stateManager.adjustVolume(this.data[context].step || 10, false);
        } catch (error) {
            log.error("调整音量失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {},
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
        stateManager.offContext(context);
    },
});

// 音量减
plugin.volumedown = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        stateManager.on(
            "volume:changed",
            () => {
                updateVolumeTitle(context, this.data[context].show);
            },
            context,
        );
        updateVolumeTitle(context, this.data[context].show);
    },
    async keyDown({ context, payload }) {
        try {
            log.info("音量减小按下");
            if (!(await stateManager.requireReady(context))) return;
            stateManager.adjustVolume(-(this.data[context].step || 10), false);
        } catch (error) {
            log.error("调整音量失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {},
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
        stateManager.offContext(context);
    },
});

// 设置音量
plugin.volumeset = new Actions({
    default: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        stateManager.on(
            "volume:changed",
            () => {
                updateVolumeTitle(context, this.data[context].show);
            },
            context,
        );
        updateVolumeTitle(context, this.data[context].show);
    },
    async keyDown({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;
            const newVolume = Math.max(0, this.data[context].volume || 50);
            stateManager.setTargetVolume(newVolume, true);
            plugin.showOk(context);
        } catch (error) {
            log.error("设置音量失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {},
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
        stateManager.offContext(context);
    },
});

// 静音
plugin.mute = new Actions({
    default: {},
    lastVolume: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        stateManager.on(
            "volume:changed",
            () => {
                updateVolumeTitle(context, this.data[context].show);
            },
            context,
        );
        updateVolumeTitle(context, this.data[context].show);
    },
    async keyDown({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;
            const currentVolume = stateManager.volume.current ?? 0;
            if (currentVolume === 0) {
                const newVolume = this.lastVolume[context] || 50;
                stateManager.setTargetVolume(newVolume, true);
                plugin.setState(context, 0);
            } else {
                this.lastVolume[context] = currentVolume;
                stateManager.setTargetVolume(0, true);
                plugin.setState(context, 1);
            }
            plugin.showOk(context);
        } catch (error) {
            log.error("静音操作失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {},
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
        stateManager.offContext(context);
    },
});

// 旋钮上一首下一首
plugin.previousornext = new Actions({
    default: {},
    progressInterval: {},
    lastProgressTime: {},
    lastProgressMs: {},
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        const updateLocalProgress = () => {
            try {
                const playbackState = stateManager.playbackState;
                if (!playbackState?.body) return;

                const { item, is_playing } = playbackState.body;
                if (!item || !is_playing) return;

                const now = Date.now();
                const timeSinceLastUpdate = now - (this.lastProgressTime[context] || now);
                this.lastProgressTime[context] = now;

                this.lastProgressMs[context] = (this.lastProgressMs[context] ?? 0) + timeSinceLastUpdate;
                if (this.data[context]?.text == undefined || this.data[context].id != item.id) {
                    let text = "";
                    switch (this.data[context].titleFormat) {
                        case "title":
                            text = item.name + " ";
                            break;
                        case "artist":
                            text = item.artists[0].name + " ";
                            break;
                        case "artist-title":
                            text = `${item.artists[0].name}-${item.name}` + " ";
                            break;
                        case "title-artist":
                        default:
                            text = `${item.name}-${item.artists[0].name}` + " ";
                            break;
                    }
                    this.data[context].text = this.data[context].showTitle ? text : "";
                } else {
                    this.data[context].text = this.data[context].showTitle ? getLoopText(this.data[context].text) : "";
                }
                this.data[context].id = item.id;
                const remaining_ms = item.duration_ms - this.lastProgressMs[context];
                const displayTime = this.data[context].timeDisplay == "elapsed" ? this.lastProgressMs[context] : remaining_ms;
                if (!ImageBuffer) return;
                const svg = createSvg(ImageBuffer, this.data[context].text, is_playing, displayTime);
                svg.then((svg) => {
                    plugin.setImage(context, `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`);
                });
            } catch (error) {
                log.error("previousornext updateLocalProgress:", error);
            }
        };

        const startLocalProgress = () => {
            if (this.progressInterval[context] == null) {
                this.progressInterval[context] = setInterval(updateLocalProgress, 1000);
            }
        };

        const stopLocalProgress = () => {
            if (this.progressInterval[context]) {
                clearInterval(this.progressInterval[context]);
                delete this.progressInterval[context];
            }
        };

        const checkPlayingState = () => {
            const playbackState = stateManager.playbackState;
            const isPlaying = playbackState?.body?.is_playing ?? false;
            if (isPlaying) {
                startLocalProgress();
            } else {
                stopLocalProgress();
            }
        };

        stateManager.on(
            "progress:changed",
            (data) => {
                if (data.item) {
                    this.lastProgressTime[context] = Date.now();
                    this.lastProgressMs[context] = data.progress_ms;
                }
                if (data.is_playing !== undefined) {
                    checkPlayingState();
                }
            },
            context,
        );
        stateManager.on(
            "playback:state",
            (data) => {
                this.lastProgressTime[context] = Date.now();
                checkPlayingState();
            },
            context,
        );
    },
    async dialRotate({ context, payload }) {
        if (payload.pressed) {
            return;
        }
        try {
            const now = Date.now();
            if (now - this.lastRequestTime < 1000) {
                return;
            }
            this.lastRequestTime = now;

            if (!(await stateManager.requireReady(context))) return;

            if (payload.ticks < 0) {
                await apiWrapper.withRetry(() => spotifyApi.skipToPrevious());
            } else {
                await apiWrapper.withRetry(() => spotifyApi.skipToNext());
            }
            plugin.showOk(context);
        } catch (error) {
            log.error("切换歌曲失败:", error);
            plugin.showAlert(context);
        }
    },
    async dialDown({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;

            const playbackState = stateManager.playbackState;
            if (!playbackState.body) {
                log.warn("无法获取播放状态");
                plugin.showAlert(context);
                return;
            }

            if (playbackState.body.is_playing) {
                await apiWrapper.withRetry(() => spotifyApi.pause());
            } else {
                await apiWrapper.withRetry(() => spotifyApi.play());
            }
            plugin.showOk(context);
        } catch (error) {
            log.error("播放暂停切换失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const devices = await cache.getCachedDevices(spotifyApi);
            if (devices.body.devices) {
                plugin.sendToPropertyInspector({
                    devices: devices.body.devices,
                });
            }
        } catch (error) {
            log.error("获取设备列表失败:", error);
        }
    },
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
        stateManager.offContext(context);
        if (this.progressInterval[context]) {
            clearInterval(this.progressInterval[context]);
            delete this.progressInterval[context];
        }
    },
});

//旋钮调节音量
plugin.volumecontrol = new Actions({
    default: {},
    lastVolume: {},
    lastRequestTime: 0,
    async _willAppear({ context, payload }) {
        stateManager.register(context);
        stateManager.on(
            "volume:changed",
            () => {
                updateVolumeTitle(context, this.data[context].show);
            },
            context,
        );
        updateVolumeTitle(context, this.data[context].show);
    },
    async dialRotate({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;
            const playbackState = stateManager.playbackState;
            if (!playbackState.body?.device) {
                return;
            }
            const step = this.data[context]?.step || 10;
            const direction = payload.ticks < 0 ? -step : step;
            stateManager.adjustVolume(direction, false);
        } catch (error) {
            log.error("调节音量失败:", error);
        }
    },
    async dialDown({ context, payload }) {
        try {
            if (!(await stateManager.requireReady(context))) return;
            const playbackState = stateManager.playbackState;
            if (!playbackState.body?.device) {
                return;
            }
            const currentVolume = playbackState.body?.device.volume_percent;
            if (currentVolume === 0) {
                const newVolume = this.lastVolume[context] || 50;
                await apiWrapper.withRetry(() => spotifyApi.setVolume(newVolume));
                plugin.setState(context, 0);
            } else {
                this.lastVolume[context] = currentVolume;
                await apiWrapper.withRetry(() => spotifyApi.setVolume(0));
                plugin.setState(context, 1);
            }
            plugin.showOk(context);
        } catch (error) {
            log.error("静音操作失败:", error);
            plugin.showAlert(context);
        }
    },
    async _propertyInspectorDidAppear({ context }) {},
    sendToPlugin({ payload, context }) {},
    _willDisappear({ context }) {
        stateManager.unregister(context);
        stateManager.offContext(context);
    },
});

//启动服务器
startServer();

function startServer() {
    const express = require("express");
    const cors = require("cors");
    const app = express();
    app.use(cors());
    const port = 26433;

    app.get("/", async (req, res) => {
        const { code } = req.query;
        try {
            const data = await spotifyApi.authorizationCodeGrant(code);
            const { access_token, refresh_token } = data.body;

            spotifyApi.setAccessToken(access_token);
            spotifyApi.setRefreshToken(refresh_token);
            const timestampSeconds = Math.floor(Date.now() / 1000);
            const tokenData = {
                access_token,
                refresh_token,
                client_id: spotifyApi.getClientId(),
                client_secret: spotifyApi.getClientSecret(),
                expires_at: timestampSeconds + data.body.expires_in,
            };
            log.info("授权成功");
            stateManager.hasToken = true;
            plugin.setGlobalSettings(tokenData);
            res.sendFile(__dirname + "/successful.html");
        } catch (error) {
            log.error("授权失败:", error);
            const errorMessage = encodeURIComponent(error.message || "Unknown error occurred");
            res.redirect(`/error.html?error=${errorMessage}`);
        }
    });

    app.get("/authorization", (req, res) => {
        const scopes = [
            "playlist-modify-private",
            "playlist-modify-public",
            "playlist-read-collaborative",
            "playlist-read-private",
            "user-follow-read",
            "user-library-modify",
            "user-library-read",
            "user-modify-playback-state",
            "user-read-currently-playing",
            "user-read-playback-state",
            "user-read-private",
            "user-top-read",
        ];
        spotifyApi.setClientId(req.query.clientId);
        spotifyApi.setClientSecret(req.query.clientSecret);
        const authorizeURL = spotifyApi.createAuthorizeURL(scopes, "state");
        res.redirect(authorizeURL);
    });

    // 启动服务器
    // Start the server
    app.listen(port, () => {
        log.info(`Server is running at http://127.0.0.1:${port}`);
    });

    app.use((err, req, res, next) => {
        log.error("Unhandled error:", err);
        res.status(err.status || 500);
        res.send({
            message: err.message,
            error: err,
        });
    });
}

// 添加令牌刷新函数
async function refreshAccessToken() {
    try {
        const data = await spotifyApi.refreshAccessToken();
        const access_token = data.body["access_token"];
        const expires_in = data.body["expires_in"];
        if (access_token && expires_in) {
            stateManager.hasToken = true;
            log.info("刷新令牌成功");
            spotifyApi.setAccessToken(access_token);
            const timestampSeconds = Math.floor(Date.now() / 1000);
            Plugins.globalSettings.access_token = access_token;
            Plugins.globalSettings.expires_at = timestampSeconds + expires_in;
            plugin.setGlobalSettings(Plugins.globalSettings);
        }
    } catch (error) {
        stateManager.hasToken = false;
        if (error.statusCode === 401) {
            Plugins.globalSettings = {};
            spotifyApi.setAccessToken("");
            spotifyApi.setRefreshToken("");
            plugin.setGlobalSettings({});
            log.error("Token已失效，清除认证信息");
        } else if (error.statusCode === 400) {
            spotifyApi.setAccessToken("");
            spotifyApi.setRefreshToken("");
            plugin.setGlobalSettings({});
            log.error("刷新token失败,清除认证信息:", error.body.error_description);
        } else {
            log.error("刷新token错误:", error);
        }
    }
}
plugin.didReceiveGlobalSettings = async ({ payload: { settings } }) => {
    if (settings && settings.access_token && settings.refresh_token) {
        spotifyApi.setAccessToken(settings.access_token);
        spotifyApi.setRefreshToken(settings.refresh_token);
        spotifyApi.setClientId(settings.client_id);
        spotifyApi.setClientSecret(settings.client_secret);
        stateManager.hasToken = true;
        const timestampSeconds = Math.floor(Date.now() / 1000);
        if (!settings.expires_at || timestampSeconds > settings.expires_at - 60) {
            log.info("Token即将过期，自动刷新token");
            await refreshAccessToken();
        }
        log.info("Token已设置");
    } else {
        spotifyApi.setAccessToken("");
    }
};

async function startcheckTime() {
    try {
        const settings = Plugins.globalSettings;
        const timestampSeconds = Math.floor(Date.now() / 1000);
        if (settings && settings.access_token) {
            if (!spotifyApi.getAccessToken()) {
                spotifyApi.setAccessToken(settings.access_token);
                spotifyApi.setRefreshToken(settings.refresh_token);
                spotifyApi.setClientId(settings.client_id);
                spotifyApi.setClientSecret(settings.client_secret);
                log.info("spotifyApi缺失AccessToken,尝试globalSettings的AccessToken");
                await refreshAccessToken();
                log.info("refreshAccessToken 执行完毕");
            } else if (!settings.expires_at || timestampSeconds > settings.expires_at - 300) {
                log.info("Token即将过期，自动刷新token");
                await refreshAccessToken();
                log.info("refreshAccessToken 执行完毕");
            }
        }
    } catch (error) {
        if (error.statusCode != 401) {
            log.error("Token自动检查失败:", error);
        }
    }
}

setInterval(startcheckTime, 60 * 1000);
