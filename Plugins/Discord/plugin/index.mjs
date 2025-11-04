import { log } from './utils/log.mjs';
import path from 'path';
import inspector from 'inspector';
try {
  process.chdir(path.dirname());
  inspector.open(9229, '127.0.0.1', true);
  console.log('Inspector listening at:', inspector.url());
} catch (e) {
  console.error('Failed to open inspector:', e);
}
import { createJimp } from '@jimp/core';
import { loadFont, measureText, defaultFormats, defaultPlugins } from 'jimp';
import webp from '@jimp/wasm-webp';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { execSync } from 'child_process';
import { Plugins, Actions, eventEmitter } from './utils/plugin.mjs';
import RPC from 'discord-rpc';
import fs from 'fs-extra';
import crypto from 'crypto';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const Jimp = createJimp({
  formats: [...defaultFormats, webp],
  plugins: defaultPlugins,
});
function getWindowsProxy() {
  try {
    const output = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer', { encoding: 'utf8' });
    const match = output.match(/ProxyServer\s+REG_SZ\s+([^\r\n]+)/);
    if (match) {
      const proxyString = match[1].trim();
      const parts = proxyString.split(';');
      const httpProxy = parts.find((p) => p.startsWith('http=')) || parts[0];
      const cleanProxy = httpProxy.replace(/^http=/, '');
      return cleanProxy; // "127.0.0.1:7890"
    }
  } catch (err) {
    console.error('获取系统代理失败:', err.message);
  }
  return null;
}
function applyProxyToFetch(proxyAddr) {
  if (proxyAddr) {
    const agent = new ProxyAgent(`http://${proxyAddr}`);
    process.env.GLOBAL_AGENT_HTTP_PROXY = proxyAddr;
    setGlobalDispatcher(agent);
  } else {
    setGlobalDispatcher(new ProxyAgent());
    console.log('[代理已禁用] 没有检测到系统代理');
  }
}
function startAutoRefreshProxy(intervalMs = 10000) {
  function update() {
    const proxyAddr = getWindowsProxy();
    if (proxyAddr) {
      applyProxyToFetch(proxyAddr);
    }
  }
  update();
  setInterval(update, intervalMs);
}
startAutoRefreshProxy();

const SANS_32_WHITE = path.resolve(__dirname, 'font', 'open-sans-32-white.fnt');
const plugin = new Plugins('discord');

function getMd5(str) {
  const md5 = crypto.createHash('md5');
  return md5.update(str).digest('hex');
}
let client = null;
async function getImageBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}
const CACHE_DIR = path.resolve('./cache/images');
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (err) {
    console.error('创建缓存目录失败:', err);
  }
}
let LoginState = {
  logining: false,
  hasLogin: false,
  timer: 0,
  loginState: 0,
  failCount: 0,
  refreshTokenCout: 0,
  appState: false,
};
class GobalListener {
  static data = {
    mute: false,
    deaf: false,
    output: {},
    input: {},
    guilds: [],
    image: {},
    notices: {},
    soundborad: false,
    currentNotice: '',
    noticeImage: '',
    channelsUser: [],
    currentVoiceChannel: '',
  };
  static #hasEnable = [];
  static #unsubscribe = {};
  static #event = {};
  static #channelsCache = {};
  static #pending = new Map();

  static async #dedupeRun(name, fn, arg, timeoutMs = 200, jitterMs = 500) {
    const key = name + JSON.stringify(arg);
    // 已有同 key 的任务 → 复用
    if (this.#pending.has(key)) {
      return this.#pending.get(key);
    }
    const runWithTimeout = async (attempt = 1) => {
      return new Promise((resolve, reject) => {
        let finished = false;
        // 给超时加随机抖动
        const jitter = Math.floor(Math.random() * jitterMs); // 0 ~ jitterMs
        const actualTimeout = timeoutMs + jitter;
        const timer = setTimeout(() => {
          if (!finished) {
            log.warn(`[dedupeRun] ${key} 第${attempt}次执行超时 ${actualTimeout}ms → 准备重试`);
            this.#pending.delete(key); // 删除挂死缓存
            if (attempt === 1) {
              // 只重试一次
              runWithTimeout(attempt + 1)
                .then(resolve)
                .catch(reject);
            } else {
              reject(new Error(`dedupeRun ${key} 重试后仍失败`));
            }
          }
        }, actualTimeout);
        fn(...arg)
          .then((result) => {
            if (!finished) {
              finished = true;
              clearTimeout(timer);
              resolve(result);
            }
          })
          .catch((err) => {
            if (!finished) {
              finished = true;
              clearTimeout(timer);
              reject(err);
            }
          })
          .finally(() => {
            // 成功或失败都延迟1秒删除key
            setTimeout(() => {
              this.#pending.delete(key);
            }, 1000);
          });
      });
    };
    const promise = runWithTimeout();
    this.#pending.set(key, promise);
    return promise;
  }
  static async enableListener(event, data = {}) {
    return GobalListener.#dedupeRun('enableListener', GobalListener.#enableListener, [event, data]);
  }
  static async getImageAndCache(url, returnBuffer = false) {
    return GobalListener.#dedupeRun('getImageAndCache', GobalListener.#getImageAndCache, [url, returnBuffer]);
  }
  static async getSoundboardSounds(useCache = true) {
    return GobalListener.#dedupeRun(
      'getSoundboardSounds',
      async () => {
        if (!(useCache && GobalListener.data.soundborad)) {
          GobalListener.data.soundborad = await client.GET_SOUNDBOARD_SOUNDS();
        }
        return GobalListener.data.soundborad;
      },
      [],
    );
  }
  static async getChannels(guilds_id) {
    return GobalListener.#dedupeRun('getChannels', GobalListener.#getChannels, [guilds_id]);
  }
  static async getCurrentChannelsUser(res = null) {
    if (res) {
      return GobalListener.#getCurrentChannelsUser(res);
    } else {
      return GobalListener.#dedupeRun('getCurrentChannelsUser', GobalListener.#getCurrentChannelsUser, []);
    }
  }
  static async getGuilds() {
    return GobalListener.#dedupeRun('getGuilds', GobalListener.#getGuilds, []);
  }
  static async #enableListener(event, data = {}) {
    let uuid = getMd5(event + JSON.stringify(data));
    if (GobalListener.#hasEnable.includes(uuid)) {
      return;
    }
    GobalListener.#hasEnable.push(uuid);
    switch (event) {
      case 'VOICE_SETTINGS_UPDATE':
        try {
          let temp = await client.getVoiceSettings();
          Object.assign(GobalListener.data, temp);
        } catch (error) {
          log.error('getVoiceSettings failed');
        }
        client.on('VOICE_SETTINGS_UPDATE', GobalListener.VOICE_SETTINGS_UPDATE);
        GobalListener.#unsubscribe['VOICE_SETTINGS_UPDATE'] = client.subscribe('VOICE_SETTINGS_UPDATE', '');
        break;
      case 'NOTIFICATION_CREATE':
        client.on('NOTIFICATION_CREATE', GobalListener.NOTIFICATION_CREATE);
        GobalListener.#unsubscribe['NOTIFICATION_CREATE'] = client.subscribe('NOTIFICATION_CREATE', '');
        break;
      case 'VOICE_CHANNEL_SELECT':
        client.on('VOICE_CHANNEL_SELECT', GobalListener.VOICE_CHANNEL_SELECT);
        GobalListener.#unsubscribe['VOICE_CHANNEL_SELECT'] = client.subscribe('VOICE_CHANNEL_SELECT', '');
        break;
      case 'VOICE_STATE_UPDATE':
        client.on('VOICE_STATE_UPDATE', GobalListener.VOICE_STATE_UPDATE);
        GobalListener.#unsubscribe['VOICE_STATE_UPDATE'] = client.subscribe('VOICE_STATE_UPDATE', data);
        break;
    }
  }
  static async #getImageAndCache(url, returnBuffer = false) {
    await ensureCacheDir();
    const temp = getMd5(url);
    const cacheFilePath = path.join(CACHE_DIR, `${temp}.jpg`);
    let imageBuffer;
    try {
      imageBuffer = await fs.readFile(cacheFilePath);
    } catch {
      const downloadBuffer = await getImageBuffer(url);
      let image;
      image = await Jimp.fromBuffer(downloadBuffer);
      image.resize({ w: 128 });
      await image.write(cacheFilePath, { quality: 70 });
      imageBuffer = await fs.readFile(cacheFilePath);
    }
    if (returnBuffer) {
      return imageBuffer;
    } else {
      return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    }
  }
  static async getGuildImage(guilds_id) {
    let temp = await GobalListener.#dedupeRun('clientGetGuild', client.getGuild.bind(client), [guilds_id]);
    if (temp.icon_url) {
      try {
        return GobalListener.#getImageAndCache(temp.icon_url);
      } catch (error) {
        log.error(error);
        return '';
      }
    }
    return '';
  }
  static async #getGuilds() {
    let temp = await client.getGuilds();
    GobalListener.data.guilds = temp.guilds;
    return GobalListener.data.guilds;
  }
  static async #getChannels(guilds_id) {
    GobalListener.#channelsCache[guilds_id] = await client.getChannels(guilds_id);
    return GobalListener.#channelsCache[guilds_id];
  }
  static async #getCurrentChannelsUser(res = null) {
    res = res || (await client.GET_SELECTED_VOICE_CHANNEL());
    if (res == null) {
      GobalListener.data.channelsUser = [];
      GobalListener.data.currentVoiceChannel = '';
      return;
    }
    GobalListener.data.currentVoiceChannel = res.id;
    GobalListener.data.channelsUser = res.voice_states.filter((state) => {
      return !(state?.user && state.user.id === client.user.id);
    });
    return GobalListener.data.channelsUser;
  }

  static async addListener(event, fun, context, data = {}) {
    if (!GobalListener.#event.hasOwnProperty(event)) {
      GobalListener.#event[event] = {};
    }
    GobalListener.removeListener(event, context);

    GobalListener.#event[event][context] = fun;
    await GobalListener.enableListener(event, data);
  }
  static removeAll() {
    GobalListener.data = {
      mute: false,
      deaf: false,
      output: {},
      input: {},
      guilds: [],
      image: {},
      notices: {},
      currentNotice: '',
      noticeImage: '',
      channelsUser: [],
      currentVoiceChannel: '',
    };
    GobalListener.#hasEnable = [];
    GobalListener.#unsubscribe = {};
    GobalListener.#event = {};
    GobalListener.#channelsCache = {};
  }
  static removeListener(evnetName, context) {
    if (!GobalListener.#event.hasOwnProperty(evnetName)) {
      return;
    }
    if (GobalListener.#event[evnetName].hasOwnProperty(context)) {
      delete GobalListener.#event[evnetName][context];
    }
  }
  static async VOICE_CHANNEL_SELECT(data) {
    await getCurrentChannelsUser(data);
    Object.values(GobalListener.#event['VOICE_CHANNEL_SELECT']).forEach(async (fun) => await fun());
  }
  static async NOTIFICATION_CREATE(data) {
    GobalListener.data.currentNotice = data.channel_id; //记录通知通道id
    GobalListener.data.notices[data.channel_id] = GobalListener.data.notices[data.channel_id] || 0;
    GobalListener.data.notices[data.channel_id] += 1;
    if (data.icon_url) {
      if (data.icon_url.indexOf('?size=') != -1) {
        GobalListener.data.noticeImage = await GobalListener.getImageAndCache(data.icon_url, true);
      } else {
        GobalListener.data.noticeImage = await GobalListener.getImageAndCache(data.icon_url + '?size=128', true);
      }
    }

    Object.values(GobalListener.#event['NOTIFICATION_CREATE']).forEach(async (fun) => await fun());
  }
  static VOICE_SETTINGS_UPDATE(data = null) {
    if (data) {
      Object.assign(GobalListener.data, data);
    }
    Object.values(GobalListener.#event['VOICE_SETTINGS_UPDATE']).forEach(async (fun) => await fun());
  }
}
const API_ENDPOINT = 'https://discord.com/api/v10';
async function getToken(client_id, client_secret) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'identify rpc rpc.voice.read rpc.notifications.read rpc.voice.write',
  });
  const basicAuth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
  const response = await fetch(`${API_ENDPOINT}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: body,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status} - ${errorText}`);
  }
  return await response.json();
}
const getSelectChannel = async (setting, istextChannel = false) => {
  await GobalListener.getGuilds();
  let temp = { guilds: GobalListener.data.guilds, channels: [], channel: '', select: '' };
  setting.select = setting.select || GobalListener.data.guilds[0].id;
  if (GobalListener.data.guilds.some((item) => item.id == setting.select)) {
    temp.select = setting.select;
  } else {
    temp.select = GobalListener.data.guilds[0].id;
  }
  temp.selectImage = await GobalListener.getGuildImage(temp.select);
  let temp_channels = await GobalListener.getChannels(temp.select);
  if (istextChannel) {
    temp_channels = temp_channels.filter((item) => item.type == 0);
  } else {
    temp_channels = temp_channels.filter((item) => item.type == 2 || item.type == 13);
  }
  temp.channels = temp_channels;
  if (temp_channels.length == 0) {
    temp.channel = '';
    return temp;
  }
  temp.channel = setting.channel || temp_channels[0].id;
  if (!temp_channels.some((item) => item.id == temp.channel)) {
    temp.channel = temp_channels[0].id;
  }
  return temp;
};
const draw = async (count) => {
  const image = await Jimp.read('./static/icon/alert.png', { 'image/png': {} });
  const width = image.bitmap.width;
  const circleCenterX = width - 28;
  const circleCenterY = 12;
  let font = await loadFont(SANS_32_WHITE);

  await image.print({
    font,
    x: circleCenterX - measureText(font, count) / 2,
    y: circleCenterY,
    text: count,
  });
  return image.getBase64('image/jpeg', { quality: 70 });
};
const login = async () => {
  if (LoginState.hasLogin || LoginState.logining) {
    return;
  }
  LoginState.logining = true;
  if (LoginState.timer) {
    clearTimeout(LoginState.timer);
  }
  const scopes = ['rpc', 'identify', 'rpc.voice.read', 'messages.read', 'rpc.notifications.read', 'rpc.voice.write'];
  const accessToken = plugin.globalSettings.accessToken;
  const clientId = plugin.globalSettings.clientId;
  if (clientId && accessToken) {
    log.info('try login');
    try {
      client = new RPC.Client({ transport: 'ipc' });
      client.on('disconnected', () => {
        LoginState.hasLogin = false;
        LoginState.loginState = 0;
        GobalListener.removeAll();
        refreshState();
        if (!LoginState.logining) {
          clearTimeout(LoginState.timer);
          LoginState.timer = setTimeout(login, 2000);
        }

        log.info(`WebSocket 连接已关闭`);
      });
      await client.login({ clientId, accessToken, scopes }); // 等待登录完成
      LoginState.loginState = 1;
      log.info('Logged in successfully!');

      try {
        LoginState.hasLogin = true;
        LoginState.failCount = 0;
        refreshState();
        await eventEmitter.emit('Login');
      } catch (error) {
        log.error('emit error', error);
      }
    } catch (error) {
      if (error.code === 4009) {
        log.error('Error code:', error.code || error);
        // code: 4009, Token does not match current user Invalid token
        plugin.globalSettings.accessToken = '';
        LoginState.refreshTokenCout++;
        if (refreshTokenCout > 2) {
          log.error('refreshToken more than 2,clear id and secret');
          plugin.globalSettings.clientId = '';
          plugin.globalSettings.clientSecret = '';
        } else {
          log.info('try refreshToken');
          let temp = await getToken(plugin.globalSettings.clientId, plugin.globalSettings.clientSecret);
          plugin.globalSettings.accessToken = temp.access_token;
        }
        plugin.setGlobalSettings(plugin.globalSettings);
      } else {
        log.error('Login failed:', error.code || '');
      }
      client = null;
      LoginState.loginState = -1;
      LoginState.failCount++;
      refreshState();
      clearTimeout(LoginState.timer);
      LoginState.timer = setTimeout(login, 10000);
    } finally {
      LoginState.logining = false;
    }
  }
};
const refreshState = () => {
  const str = [`连接失败${LoginState.failCount}次`, '未连接', ''];
  plugin.allAction.forEach((value) => {
    plugin.setTitle(value, str[LoginState.loginState + 1]);
  });
};
eventEmitter.subscribe('willAppear', () => refreshState());
// 声音板
plugin.voiceboard = class extends Actions {
  async SOUNDBOARD_SOUNDS() {
    let res = await GobalListener.getSoundboardSounds();
    const groupedByGuild = {};
    for (const sound of res) {
      if (!groupedByGuild[sound.guild_id]) {
        groupedByGuild[sound.guild_id] = [];
      }
      if (sound.guild_id === '0') {
        sound.guild_name = 'Discord';
      } else {
        const guild = await client.getGuild(sound.guild_id);
        sound.guild_name = guild.name;
      }
      if (this.settings?.sound_id == sound.sound_id) {
        plugin.setTitle(this.context, this.settings?.title, 3, 10);
      }
      groupedByGuild[sound.guild_id].push(sound);
    }
    this.settings.sounds = groupedByGuild;
    plugin.setSettings(this.context, this.settings);
  }
  async _willAppear({ context, payload }) {
    log.info('声音板: ', context);
    if ('title' in this.settings) {
      plugin.setTitle(context, this.settings.title, 3, 10);
    }
    if (LoginState.hasLogin == true) {
      this.SOUNDBOARD_SOUNDS();
    }
    this.unsubscribe = eventEmitter.subscribe('Login', this.SOUNDBOARD_SOUNDS.bind(this));
  }
  async _willDisappear({ context }) {
    this.unsubscribe();
  }
  sendToPlugin({ context, payload }) {
    if ('refresh' in payload) {
      GobalListener.data.soundborad = false;
      this.SOUNDBOARD_SOUNDS();
    }
  }
  async keyUp({ context, payload }) {
    try {
      if ('sound_id' in payload.settings && client != null) {
        let sound = {};
        Object.keys(payload.settings.sounds).forEach((key) => {
          payload.settings.sounds[key].forEach((item) => {
            if (item.sound_id == payload.settings.sound_id) {
              sound = item;
              delete sound.guild_name;
            }
          });
        });
        client
          ?.PLAY_SOUNDBOARD_SOUND(sound)
          .then((res) => {})
          .catch((error) => {
            if (error.code == 4005 || error.code == 4018) {
              return;
            }
            log.error('PLAY_SOUNDBOARD_SOUND failed');
          });
      } else {
        log.info('not sound id or client');
      }
    } catch (error) {
      log.error(error);
    }
  }
};
// 麦克风静音
plugin.mute = class extends Actions {
  stateCallback(data = null) {
    if (GobalListener.data.mute) {
      plugin.setState(this.context, 1);
    } else {
      if (GobalListener.data.deaf) {
        plugin.setState(this.context, 1);
      } else {
        plugin.setState(this.context, 0);
      }
    }
  }

  async _willAppear({ context, payload }) {
    log.info('麦克风: ', LoginState.hasLogin);
    const MUTE = async (data) => {
      log.info('麦克风初始化');
      await GobalListener.addListener('VOICE_SETTINGS_UPDATE', this.stateCallback.bind(this), context);
      this.stateCallback.call(this);
    };
    if (LoginState.hasLogin == true) {
      MUTE();
    }
    this.unsubscribe = eventEmitter.subscribe('Login', MUTE);
  }
  _willDisappear({ context }) {
    this.unsubscribe();
    GobalListener.removeListener('VOICE_SETTINGS_UPDATE', context);
  }
  keyUp({ context }) {
    let temp = !GobalListener.data.mute;
    client?.setVoiceSettings({ mute: temp });
  }
};
// 耳机静音
plugin.deaf = class extends Actions {
  stateCallback(data = null) {
    if (GobalListener.data.deaf) {
      plugin.setState(this.context, 1);
    } else {
      plugin.setState(this.context, 0);
    }
  }
  async _willDisappear({ context }) {
    this.unsubscribe();
    GobalListener.removeListener('VOICE_SETTINGS_UPDATE', context);
  }
  async _willAppear({ context, payload }) {
    log.info('耳机: ', LoginState.hasLogin);
    const DEAF = async () => {
      log.info('耳机静音初始化');
      await GobalListener.addListener('VOICE_SETTINGS_UPDATE', this.stateCallback.bind(this), context);
      this.stateCallback.call(this);
    };
    if (LoginState.hasLogin == true) {
      DEAF();
    }
    this.unsubscribe = eventEmitter.subscribe('Login', DEAF);
  }
  keyUp({ context }) {
    //设置耳机静音或解除静音
    try {
      let temp = !GobalListener.data.deaf;
      client?.setVoiceSettings({ deaf: temp });
    } catch (error) {
      log.error(error);
    }
  }
};
// 麦克风控制
plugin.mutecontrol = class extends Actions {
  async _willAppear({ context, payload }) {
    log.info('麦克风控制: ', LoginState.hasLogin);
    const stateCallback = (data = null) => {
      if (GobalListener.data.mute) {
        plugin.setState(context, 1);
      } else {
        if (GobalListener.data.deaf) {
          plugin.setState(context, 1);
        } else {
          plugin.setState(context, 0);
        }
      }
    };
    const MUTE = async (data) => {
      log.info('麦克风控制初始化');
      await GobalListener.addListener('VOICE_SETTINGS_UPDATE', stateCallback, context);
      stateCallback();
    };
    if (LoginState.hasLogin == true) {
      MUTE();
    }
    this.unsubscribe = eventEmitter.subscribe('Login', MUTE);
  }
  async _willDisappear({ context }) {
    this.unsubscribe();
    GobalListener.removeListener('VOICE_SETTINGS_UPDATE', context);
  }
  dialRotate({ payload, context }) {
    let temp = GobalListener.data.input;
    if (temp.volume > 50) {
      temp.volume += 10 * payload.ticks;
    } else {
      temp.volume += payload.ticks;
    }
    temp.volume = Math.min(Math.max(0, temp.volume), 100);
    try {
      client?.setVoiceSettings({ input: temp });
    } catch (error) {
      log.error(error);
    }
  }
  dialUp({ context }) {
    try {
      let temp = !GobalListener.data.mute;
      client?.setVoiceSettings({ mute: temp });
    } catch (error) {
      log.error(error);
    }
  }
};
// 耳机控制
plugin.deafcontrol = new Actions({
  async _willAppear({ context, payload }) {
    log.info('耳机控制: ', LoginState.hasLogin);
    const stateCallback = (data = null) => {
      if (GobalListener.data.deaf) {
        plugin.setState(context, 1);
      } else {
        plugin.setState(context, 0);
      }
    };
    const DEAF = async () => {
      log.info('耳机控制初始化');
      await GobalListener.addListener('VOICE_SETTINGS_UPDATE', stateCallback, context);
      stateCallback();
    };
    if (LoginState.hasLogin == true) {
      DEAF();
    }
    this.unsubscribe[context] = eventEmitter.subscribe('Login', DEAF);
  },
  async _willDisappear({ context }) {
    this.unsubscribe[context]();
    GobalListener.removeListener('VOICE_SETTINGS_UPDATE', context);
  },
  dialRotate({ payload, context }) {
    let temp = GobalListener.data.output;
    if (temp.volume > 50) {
      temp.volume += 10 * payload.ticks;
    } else {
      temp.volume += payload.ticks;
    }
    temp.volume = Math.min(Math.max(0, temp.volume), 100);
    try {
      client?.setVoiceSettings({ output: temp });
    } catch (error) {
      log.error(error);
    }
  },
  dialUp({ context }) {
    //设置耳机静音或解除静音
    try {
      let temp = !GobalListener.data.deaf;
      client?.setVoiceSettings({ deaf: temp });
    } catch (error) {
      log.error(error);
    }
  },
});
// 语音通道
plugin.voicechannel = class extends Actions {
  async stateCallback() {
    const { selectImage, ...temp } = await getSelectChannel(this.settings);
    this.settings = temp;
    plugin.setSettings(this.context, temp);
    if (selectImage) {
      plugin.setImage(this.context, selectImage);
    }
    if (this.settings.channel != '') {
      const item = this.settings.channels.filter((e) => e.id == this.settings.channel);
      plugin.setTitle(this.context, item[0].name, 3, 10);
    } else {
      plugin.setTitle(this.context, '', 3, 10);
    }
  }
  async _willDisappear({ context, payload }) {
    this.unsubscribe();
  }
  async _willAppear({ context, payload }) {
    log.info('语音通道: ', context);
    const VOICECHANNEL = async () => {
      log.info('语音通道初始化');
      this.stateCallback();
    };
    if (LoginState.hasLogin) {
      VOICECHANNEL();
    }
    this.unsubscribe = eventEmitter.subscribe('Login', VOICECHANNEL);
  }
  sendToPlugin({ context, payload }) {
    if ('refresh' in payload) {
      this.stateCallback();
    }
  }
  _didReceiveSettings({ payload }) {
    if (this.settings.select != payload.settings.select) {
      this.settings = payload.settings;
      this.stateCallback.call(this);
    } else {
      this.settings = payload.settings;
    }
  }
  async keyUp({ context, payload }) {
    // log.info(payload)
    client?.GET_SELECTED_VOICE_CHANNEL().then((res) => {
      if (res && res.id == payload.settings.channel) {
        client?.selectVoiceChannel(null).then((res) => {});
        plugin.showOk(context);
      } else {
        client?.selectVoiceChannel(null).then((res) => {});
        client
          ?.selectVoiceChannel(payload.settings.channel)
          .then((res) => {
            plugin.showOk(context);
            log.info('连接语音通道：' + payload.settings.channel);
          })
          .catch((error) => {
            if (error.code == 4006) {
              plugin.showAlert(context);
            }
            log.error('getChannels failed:', error);
          });
      }
    });
  }
};
// 文本通道
plugin.textchannel = class extends Actions {
  async stateCallback() {
    const { selectImage, ...temp } = await getSelectChannel(this.settings, true);
    this.settings = temp;
    plugin.setSettings(this.context, temp);
    if (selectImage) {
      plugin.setImage(this.context, selectImage);
    }
    if (this.settings.channel != '') {
      const item = this.settings.channels.filter((e) => e.id == this.settings.channel);
      plugin.setTitle(this.context, item[0].name, 3, 10);
    } else {
      plugin.setTitle(this.context, '', 3, 10);
    }
  }
  sendToPlugin({ context, payload }) {
    if ('refresh' in payload) {
      this.stateCallback();
    }
  }
  async _willAppear({ context, payload }) {
    log.info('文本通道: ', context);
    const TEXTCHANNEL = async () => {
      log.info('文本通道初始化');
      this.stateCallback();
    };
    if (LoginState.hasLogin) {
      TEXTCHANNEL();
    }
    this.unsubscribe = eventEmitter.subscribe('Login', TEXTCHANNEL);
  }
  async _willDisappear({ context }) {
    this.unsubscribe();
  }
  _didReceiveSettings({ payload }) {
    if (this.settings.select != payload.settings.select) {
      this.settings = payload.settings;
      this.stateCallback.call(this);
    } else {
      this.settings = payload.settings;
    }
  }
  keyUp({ context, payload }) {
    client
      ?.selectTextChannel(payload.settings.channel)
      .then((res) => {
        log.info('连接文本通道：' + payload.settings.channel);
      })
      .catch((error) => {
        log.error('getVoiceSettings failed:', error);
      });
  }
};
// 获取通知
plugin.notice = new Actions({
  async _willAppear({ context, payload }) {
    log.info('获取通知: ', context);
    const stateCallback = async () => {
      const sum = Object.values(GobalListener.data.notices).reduce((acc, val) => acc + val, 0);
      if (GobalListener.data.noticeImage == null) {
        plugin.setImage(context, await draw(sum.toString()));
        return;
      }
      const image = await Jimp.fromBuffer(GobalListener.data.noticeImage);
      image.resize({ w: 128 });
      const width = 128;
      const height = 128;
      const frameRate = 20; // FPS
      const frameDelay = 1000 / frameRate;
      const amplitudeTranslate = 6; // 最大水平偏移像素
      const freq = 6; // Hz, 一秒内振动次数
      let frameIndex = 0;
      const duration = 1500;
      const startTime = Date.now();
      let that = this;
      if (this.timer) {
        clearInterval(this.timer);
      }
      const timer = setInterval(async () => {
        const t = frameIndex / frameRate; // 当前秒数
        const sinValue = Math.sin(t * 2 * Math.PI * freq);
        const offsetX = Math.round(sinValue * amplitudeTranslate);
        const blank = new Jimp({ width: width, height: height, color: 0x00000000 }); // 避免不透明背景
        await blank.composite(image, offsetX, 0);
        const base64String = await blank.getBase64('image/jpeg', { quality: 70 });
        plugin.setImage(context, base64String);
        frameIndex++;
        if (Date.now() - startTime >= duration) {
          clearInterval(timer);
          that.timer = 0;
          plugin.setImage(context, await draw(sum.toString()));
        }
      }, frameDelay);
    };
    const NOTICE = async () => {
      log.info('获取通知初始化');
      await GobalListener.addListener('NOTIFICATION_CREATE', stateCallback, context);
    };
    if (LoginState.hasLogin) {
      NOTICE();
    }
    this.unsubscribe[context] = eventEmitter.subscribe('Login', NOTICE.bind(this));
  },
  async _willDisappear({ context }) {
    this.unsubscribe[context]();
    GobalListener.removeListener('NOTIFICATION_CREATE', context);
  },
  async keyUp({ context, payload }) {
    if (GobalListener.data.currentNotice == '') {
      return;
    }
    try {
      await client.selectTextChannel(GobalListener.data.currentNotice);
      GobalListener.data.notices = {};
      plugin.setImage(context, await draw('0'));
    } catch (error) {
      log.error('selectTextChannel failed:', error);
    }
  },
});
// 用户音量控制
plugin.userVolumeControl = new Actions({
  async VOLUME(context) {
    if (LoginState.hasLogin == false) {
      return;
    }
    let temp = await GobalListener.getCurrentChannelsUser();
    this.data[context].voice_states = temp;
    plugin.setSettings(context, this.data[context]);
    if (!temp || temp.length == 0) {
      plugin.setTitle(context, '', 3, 10);
      return;
    }

    if (temp[0].user == undefined) {
      return;
    }
    let selectUserID = this.data[context]?.user;
    const elementExists = temp.filter((state) => {
      return state.user.id == selectUserID;
    });
    this.currentUser[context] = selectUserID;
    if (elementExists.length == 0) {
      //没有选中的用户或者选中的用户不在了
      plugin.setTitle(context, '用户不在频道中', 3, 10);
    } else {
      let test = elementExists[0]?.user?.global_name || elementExists[0]?.user?.username;
      plugin.setTitle(context, test, 3, 6);
      let temp1 = await client.getImage(elementExists[0]?.user?.id);
      plugin.setImage(context, temp1.data_url);
    }
  },
  async _willAppear({ context, payload }) {
    log.info('用户音量控制: ', context);
    this.currentUser = {};
    if (LoginState.hasLogin) {
      this.VOLUME(context);
    }

    eventEmitter.subscribe('Login', this.VOLUME.bind(this, context));
  },
  async _didReceiveSettings({ payload, context }) {
    if (this.currentUser[context] != payload.settings.user) {
      let temp = this.data[context].voice_states.filter((item) => item.user.id == payload.settings.user)[0].user;
      this.currentUser[context] = payload.settings.user;
      let title = temp.global_name || temp.username;
      plugin.setTitle(context, title, 3, 6);
      let temp1 = await client.getImage(temp.id);
      plugin.setImage(context, temp1.data_url);
    }
  },
  _propertyInspectorDidAppear({ payload, context }) {
    this.VOLUME(context);
  },
  keyUp({ context, payload }) {
    try {
      if (Object.keys(this.data[context]).length === 0) {
        return;
      } else {
        let temp = this.data[context].user;
        const voice_state = this.data[context].voice_states.filter((item) => {
          return item.user.id == temp;
        })[0];
        if (this.data[context].mode == 'mute') {
          if (this.data[context].type == 'unmute') {
            voice_state.mute = false;
          } else if (this.data[context].type == 'mute') {
            voice_state.mute = true;
          } else {
            voice_state.mute = !voice_state.mute;
          }
        } else if (this.data[context].mode == 'set') {
          voice_state.volume = parseInt(this.data[context].volume);
        } else {
          voice_state.volume += (parseInt(this.data[context].adjustment ? this.data[context].adjustment : 0) / 100) * voice_state.volume;
          if (voice_state.volume > 200) {
            voice_state.volume = 200;
          } else if (voice_state.volume < 0) {
            voice_state.volume = 0;
          }
        }
        let userVoiceSettings = {
          id: this.data[context].user,
          pan: voice_state.pan,
          volume: voice_state.volume,
          mute: voice_state.mute,
        };
        client
          ?.setUserVoiceSettings(this.data[context].user, userVoiceSettings)
          .then((res) => {
            const index = this.data[context].voice_states.findIndex((item) => item.user.id === this.data[context].user);
            this.data[context].voice_states[index].mute = voice_state.mute;
            this.data[context].voice_states[index].volume = voice_state.volume;
          })
          .catch((error) => {
            log.error('setUserVoiceSettings failed:', error);
          });
      }
    } catch (error) {
      log.error(error);
    }
  },
});
// 音量控制
plugin.volumeControl = new Actions({
  async _willAppear({ context, payload }) {
    log.info('音量控制: ', LoginState.hasLogin);
  },
  keyUp({ context, payload }) {
    if (payload.settings.rdio && payload.settings.slider) {
      res = {};
      res[payload.settings.rdio].volume = parseInt(payload.settings.slider);
      client?.setVoiceSettings(res);
    }
  },
});
// 设置音频设备
plugin.setDevices = new Actions({
  async _willAppear({ context, payload }) {
    log.info('设置音频设备: ', context);
    const stateCallback = (data) => {
      let settings = {};
      settings.inputDevices = GobalListener.data.input?.availableDevices || GobalListener.data.input?.available_devices;
      settings.outputDevices = GobalListener.data.output?.availableDevices || GobalListener.data.output?.available_devices;
      plugin.setSettings(context, settings);
    };
    const SETDEVICES = async () => {
      log.info('设置音频设备初始化');
      await GobalListener.addListener('VOICE_SETTINGS_UPDATE', stateCallback, context);
      stateCallback();
    };
    if (LoginState.hasLogin == true) {
      SETDEVICES();
    }
    eventEmitter.subscribe('Login', SETDEVICES);
  },
  async keyUp({ context, payload }) {
    let res = {};
    if (payload.settings.mode == 'input') {
      res.input = {};
      res.input.device = payload.settings.input;
    } else if (payload.settings.mode == 'output') {
      res.output = {};
      res.output.device = payload.settings.output;
    } else {
      res.output = {};
      res.input = {};
      res.input.device = payload.settings.input;
      res.output.device = payload.settings.output;
    }
    client?.setVoiceSettings(res);
  },
});

// function startServer() {
//   const express = require('express');
//   const cors = require('cors');
//   let id = '';

//   const app = express();
//   app.use(cors());
//   const port = 26432;

//   app.get('/', async (req, res) => {
//     log.info('callback');
//     res.sendFile(__dirname + '/callback.html');
//   });

//   //跳转授权
//   //Jump authorization
//   app.get('/authorization', async (req, res) => {
//     // log.info(req.query)
//     id = req.query.clientId;
//     client = new RPC.Client({ transport: 'ipc' });
//     await client.connect(id);
//     let test = await client.authorize();
//     // let temp = await client.NETWORKING_CREATE_TOKEN();
//     // let test = await client.DEEP_LINK({
//     //   type: 'OAUTH2',
//     //   params: {
//     //     search: `client_id=${id}&response_type=token&scope=identify+rpc+rpc.voice.read+rpc.notifications.read+messages.read+rpc.voice.write`,
//     //   },
//     // });
//     log.info(test);
//     // res.redirect(`https://discord.com/oauth2/authorize?client_id=${id}&response_type=token&scope=identify+rpc+rpc.voice.read+messages.read+rpc.notifications.read+rpc.voice.write`)
//   });

//   // 启动服务器
//   // Start the server
//   app.listen(port, () => {
//     log.info(`Server is running at http://127.0.0.1:${port}`);
//   });

//   // 添加接收数据的路由处理器
//   // Add a route handler to receive data
//   app.post('/data', (req, res) => {
//     let data = '';
//     // 接收请求数据
//     // Receiving request data
//     req.on('data', (chunk) => {
//       data += chunk;
//     });

//     req.on('end', async () => {
//       // 在这里可以对接收到的数据进行处理
//       // Here you can process the received data
//       const parsedData = JSON.parse(data);

//       let temp = parsedData;
//       temp.clientId = id;
//       LoginState.clientId = id;
//       LoginState.accessToken = parsedData.access_token;
//       plugin.setGlobalSettings({ hasToken: true });
//       // 将数据存储到文件
//       // Store data in a file
//       const filePath = './data/globalData.json'; // 路径 path
//       try {
//         await fs.outputJson(filePath, temp);
//         login();
//       } catch (err) {
//         log.error('output json error');
//       }
//     });
//     res.json({ msg: '完成' });
//   });

//   app.get('/logout', async (req, res) => {
//     log.info('logout');
//     const filePath = './data/globalData.json'; // 路径 path
//     try {
//       client = null;
//       await fs.outputJson(filePath, {});
//       LoginState.clientId = '';
//       LoginState.accessToken = '';
//       LoginState.hasLogin = false;
//       plugin.setGlobalSettings({ hasToken: false });
//     } catch (err) {
//       log.error(log);
//     }
//     res.sendFile(__dirname + '/successful.html');
//   });

//   app.use((err, req, res, next) => {
//     log.error('Unhandled error:', err);
//     res.status(err.status || 500);
//     res.send({
//       message: err.message,
//       error: err,
//     });
//   });
// }
//启动服务器
//Start the server
// startServer();
plugin.didReceiveGlobalSettings = async (data) => {
  client = null;
  LoginState.hasLogin = false;
  LoginState.failCount = 0;
  if (plugin.globalSettings.clientId && plugin.globalSettings.clientSecret) {
    if (!plugin.globalSettings.accessToken) {
      let temp = await getToken(plugin.globalSettings.clientId, plugin.globalSettings.clientSecret);
      plugin.globalSettings.accessToken = temp.access_token;
      plugin.setGlobalSettings(plugin.globalSettings);
    }

    if (LoginState.appState == true) {
      clearTimeout(LoginState.timer);
      login();
    }
  }
};
plugin.applicationDidLaunch = async (data) => {
  log.info('app run');
  LoginState.appState = true;

  if (plugin.globalSettings?.accessToken && plugin.globalSettings?.clientId) {
    clearTimeout(LoginState.timer);
    LoginState.timer = setTimeout(login, 5000);
  }
};
plugin.applicationDidTerminate = () => {
  LoginState.appState = false;
  if (LoginState.timer) {
    clearTimeout(LoginState.timer);
  }
};
