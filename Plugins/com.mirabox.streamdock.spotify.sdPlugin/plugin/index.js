/*
 * Copyright (C) 2025 MiraboxSpace
 *
 * This program is free software: you can redistribute it and/or modify  
 * it under the terms of the GNU General Public License as published by  
 * the Free Software Foundation, either version 3 of the License, or  
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,  
 * but WITHOUT ANY WARRANTY; without even the implied warranty of  
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the  
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License  
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const { Plugins, Actions, log, EventEmitter } = require('./utils/plugin');
const { execSync } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const SpotifyWebApi = require('spotify-web-api-node');

console.log("Test mapping node console to browser");

const plugin = new Plugins('spotify');

// 创建 Spotify API 实例
const spotifyApi = new SpotifyWebApi({
    redirectUri: 'http://127.0.0.1:26433',
    timeout: 5000
});

plugin.didReceiveGlobalSettings = ({ payload: { settings } }) => {
    // log.info('=================', settings);
    if (settings && settings.access_token && settings.refresh_token) {
        spotifyApi.setAccessToken(settings.access_token);
        spotifyApi.setRefreshToken(settings.refresh_token);
        spotifyApi.setClientId(settings.client_id);
        spotifyApi.setClientSecret(settings.client_secret);
    } else {
        spotifyApi.setAccessToken('');
    }
};

const getLoopText = (text) => {
    return text.slice(1) + text.slice(0, 1);
};

const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const secondsToHHMM = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

const createSvg = (imageUrl, text, isPlaying, duration) => `
<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
        <filter id="brightness">
            <feComponentTransfer>
                <feFuncR type="linear" slope="${isPlaying ? '1' : '0.5'}"/>
                <feFuncG type="linear" slope="${isPlaying ? '1' : '0.5'}"/>
                <feFuncB type="linear" slope="${isPlaying ? '1' : '0.5'}"/>
            </feComponentTransfer>
        </filter>
        <filter id="textShadow">
            <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="black" flood-opacity="1"/>
        </filter>
    </defs>
    <image xlink:href="${imageUrl}" width="144" height="144" filter="url(#brightness)"/>
    <text x="72" y="44" font-family="Arial" font-weight="bold" font-size="36" fill="white" text-anchor="middle"
        stroke="black" stroke-width="2" paint-order="stroke" filter="url(#textShadow)">
        ${text}
    </text>
    <text x="72" y="130" font-family="Arial" font-weight="bold" font-size="40" fill="white" text-anchor="middle"
        stroke="black" stroke-width="2" paint-order="stroke" filter="url(#textShadow)">
        ${formatTime(duration)}
    </text>
</svg>`;
const timers = {};

let playbackStateData = null;
let lastTime = 0;
// 添加限流控制
let throttleUntil = null;

// 1秒或者1秒以内的调用则返回旧数据不发请求，大于1秒则请求接口，这样声音就不用重新请求了
async function getCachedPlaybackState() {
    try {
        // 检查是否在限流期间
        if (throttleUntil) {
            const sleepTime = throttleUntil - Date.now();
            if (sleepTime > 0) {
                log.warn(`API限流中 - 等待 ${sleepTime} ms后重试`);
                return { retryAfter: sleepTime / 1000 };
            }
            throttleUntil = null;
        }

        const now = Date.now();
        if (playbackStateData && (now - lastTime < 1000)) {
            // log.info("使用旧数据");
            return playbackStateData;
        }

        lastTime = now;
        const newState = await spotifyApi.getMyCurrentPlaybackState();
        // log.info("新数据");
        playbackStateData = newState;
        return newState;
    } catch (error) {
        if (error.statusCode === 429) {
            const retryAfter = parseInt(error.headers['retry-after']) || 5;
            throttleUntil = Date.now() + (retryAfter * 1000);
            log.warn(`触发限流 - 将在 ${retryAfter} 秒后恢复请求`);
            return { retryAfter: retryAfter };
        } else if (error.statusCode === 401) {
            await refreshAccessToken();
        } else {
            log.error('获取播放信息失败:', error);
        }
        return playbackStateData || { body: null };
    }
}
// playpause
plugin.playpause = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) {
        // log.info("playpause: ", context);
        timers[context] && clearInterval(timers[context]);

        timers[context] = setInterval(async () => {
            try {
                const playbackState = await getCachedPlaybackState();
                if ("retryAfter" in playbackState) {
                    plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                    return;
                }
                // log.info("playbackState: ", playbackState.body);
                if (playbackState.body) {
                    const { is_playing, item, progress_ms } = playbackState.body;
                    // plugin.setState(context, is_playing ? 1 : 0);

                    if (item) {
                        // 获取封面图片
                        const imageUrl = item.album.images[0]?.url;
                        if (imageUrl) {
                            if (this.data[context]?.text == undefined || this.data[context].id != item.id) {
                                let text = '';
                                switch (this.data[context].titleFormat) {
                                    case 'title':
                                        text = item.name + " ";
                                        break;
                                    case 'artist':
                                        text = item.artists[0].name + " ";
                                        break;
                                    case 'artist-title':
                                        text = `${item.artists[0].name}-${item.name}` + " ";
                                        break;
                                    case 'title-artist':
                                    default:
                                        text = `${item.name}-${item.artists[0].name}` + " ";
                                        break;
                                }
                                this.data[context].text = this.data[context].showTitle ? text : "";
                            } else {
                                this.data[context].text = this.data[context].showTitle ? getLoopText(this.data[context].text) : "";
                            }
                            this.data[context].id = item.id;
                            // log.info(this.data[context].text);
                            // log.info(imageUrl);
                            const response = await fetch(imageUrl);
                            const arrayBuffer = await response.arrayBuffer();
                            const buffer = Buffer.from(arrayBuffer);
                            const remaining_ms = item.duration_ms - progress_ms;
                            const svg = createSvg(`data:image/jpeg;base64,${buffer.toString('base64')}`, this.data[context].text, is_playing, this.data[context].timeDisplay == "elapsed" ? progress_ms : remaining_ms);

                            plugin.setImage(context, `data:image/svg+xml;charset=utf8,${svg}`);
                        }
                    }
                }
            } catch (error) {
                log.error('playpause _willAppear:', error);
            }
        }, 1000);
    },
    _willDisappear({ context }) {
        // log.info('willDisAppear', context)
        timers[context] && clearInterval(timers[context]);
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const devices = await spotifyApi.getMyDevices();
            if (devices.body.devices) {
                plugin.sendToPropertyInspector({
                    devices: devices.body.devices
                });
            }
        } catch (error) {
            log.error('获取播放列表失败:', error);
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this._propertyInspectorDidAppear({ context });
            } else if (error.code === "ECONNRESET") {
                this._propertyInspectorDidAppear({ context });
            }
        }
    },
    sendToPlugin({ payload, context }) {
        // 处理设备选择
        if (payload.type === 'device_selected') {
            this.data[context].device_id = payload.device_id;
        }
    },
    async keyUp({ context, payload }) {
        try {
            // const data = await spotifyApi.getMyCurrentPlaybackState();
            // 获取当前播放状态和信息
            const [data, me] = await Promise.all([
                spotifyApi.getMyCurrentPlaybackState(),
                spotifyApi.getMe()
            ]);
            // 检查用户账户类型
            const isPremium = me.body.product === 'premium';
            // log.info("isPremium: ", me);
            if (!isPremium) {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }
            if (data.body && data.body.is_playing) {
                await spotifyApi.pause();
                plugin.showOk(context);
                // plugin.setState(context, 0);
            } else {
                // 如果指定了设备，则在指定设备上播放
                if (this.data[context].device_id) {
                    await spotifyApi.transferMyPlayback([this.data[context].device_id]);
                }
                await spotifyApi.play();
                plugin.showOk(context);
                // plugin.setState(context, 1);
            }
        } catch (error) {
            log.error('控制播放失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    }
});

// 上一曲
plugin.previous = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) { },
    async keyUp({ context, payload }) {
        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }
            await spotifyApi.skipToPrevious();
            plugin.showOk(context);
        } catch (error) {
            log.error('切换上一曲失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) { },
    sendToPlugin({ payload, context }) { },
    _willDisappear({ context }) { }
});


// 下一曲
plugin.next = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) { },
    async keyUp({ context, payload }) {
        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }
            await spotifyApi.skipToNext();
            plugin.showOk(context);
        } catch (error) {
            log.error('切换下一曲失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) { },
    sendToPlugin({ payload, context }) { },
    _willDisappear({ context }) { }
});

// 切换播放设备
plugin.changedevice = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) { },
    async keyUp({ context, payload }) {
        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }

            if (this.data[context].device_id) {
                await spotifyApi.transferMyPlayback([this.data[context].device_id]);
                // log.info('切换设备成功');
                plugin.showOk(context);
            } else {
                // log.warn('未选择目标设备');
                plugin.showAlert(context);
            }
        } catch (error) {
            log.error('切换设备失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const devices = await spotifyApi.getMyDevices();
            if (devices.body.devices) {
                plugin.sendToPropertyInspector({
                    devices: devices.body.devices
                });
            }
        } catch (error) {
            log.error('获取播放列表失败:', error);
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this._propertyInspectorDidAppear({ context });
            } else if (error.code === "ECONNRESET") {
                this._propertyInspectorDidAppear({ context });
            }
        }
    },
    async sendToPlugin({ payload, context }) {
        if (payload.type === 'refresh') {
            this._propertyInspectorDidAppear({ context });
        }
    },
    _willDisappear({ context }) { }
});


// 设置喜欢
plugin.likesong = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) {
        await this.updateLikeState(context);
    },
    async keyUp({ context, payload }) {
        try {
            const playbackState = await spotifyApi.getMyCurrentPlaybackState();
            if (!playbackState.body || !playbackState.body.item) {
                log.warn('没有正在播放的歌曲');
                plugin.showAlert(context);
                return;
            }

            const trackId = playbackState.body.item.id;
            const checkSaved = await spotifyApi.containsMySavedTracks([trackId]);
            const isLiked = checkSaved.body[0];
            // console.log(trackId);

            if (isLiked) {
                await spotifyApi.removeFromMySavedTracks([trackId]);
                plugin.setState(context, 0);
            } else {
                await spotifyApi.addToMySavedTracks([trackId]);
                plugin.setState(context, 1);
            }
        } catch (error) {
            console.log('error', error);

            log.error('设置喜欢失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async updateLikeState(context) {
        try {
            const playbackState = await spotifyApi.getMyCurrentPlaybackState();
            if (playbackState.body && playbackState.body.item) {
                const trackId = playbackState.body.item.id;
                const checkSaved = await spotifyApi.containsMySavedTracks([trackId]);
                plugin.setState(context, checkSaved.body[0] ? 1 : 0);
            }
        } catch (error) {
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.updateLikeState({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.updateLikeState({ context, payload });
            } else {
                log.error('获取喜欢状态失败:', error);
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) { },
    sendToPlugin({ payload, context }) { },
    _willDisappear({ context }) { }
});

// 播放指定链接歌曲
plugin.playuri = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) { },
    async keyUp({ context, payload }) {
        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }

            // 检查是否有设置URL
            if (!this.data[context].uri) {
                log.warn('未设置歌曲链接');
                plugin.showAlert(context);
                return;
            }

            // 匹配Spotify URI格式，支持可选的时间戳格式(#mm:ss)
            const spotifyUriRegex = /^spotify:track:[a-zA-Z0-9]{22}(#\d{1,2}:\d{2})?$/;
            if (!spotifyUriRegex.test(this.data[context].uri)) {
                log.warn('无效的Spotify URI格式');
                plugin.showAlert(context);
                return;
            }

            // 提取时间
            const timeMatch = this.data[context].uri.match(/#(\d{1,2}):(\d{2})$/);
            let position_ms = 0;
            let uri = this.data[context].uri;
            if (timeMatch) {
                const minutes = parseInt(timeMatch[1]);
                const seconds = parseInt(timeMatch[2]);
                position_ms = (minutes * 60 + seconds) * 1000;
                // 移除URI中的时间戳部分
                uri = this.data[context].uri.replace(/#.*$/, '');
            }

            if (this.data[context].device_id) {
                await spotifyApi.transferMyPlayback([this.data[context].device_id]);
            }

            if (this.data[context].playOption == 'play') {
                await spotifyApi.play({
                    uris: [`${uri}`],
                    position_ms: position_ms
                });
                plugin.showOk(context);
            } else {
                await spotifyApi.addToQueue(uri);
                plugin.showOk(context);
            }

            log.info('开始播放歌曲:', trackId);
        } catch (error) {
            log.error('播放歌曲失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const devices = await spotifyApi.getMyDevices();
            if (devices.body.devices) {
                plugin.sendToPropertyInspector({
                    devices: devices.body.devices
                });
            }
        } catch (error) {
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this._propertyInspectorDidAppear({ context });
            } else if (error.code === "ECONNRESET") {
                this._propertyInspectorDidAppear({ context });
            } else {
                log.error('获取播放列表失败:', error);
            }
        }
    },
    async sendToPlugin({ payload, context }) {
        if (payload.type === 'refresh') {
            this._propertyInspectorDidAppear({ context });
        }
    },
    _willDisappear({ context }) { }
});


// 播放指定播放列表
plugin.playplaylist = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) {
        this._didReceiveSettings({ context, payload });
    },
    async keyUp({ context, payload }) {
        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }

            if (this.data[context].device_id) {
                await spotifyApi.transferMyPlayback([this.data[context].device_id]);
            }

            // 播放播放列表
            await spotifyApi.play({
                context_uri: this.data[context].uri
            });

            plugin.showOk(context);
        } catch (error) {
            log.error('播放播放列表失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const [devices, playlists] = await Promise.all([
                spotifyApi.getMyDevices(),
                spotifyApi.getUserPlaylists()
            ]);

            const data = {};

            if (devices.body.devices) {
                data.devices = devices.body.devices;
            }
            if (playlists.body.items) {
                data.playlists = playlists.body.items.map(playlist => ({
                    id: playlist.id,
                    name: playlist.name,
                    uri: playlist.uri,
                    owner: playlist.owner.display_name,
                    tracks: playlist.tracks.total
                }));
            }

            plugin.sendToPropertyInspector(data);
        } catch (error) {
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this._propertyInspectorDidAppear({ context });
            } else if (error.code === "ECONNRESET") {
                this._propertyInspectorDidAppear({ context });
            } else {
                log.error('获取播放列表失败:', error);
            }
        }
    },
    async sendToPlugin({ payload, context }) {
        if (payload.type === 'refresh') {
            this._propertyInspectorDidAppear({ context });
        }
    },
    async _didReceiveSettings({ context, payload }) {
        try {
            if (payload.settings.showCover && payload.settings.uri) {
                const playlistId = payload.settings.uri.split(':').pop();
                const playlist = await spotifyApi.getPlaylist(playlistId);

                if (playlist.body.images && playlist.body.images.length > 0) {
                    const imageUrl = playlist.body.images[0].url;
                    const response = await fetch(imageUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    // const svg = `<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                    //     <image xlink:href="data:image/jpeg;base64,${buffer.toString('base64')}" 
                    //         width="144" height="144"/>
                    //     <text x="72" y="134" font-family="Arial" font-weight="bold" 
                    //         font-size="24" fill="white" text-anchor="middle"
                    //         stroke="black" stroke-width="2" paint-order="stroke">
                    //         ${playlist.body.tracks.total}
                    //     </text>
                    // </svg>`;
                    plugin.setImage(context, `data:image/jpeg;base64,${buffer.toString('base64')}`);
                }
            } else if (payload.settings.showCover == false) {
                plugin.setImage(context, '');
            }
        } catch (error) {
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this._didReceiveSettings({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this._didReceiveSettings({ context, payload });
            } else {
                log.error('获取播放列表封面失败:', error);
            }
        }
    },
    _willDisappear({ context }) { }
});

// 移除播放列表歌曲
plugin.removeplaylistsong = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) {
        this._didReceiveSettings({ context, payload });
    },
    async keyUp({ context, payload }) {
        try {
            // 获取当前播放状态
            const playbackState = await spotifyApi.getMyCurrentPlaybackState();
            if (!playbackState.body || !playbackState.body.item) {
                log.warn('没有正在播放的歌曲');
                plugin.showAlert(context);
                return;
            }

            // 检查是否设置了播放列表ID
            if (!this.data[context].playlist_id) {
                log.warn('未设置目标播放列表');
                plugin.showAlert(context);
                return;
            }

            const trackUri = playbackState.body.item.uri;
            // const trackId = playbackState.body.item.id;

            await spotifyApi.removeTracksFromPlaylist(
                this.data[context].playlist_id,
                [{ uri: trackUri }]
            );

            // 切到下一首
            if (playbackState.body.is_playing) {
                await spotifyApi.skipToNext();
            }

            plugin.showOk(context);
        } catch (error) {
            log.error('移除歌曲失败:', error);
            plugin.showAlert(context);
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async _didReceiveSettings({ context, payload }) {
        // log.info('_didReceiveSettings', payload);
        try {
            if (payload.settings.showCover && payload.settings.playlist_id) {
                const playlist = await spotifyApi.getPlaylist(payload.settings.playlist_id);

                if (playlist.body.images && playlist.body.images.length > 0) {
                    const imageUrl = playlist.body.images[0].url;
                    const response = await fetch(imageUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    plugin.setImage(context, `data:image/jpeg;base64,${buffer.toString('base64')}`);
                }
            } else if (payload.settings.showCover == false) {
                plugin.setImage(context, '');
            }
        } catch (error) {
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this._didReceiveSettings({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this._didReceiveSettings({ context, payload });
            } else {
                log.error('获取播放列表封面失败:', error);
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const playlists = await spotifyApi.getUserPlaylists();
            const data = {};
            if (playlists.body.items) {
                data.playlists = playlists.body.items.map(playlist => ({
                    id: playlist.id,
                    name: playlist.name,
                    uri: playlist.uri,
                    owner: playlist.owner.display_name,
                    tracks: playlist.tracks.total
                }));
                plugin.sendToPropertyInspector(data);
            }
        } catch (error) {
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this._propertyInspectorDidAppear({ context });
            } else if (error.code === "ECONNRESET") {
                this._propertyInspectorDidAppear({ context });
            } else {
                log.error('获取设备和播放列表失败:', error);
            }
        }
    },
    sendToPlugin({ payload, context }) {
    },
    _willDisappear({ context }) { }
});


// 添加到播放列表
plugin.addtoplaylist = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) {
        this._didReceiveSettings({ context, payload });
    },
    async keyUp({ context, payload }) {
        try {
            // 获取当前播放状态
            const playbackState = await spotifyApi.getMyCurrentPlaybackState();
            if (!playbackState.body || !playbackState.body.item) {
                log.warn('没有正在播放的歌曲');
                plugin.showAlert(context);
                return;
            }

            // 检查是否设置了播放列表ID
            if (!this.data[context].playlist_id) {
                log.warn('未设置目标播放列表');
                plugin.showAlert(context);
                return;
            }

            const trackUri = playbackState.body.item.uri;
            // const trackId = playbackState.body.item.id;

            await spotifyApi.addTracksToPlaylist(
                this.data[context].playlist_id,
                [trackUri]
            );

            plugin.showOk(context);
        } catch (error) {
            log.error('添加歌曲失败:', error);
            plugin.showAlert(context);
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async _didReceiveSettings({ context, payload }) {
        // log.info('_didReceiveSettings', payload);
        try {
            if (payload.settings.showCover && payload.settings.playlist_id) {
                const playlist = await spotifyApi.getPlaylist(payload.settings.playlist_id);

                if (playlist.body.images && playlist.body.images.length > 0) {
                    const imageUrl = playlist.body.images[0].url;
                    const response = await fetch(imageUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    plugin.setImage(context, `data:image/jpeg;base64,${buffer.toString('base64')}`);
                }
            } else if (payload.settings.showCover == false) {
                plugin.setImage(context, '');
            }
        } catch (error) {
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this._didReceiveSettings({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this._didReceiveSettings({ context, payload });
            } else {
                log.error('获取播放列表封面失败:', error);
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const playlists = await spotifyApi.getUserPlaylists();
            const data = {};
            if (playlists.body.items) {
                data.playlists = playlists.body.items.map(playlist => ({
                    id: playlist.id,
                    name: playlist.name,
                    uri: playlist.uri,
                    owner: playlist.owner.display_name,
                    tracks: playlist.tracks.total
                }));
                plugin.sendToPropertyInspector(data);
            }
        } catch (error) {
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this._propertyInspectorDidAppear({ context });
            } else if (error.code === "ECONNRESET") {
                this._propertyInspectorDidAppear({ context });
            } else {
                log.error('获取设备和播放列表失败:', error);
            }
        }
    },
    sendToPlugin({ payload, context }) {
    },
    _willDisappear({ context }) { }
});


// 循环播放模式
plugin.repeat = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) {
        await this.updateRepeatState(context);
    },
    async keyUp({ context, payload }) {
        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }

            const playbackState = await spotifyApi.getMyCurrentPlaybackState();
            if (!playbackState.body) {
                log.warn('无法获取播放状态');
                plugin.showAlert(context);
                return;
            }

            // 切换循环模式：off -> context -> track -> off
            const currentState = playbackState.body.repeat_state;
            let nextState;
            switch (currentState) {
                case 'off':
                    nextState = 'context';
                    break;
                case 'context':
                    nextState = 'track';
                    break;
                case 'track':
                    nextState = 'off';
                    break;
                default:
                    nextState = 'off';
            }

            await spotifyApi.setRepeat(nextState);

            switch (nextState) {
                case 'off':
                    plugin.setState(context, 0);
                    break;
                case 'context':
                    plugin.setState(context, 1);
                    break;
                case 'track':
                    plugin.setState(context, 2);
                    break;
            }

            plugin.showOk(context);
        } catch (error) {
            log.error('设置循环模式失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async updateRepeatState(context) {
        try {
            const playbackState = await spotifyApi.getMyCurrentPlaybackState();
            if (playbackState.body) {
                switch (playbackState.body.repeat_state) {
                    case 'off':
                        plugin.setState(context, 0);
                        break;
                    case 'context':
                        plugin.setState(context, 1);
                        break;
                    case 'track':
                        plugin.setState(context, 2);
                        break;
                }
            }
        } catch (error) {
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.updateRepeatState({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.updateRepeatState({ context, payload });
            } else {
                log.error('获取循环状态失败:', error);
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) { },
    sendToPlugin({ payload, context }) { },
    _willDisappear({ context }) { }
});


// 随机模式
plugin.shuffle = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) {
        await this.updateShuffleState(context);
    },
    async keyUp({ context, payload }) {
        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }

            const playbackState = await spotifyApi.getMyCurrentPlaybackState();
            if (!playbackState.body) {
                log.warn('无法获取播放状态');
                plugin.showAlert(context);
                return;
            }

            // 切换随机模式
            const currentState = playbackState.body.shuffle_state;
            await spotifyApi.setShuffle(!currentState);
            plugin.setState(context, !currentState ? 1 : 0);
            plugin.showOk(context);
        } catch (error) {
            log.error('设置随机模式失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async updateShuffleState(context) {
        try {
            const playbackState = await spotifyApi.getMyCurrentPlaybackState();
            if (playbackState.body) {
                plugin.setState(context, playbackState.body.shuffle_state ? 1 : 0);
            }
        } catch (error) {
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.updateShuffleState(context);
            } else if (error.code === "ECONNRESET") {
                this.updateShuffleState(context);
            } else {
                log.error('获取随机状态失败:', error);
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) { },
    sendToPlugin({ payload, context }) { },
    _willDisappear({ context }) { }
});


// 歌曲详情
plugin.songinfo = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) {
    },
    async keyUp({ context, payload }) {
        try {
            const playbackState = await spotifyApi.getMyCurrentPlaybackState();
            if (playbackState.body && playbackState.body.item) {
                const item = playbackState.body.item;
                const artists = item.artists.map(artist => artist.name).join(', ');

                // 构建显示文本
                let copyText = '';
                switch (this.data[context].mode) {
                    case 'title':
                        copyText = item.name;
                        break;
                    case 'artist':
                        copyText = artists;
                        break;
                    case 'artist-title':
                        copyText = `${artists}-${item.name}`;
                        break;
                    case 'uri':
                        copyText = item.uri;
                        break;
                    case 'url':
                        copyText = item.external_urls.spotify;
                        break;
                    case 'title-artist':
                    default:
                        copyText = `${item.name}-${artists}`;
                        break;
                }
                try {
                    if (process.platform === 'win32') {
                        // 处理 Windows 复制内容时的换行符和编码问题
                        execSync(`echo|set /p="${copyText}" | clip`, { shell: 'cmd.exe' });
                    } else if (process.platform === 'darwin') {
                        // macOS 处理文本转义
                        execSync(`echo ${JSON.stringify(copyText)} | pbcopy`);
                    }
                    plugin.showOk(context);
                } catch (err) {
                    log.error('复制失败:', err);
                    plugin.showAlert(context);
                }
                // clipboardy.writeSync(copyText);
            } else {
                plugin.showAlert(context);
            }
        } catch (error) {
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp(context);
            } else if (error.code === "ECONNRESET") {
                this.keyUp(context);
            } else {
                plugin.showAlert(context);
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) { },
    sendToPlugin({ payload, context }) {
    },
    _willDisappear({ context }) {
    }
});

// 音量加
plugin.volumeup = new Actions({
    default: {
    },
    longPressTimer: {},
    timeoutId: {},
    flag: true,
    isLongPress: false,
    async _willAppear({ context, payload }) {
        try {
            timers[context] && clearInterval(timers[context]);
            timers[context] = setInterval(async () => {
                const playbackState = await getCachedPlaybackState();
                if ("retryAfter" in playbackState) {
                    plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                    return;
                }
                if (playbackState.body.device) {
                    const currentVolume = playbackState.body.device.volume_percent;
                    if (this.data[context].show) {
                        this.flag && plugin.setTitle(context, currentVolume);
                    } else {
                        plugin.setTitle(context, "");
                    }
                }
            }, 1000)
        } catch (error) {
            log.error('volumeup _willAppear:', error);
        }
    },
    async keyDown({ context, payload }) {
        log.info("音量增加按下");

        this.isLongPress = false;
        // 初始化长按定时器，确保在keyUp中能正确检测
        this.longPressTimer[context] = null;

        // 设置长按检测定时器
        this.timeoutId[context] = setTimeout(async () => {
            this.isLongPress = true;
            // 开始持续增加音量
            this.longPressTimer[context] = setInterval(async () => {
                try {
                    log.info('持续增加音量----------------');
                    const playbackState = await getCachedPlaybackState();
                    if ("retryAfter" in playbackState) {
                        plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                        return;
                    }
                    log.info('当前音量：', playbackState.body.device?.volume_percent);
                    if (playbackState.body.device) {
                        const currentVolume = playbackState.body.device.volume_percent;
                        const newVolume = Math.min(100, currentVolume + (this.data[context].step || 10));
                        await spotifyApi.setVolume(newVolume);
                        if (this.data[context].show) {
                            this.flag = false;
                            setTimeout(() => {
                                this.flag = true;
                            }, 2000);
                            plugin.setTitle(context, newVolume);
                        }
                    }
                } catch (error) {
                    if (error.statusCode === 401) {
                        await refreshAccessToken();
                    }
                    log.error('长按调整音量失败:', error);
                }
            }, 2000);
        }, 500);
    },
    async keyUp({ context, payload }) {
        log.info("音量加抬起", this.longPressTimer[context]);
        // 先清除长按的 `setTimeout`，避免定时器还没启动就抬起
        if (this.timeoutId[context]) {
            clearTimeout(this.timeoutId[context]);
            this.timeoutId[context] = null;
        }
        // 清除长按定时器
        if (this.longPressTimer[context]) {
            log.info('长按结束======================');
            clearInterval(this.longPressTimer[context]);
            this.longPressTimer[context] = null;
        }
        // 如果是长按结束，不需要再执行增音量操作
        if (this.isLongPress) {
            this.isLongPress = false;
            return;
        }

        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }

            const playbackState = await getCachedPlaybackState();
            if ("retryAfter" in playbackState) {
                plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                return;
            }
            if (!playbackState.body) {
                log.warn('无法获取播放状态');
                plugin.showAlert(context);
                return;
            }

            if (playbackState.body.device) {
                const currentVolume = playbackState.body.device?.volume_percent;
                log.info("当前音量:", currentVolume);
                log.info("当前音量:", playbackState.body.device);
                const newVolume = Math.min(100, currentVolume + (this.data[context].step || 10));

                await spotifyApi.setVolume(newVolume);
                if (this.data[context].show) {
                    this.flag = false;
                    setTimeout(() => {
                        this.flag = true;
                    }, 2000);
                    plugin.setTitle(context, newVolume);
                } else {
                    plugin.setTitle(context, "");
                }
            }
        } catch (error) {
            log.error('调整音量失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) { },
    sendToPlugin({ payload, context }) { },
    _willDisappear({ context }) {
        timers[context] && clearInterval(timers[context]);
    }
});

// 音量减
plugin.volumedown = new Actions({
    default: {
    },
    longPressTimer: {},
    timeoutId: {},
    flag: true,
    isLongPress: false,
    async _willAppear({ context, payload }) {
        try {
            timers[context] && clearInterval(timers[context]);
            timers[context] = setInterval(async () => {
                const playbackState = await getCachedPlaybackState();
                if ("retryAfter" in playbackState) {
                    plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                    return;
                }
                if (playbackState.body.device) {
                    const currentVolume = playbackState.body.device.volume_percent;
                    if (this.data[context].show) {
                        this.flag && plugin.setTitle(context, currentVolume);
                    } else {
                        plugin.setTitle(context, "");
                    }
                }
            }, 1000)
        } catch (error) {
            log.error('volumedown _willAppear:', error);
        }
    },
    async keyUp({ context, payload }) {
        log.info("音量减小抬起", this.longPressTimer[context]);
        // 先清除长按的 `setTimeout`，避免定时器还没启动就抬起
        if (this.timeoutId[context]) {
            clearTimeout(this.timeoutId[context]);
            this.timeoutId[context] = null;
        }
        // 清除长按定时器
        if (this.longPressTimer[context]) {
            log.info('长按结束======================dsaojdoiasjhduihasiod=========');
            clearInterval(this.longPressTimer[context]);
            this.longPressTimer[context] = null;
        }
        // 如果是长按结束，不需要再执行减音量操作
        if (this.isLongPress) {
            this.isLongPress = false;
            return;
        }

        try {
            // 原有的音量减小逻辑保持不变
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }

            const playbackState = await getCachedPlaybackState();
            if ("retryAfter" in playbackState) {
                plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                return;
            }
            if (!playbackState.body) {
                log.warn('无法获取播放状态');
                plugin.showAlert(context);
                return;
            }

            if (playbackState.body.device) {
                const currentVolume = playbackState.body.device?.volume_percent;
                const newVolume = Math.max(0, currentVolume - (this.data[context].step || 10));

                await spotifyApi.setVolume(newVolume);
                if (this.data[context].show) {
                    plugin.setTitle(context, newVolume);
                    this.flag = false;
                    setTimeout(() => {
                        this.flag = true;
                    }, 2000);
                } else {
                    plugin.setTitle(context, "");
                }
            }
        } catch (error) {
            // 错误处理保持不变
            log.error('调整音量失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async keyDown({ context, payload }) {
        log.info("音量减小按下");

        this.isLongPress = false;

        // 设置长按检测定时器
        this.timeoutId[context] = setTimeout(async () => {
            this.isLongPress = true;
            // 开始持续减小音量
            this.longPressTimer[context] = setInterval(async () => {
                try {
                    log.info('持续减小音量----------------');
                    const playbackState = await getCachedPlaybackState();
                    if ("retryAfter" in playbackState) {
                        plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                        return;
                    }
                    log.info('当前音量：', playbackState.body.device?.volume_percent);
                    if (playbackState.body.device) {
                        const currentVolume = playbackState.body.device.volume_percent;
                        const newVolume = Math.max(0, currentVolume - (this.data[context].step || 10));
                        await spotifyApi.setVolume(newVolume);
                        if (this.data[context].show) {
                            this.flag = false;
                            setTimeout(() => {
                                this.flag = true;
                            }, 2000);
                            plugin.setTitle(context, newVolume);
                        }
                    }
                } catch (error) {
                    if (error.statusCode === 401) {
                        await refreshAccessToken();
                    }
                    log.error('长按调整音量失败:', error);
                }
            }, 2000);
        }, 500);
    },
    async _propertyInspectorDidAppear({ context }) { },
    sendToPlugin({ payload, context }) { },
    _willDisappear({ context }) {
        timers[context] && clearInterval(timers[context]);
    }
});

// 设置音量
plugin.volumeset = new Actions({
    default: {
    },
    async _willAppear({ context, payload }) {
        try {
            timers[context] && clearInterval(timers[context]);
            timers[context] = setInterval(async () => {
                const playbackState = await getCachedPlaybackState();
                if ("retryAfter" in playbackState) {
                    plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                    return;
                }
                if (playbackState.body.device) {
                    // log.info(playbackState.body);

                    const currentVolume = playbackState.body.device.volume_percent;

                    if (this.data[context].show) {
                        plugin.setTitle(context, currentVolume);
                    } else {
                        plugin.setTitle(context, "");
                    }
                }
            }, 1000)
        } catch (error) {
            log.error('volumedown _willAppear:', error);
        }
    },
    async keyUp({ context, payload }) {
        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }

            const newVolume = Math.max(0, (this.data[context].volume || 50));

            await spotifyApi.setVolume(newVolume);
            if (this.data[context].show) {
                plugin.setTitle(context, newVolume);
            } else {
                plugin.setTitle(context, "");
            }
        } catch (error) {
            log.error('设置音量失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) { },
    sendToPlugin({ payload, context }) { },
    _willDisappear({ context }) {
        timers[context] && clearInterval(timers[context]);
    }
});


// 静音
plugin.mute = new Actions({
    default: {
    },
    lastVolume: {},
    async _willAppear({ context, payload }) {
        try {
            timers[context] && clearInterval(timers[context]);
            timers[context] = setInterval(async () => {
                const playbackState = await getCachedPlaybackState();
                if ("retryAfter" in playbackState) {
                    plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                    return;
                }
                if (playbackState.body?.device?.volume_percent !== undefined) {
                    const currentVolume = playbackState.body.device.volume_percent;
                    if (this.data[context].show) {
                        plugin.setTitle(context, currentVolume);
                    } else {
                        plugin.setTitle(context, "");
                    }
                    // 更新状态
                    plugin.setState(context, currentVolume === 0 ? 1 : 0);
                }
            }, 1000);
        } catch (error) {
            log.error('mute _willAppear:', error);
        }
    },
    async keyUp({ context, payload }) {
        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.setTitle(context, "Need Premium");
                log.info("需要 Premium");
                return;
            }

            const playbackState = await getCachedPlaybackState();
            if ("retryAfter" in playbackState) {
                plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                return;
            }
            if (!playbackState.body?.device) {
                log.warn('无法获取播放状态');
                plugin.showAlert(context);
                return;
            }

            const currentVolume = playbackState.body.device.volume_percent;
            if (currentVolume !== undefined) {
                if (currentVolume === 0) {
                    // 当前是静音状态，恢复到上一次的音量
                    const newVolume = this.lastVolume[context] || 50;
                    await spotifyApi.setVolume(newVolume);
                    plugin.setState(context, 0);
                    if (this.data[context]?.show) {
                        plugin.setTitle(context, newVolume);
                    }
                } else {
                    // 记住当前音量并静音
                    this.lastVolume[context] = currentVolume;
                    await spotifyApi.setVolume(0);
                    plugin.setState(context, 1);
                    if (this.data[context]?.show) {
                        plugin.setTitle(context, 0);
                    }
                }
                plugin.showOk(context);
            }
        } catch (error) {
            log.error('静音操作失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.keyUp({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.keyUp({ context, payload });
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) { },
    sendToPlugin({ payload, context }) { },
    _willDisappear({ context }) {
        timers[context] && clearInterval(timers[context]);
    }
});


// 旋钮上一首下一首
plugin.previousornext = new Actions({
    default: {
    },
    lastRequestTime: 0,
    async _willAppear({ context, payload }) {
        timers[context] && clearInterval(timers[context]);

        timers[context] = setInterval(async () => {
            try {
                const playbackState = await getCachedPlaybackState();
                if ("retryAfter" in playbackState) {
                    plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                    return;
                }
                // log.info("playbackState: ", playbackState.body);
                if (playbackState.body) {
                    const { is_playing, item, progress_ms } = playbackState.body;
                    // plugin.setState(context, is_playing ? 1 : 0);

                    if (item) {
                        // 获取封面图片
                        const imageUrl = item.album.images[0]?.url;
                        if (imageUrl) {
                            if (this.data[context]?.text == undefined || this.data[context].id != item.id) {
                                let text = '';
                                switch (this.data[context].titleFormat) {
                                    case 'title':
                                        text = item.name + " ";
                                        break;
                                    case 'artist':
                                        text = item.artists[0].name + " ";
                                        break;
                                    case 'artist-title':
                                        text = `${item.artists[0].name}-${item.name}` + " ";
                                        break;
                                    case 'title-artist':
                                    default:
                                        text = `${item.name}-${item.artists[0].name}` + " ";
                                        break;
                                }
                                this.data[context].text = this.data[context].showTitle ? text : "";
                            } else {
                                this.data[context].text = this.data[context].showTitle ? getLoopText(this.data[context].text) : "";
                            }
                            this.data[context].id = item.id;
                            // log.info(this.data[context].text);
                            // log.info(imageUrl);
                            const response = await fetch(imageUrl);
                            const arrayBuffer = await response.arrayBuffer();
                            const buffer = Buffer.from(arrayBuffer);
                            const remaining_ms = item.duration_ms - progress_ms;
                            const svg = createSvg(`data:image/jpeg;base64,${buffer.toString('base64')}`, this.data[context].text, is_playing, this.data[context].timeDisplay == "elapsed" ? progress_ms : remaining_ms);

                            plugin.setImage(context, `data:image/svg+xml;charset=utf8,${svg}`);
                        }
                    }
                }
            } catch (error) {
                log.error('playpause _willAppear:', error);
            }
        }, 1000);
    },
    async dialRotate({ context, payload }) {
        try {
            const now = Date.now();
            if (now - this.lastRequestTime < 1000) {
                return;
            }
            this.lastRequestTime = now;

            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.showAlert(context);
                return;
            }

            if (payload.ticks < 0) {
                // 上一首
                await spotifyApi.skipToPrevious();
            } else {
                // 下一首
                await spotifyApi.skipToNext();
            }
            plugin.showOk(context);
        } catch (error) {
            log.error('切换歌曲失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.dialRotate({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.dialRotate({ context, payload });
            }
        }
    },
    async dialDown({ context, payload }) {
        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.showAlert(context);
                return;
            }

            const playbackState = await getCachedPlaybackState();
            if (!playbackState.body) {
                log.warn('无法获取播放状态');
                plugin.showAlert(context);
                return;
            }

            if (playbackState.body.is_playing) {
                await spotifyApi.pause();
            } else {
                await spotifyApi.play();
            }
            plugin.showOk(context);
        } catch (error) {
            log.error('播放暂停切换失败:', error);
            plugin.showAlert(context);

            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.dialDown({ context, payload });
            } else if (error.code === "ECONNRESET") {
                this.dialDown({ context, payload });
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) {
        try {
            const devices = await spotifyApi.getMyDevices();
            if (devices.body.devices) {
                plugin.sendToPropertyInspector({
                    devices: devices.body.devices
                });
            }
        } catch (error) {
            log.error('获取播放列表失败:', error);
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this._propertyInspectorDidAppear({ context });
            } else if (error.code === "ECONNRESET") {
                this._propertyInspectorDidAppear({ context });
            }
        }
    },
    sendToPlugin({ payload, context }) { },
    _willDisappear({ context }) {
        timers[context] && clearInterval(timers[context]);
    }
});

//旋钮调节音量
plugin.volumecontrol = new Actions({
    default: {
    },
    lastVolume: {},
    lastRequestTime: 0,
    async _willAppear({ context, payload }) {
        timers[context] && clearInterval(timers[context]);
        timers[context] = setInterval(async () => {
            try {
                const playbackState = await getCachedPlaybackState();
                if ("retryAfter" in playbackState) {
                    plugin.setTitle(context, "Too Many Request\nRetry After: " + secondsToHHMM(playbackState.retryAfter));
                    return;
                }
                if (playbackState.body) {
                    const { device } = playbackState.body;
                    if (device?.volume_percent !== undefined) {
                        const currentVolume = device.volume_percent;
                        // 更新状态
                        plugin.setState(context, device.volume_percent === 0 ? 1 : 0);
                        if (this.data[context].show) {
                            plugin.setTitle(context, currentVolume);
                        } else {
                            plugin.setTitle(context, "");
                        }
                    }
                }
            } catch (error) {
                log.error('volumecontrol _willAppear:', error);
            }
        }, 1000);
    },
    async dialRotate({ context, payload }) {
        try {
            const now = Date.now();
            if (now - this.lastRequestTime < 500) { // 限制为100ms一次
                return;
            }
            this.lastRequestTime = now;

            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.showAlert(context);
                return;
            }

            const playbackState = await getCachedPlaybackState();
            if (!playbackState.body?.device) {
                return;
            }

            const currentVolume = playbackState.body.device.volume_percent;
            if (currentVolume !== undefined) {
                const step = this.data[context]?.step || 10;
                const newVolume = Math.max(0, Math.min(100,
                    currentVolume + (payload.ticks < 0 ? -step : step)
                ));
                await spotifyApi.setVolume(newVolume);
            }
        } catch (error) {
            log.error('调节音量失败:', error);
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.dialRotate({ context, payload });
            }
        }
    },
    async dialDown({ context, payload }) {
        try {
            // 检查用户是否为 Premium 用户
            const me = await spotifyApi.getMe();
            if (me.body.product !== 'premium') {
                plugin.showAlert(context);
                return;
            }

            const playbackState = await getCachedPlaybackState();
            if (!playbackState.body?.device) {
                return;
            }

            const currentVolume = playbackState.body.device.volume_percent;
            if (currentVolume !== undefined) {
                if (currentVolume === 0) {
                    // 恢复音量
                    const newVolume = this.lastVolume[context] || 50;
                    await spotifyApi.setVolume(newVolume);
                    plugin.setState(context, 0);
                } else {
                    // 静音
                    this.lastVolume[context] = currentVolume;
                    await spotifyApi.setVolume(0);
                    plugin.setState(context, 1);
                }
                plugin.showOk(context);
            }
        } catch (error) {
            log.error('静音操作失败:', error);
            plugin.showAlert(context);
            if (error.statusCode === 401) {
                await refreshAccessToken();
                this.dialDown({ context, payload });
            }
        }
    },
    async _propertyInspectorDidAppear({ context }) {
    },
    sendToPlugin({ payload, context }) { },
    _willDisappear({ context }) {
        timers[context] && clearInterval(timers[context]);
    }
});

//启动服务器
startServer()

function startServer() {
    const express = require('express');
    const cors = require('cors');
    const app = express();
    app.use(cors());
    const port = 26433;

    app.get('/', async (req, res) => {
        const { code } = req.query;
        try {
            const data = await spotifyApi.authorizationCodeGrant(code);
            const { access_token, refresh_token } = data.body;

            spotifyApi.setAccessToken(access_token);
            spotifyApi.setRefreshToken(refresh_token);

            const tokenData = {
                access_token,
                refresh_token,
                client_id: spotifyApi.getClientId(),
                client_secret: spotifyApi.getClientSecret(),
                expires_in: data.body.expires_in
            };
            // log.info('授权成功:', tokenData);

            plugin.setGlobalSettings(tokenData);
            res.sendFile(__dirname + '/successful.html');
        } catch (error) {
            log.error('授权失败:', error);
            const errorMessage = encodeURIComponent(error.message || 'Unknown error occurred');
            res.redirect(`/error.html?error=${errorMessage}`);
        }
    });

    app.get('/authorization', (req, res) => {
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
        const authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'state');
        res.redirect(authorizeURL);
    });

    // 启动服务器
    // Start the server
    app.listen(port, () => {
        log.info(`Server is running at http://127.0.0.1:${port}`);
    });


    app.use((err, req, res, next) => {
        log.error('Unhandled error:', err);
        res.status(err.status || 500);
        res.send({
            message: err.message,
            error: err
        });
    });

}

// 添加令牌刷新函数
async function refreshAccessToken() {
    try {
        if (Plugins.globalSettings.access_token) {
            const data = await spotifyApi.refreshAccessToken();
            const access_token = data.body['access_token'];
            log.info('刷新令牌成功');
            if (access_token) {
                spotifyApi.setAccessToken(access_token);
                // 更新存储的令牌
                Plugins.globalSettings.access_token = access_token;
                plugin.setGlobalSettings(Plugins.globalSettings);
            }
        }
    } catch (error) {
        if (error.statusCode === 401) {
            Plugins.globalSettings = {};
            spotifyApi.setAccessToken('');
            spotifyApi.setRefreshToken('');
            plugin.setGlobalSettings({});
        } else if (error.statusCode === 400) {
            log.error('Error refreshing token:', error.body.error_description);
        } else {
            log.error('Error refreshing token:', error);
        }
    }
}
