import { log } from './utils/log.mjs';
import { getMd5 } from './utils/utils.mjs';
import { getImageBuffer } from './utils/utils.mjs';
import { createJimp } from '@jimp/core';
import { defaultFormats, defaultPlugins } from 'jimp';
import state from './GlobalVar.mjs';
import webp from '@jimp/wasm-webp';
import fs from 'fs-extra';
import path from 'path';
const CACHE_DIR = path.resolve('./cache/images');
const Jimp = createJimp({
  formats: [...defaultFormats, webp],
  plugins: defaultPlugins,
});
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (err) {
    log.error('创建缓存目录失败:', err);
  }
}
export default class GlobalListener {
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
  static #hasEnable = new Set();
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
    return GlobalListener.#dedupeRun('enableListener', GlobalListener.#enableListener, [event, data]);
  }
  static async getImageAndCache(url, returnBuffer = false) {
    return GlobalListener.#dedupeRun('getImageAndCache', GlobalListener.#getImageAndCache, [url, returnBuffer]);
  }
  static async getSoundboardSounds(useCache = true) {
    return GlobalListener.#dedupeRun(
      'getSoundboardSounds',
      async () => {
        if (!(useCache && GlobalListener.data.soundborad)) {
          GlobalListener.data.soundborad = await state.client.GET_SOUNDBOARD_SOUNDS();
        }
        return GlobalListener.data.soundborad;
      },
      [],
    );
  }
  static async getChannels(guilds_id) {
    return GlobalListener.#dedupeRun('getChannels', GlobalListener.#getChannels, [guilds_id]);
  }
  static async getCurrentChannelsUser(res = null) {
    if (res) {
      return GlobalListener.#getCurrentChannelsUser(res);
    } else {
      return GlobalListener.#dedupeRun('getCurrentChannelsUser', GlobalListener.#getCurrentChannelsUser, []);
    }
  }
  static async getGuilds() {
    return GlobalListener.#dedupeRun('getGuilds', GlobalListener.#getGuilds, []);
  }
  static async #enableListener(event, data = {}) {
    let uuid = getMd5(event + JSON.stringify(data));
    if (GlobalListener.#hasEnable.has(uuid)) {
      return;
    }
    GlobalListener.#hasEnable.add(uuid);
    switch (event) {
      case 'VOICE_SETTINGS_UPDATE':
        try {
          let temp = await state.client.getVoiceSettings();
          Object.assign(GlobalListener.data, temp);
        } catch (error) {
          log.error('getVoiceSettings failed');
        }
        state.client.on('VOICE_SETTINGS_UPDATE', GlobalListener.VOICE_SETTINGS_UPDATE);
        GlobalListener.#unsubscribe['VOICE_SETTINGS_UPDATE'] = await state.client.subscribe('VOICE_SETTINGS_UPDATE', '');
        GlobalListener.#unsubscribe['VOICE_SETTINGS_UPDATE']['uuid'] = uuid;
        break;
      case 'NOTIFICATION_CREATE':
        state.client.on('NOTIFICATION_CREATE', GlobalListener.NOTIFICATION_CREATE);
        GlobalListener.#unsubscribe['NOTIFICATION_CREATE'] = await state.client.subscribe('NOTIFICATION_CREATE', '');
        GlobalListener.#unsubscribe['NOTIFICATION_CREATE']['uuid'] = uuid;
        break;
      case 'VOICE_STATE_CHANGE':
        state.client.on('VOICE_CHANNEL_SELECT', GlobalListener.VOICE_CHANNEL_SELECT);
        GlobalListener.#unsubscribe['VOICE_CHANNEL_SELECT'] = await state.client.subscribe('VOICE_CHANNEL_SELECT', '');
        GlobalListener.#unsubscribe['VOICE_CHANNEL_SELECT']['uuid'] = uuid;
        await GlobalListener.#getCurrentChannelsUser(null, true);
        break;
      case 'VOICE_STATE_UPDATE':
        state.client.on('VOICE_STATE_UPDATE', GlobalListener.VOICE_STATE_UPDATE);
        GlobalListener.#unsubscribe['VOICE_STATE_UPDATE'] = await state.client.subscribe('VOICE_STATE_UPDATE', data);
        GlobalListener.#unsubscribe['VOICE_STATE_UPDATE']['uuid'] = uuid;
        break;
      case 'VOICE_STATE_DELETE':
        state.client.on('VOICE_STATE_DELETE', GlobalListener.VOICE_STATE_DELETE);
        GlobalListener.#unsubscribe['VOICE_STATE_DELETE'] = await state.client.subscribe('VOICE_STATE_DELETE', data);
        GlobalListener.#unsubscribe['VOICE_STATE_DELETE']['uuid'] = uuid;
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
      if (downloadBuffer == null) {
        return null;
      }
      let image;
      try {
        image = await Jimp.fromBuffer(downloadBuffer);
        image.resize({ w: 128 });
      } catch (err) {
        log.error('读取图片失败，使用黑色背景替代:', err);
        image = new Jimp({ width: 128, height: 128, color: 0xffffffff }); // ARGB格式，黑色+不透明
      }

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
    let temp = await GlobalListener.#dedupeRun('state.clientGetGuild', state.client.getGuild.bind(state.client), [guilds_id]);
    if (temp.icon_url) {
      try {
        return GlobalListener.#getImageAndCache(temp.icon_url);
      } catch (error) {
        log.error(error);
        return '';
      }
    }
    return '';
  }
  static async #getGuilds() {
    let temp = await state.client.getGuilds();
    GlobalListener.data.guilds = temp.guilds;
    return GlobalListener.data.guilds;
  }
  static async #getChannels(guilds_id) {
    GlobalListener.#channelsCache[guilds_id] = await state.client.getChannels(guilds_id);
    return GlobalListener.#channelsCache[guilds_id];
  }
  static async #getCurrentChannelsUser(res = null, shouldSub = false) {
    res = res || (await state.client.GET_SELECTED_VOICE_CHANNEL());
    if (res == null) {
      GlobalListener.data.channelsUser = [];
      GlobalListener.data.currentVoiceChannel = '';
      return;
    }

    GlobalListener.data.currentVoiceChannel = res.channel_id || res.id;
    if (shouldSub) {
      if ('VOICE_STATE_UPDATE' in GlobalListener.#unsubscribe) {
        delete GlobalListener.#hasEnable.delete(GlobalListener.#unsubscribe['VOICE_STATE_UPDATE']['uuid']);
      }
      if (GlobalListener.data.currentVoiceChannel) {
        await GlobalListener.enableListener('VOICE_STATE_DELETE', { channel_id: GlobalListener.data.currentVoiceChannel });
        await GlobalListener.enableListener('VOICE_STATE_UPDATE', { channel_id: GlobalListener.data.currentVoiceChannel });
      }
    }
    if (res.voice_states) {
      GlobalListener.data.channelsUser = res.voice_states.filter((this_state) => {
        return !(this_state?.user && this_state.user.id === state.client.user.id);
      });
      return GlobalListener.data.channelsUser;
    } else {
      GlobalListener.data.channelsUser = [];
      return [];
    }
  }
  static async unsubscribe(unsubevnet) {
    if (unsubevnet in GlobalListener.#unsubscribe) {
      GlobalListener.#unsubscribe[unsubevnet]['unsubscribe']();
      delete GlobalListener.#hasEnable.delete(GlobalListener.#unsubscribe[unsubevnet]['uuid']);
    }
  }
  static async addListener(event, fun, context, data = {}) {
    if (!GlobalListener.#event.hasOwnProperty(event)) {
      GlobalListener.#event[event] = {};
    }
    GlobalListener.removeListener(event, context);

    GlobalListener.#event[event][context] = fun;
    await GlobalListener.enableListener(event, data);
  }
  static removeAll() {
    GlobalListener.data = {
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
    GlobalListener.#hasEnable = new Set();
    GlobalListener.#unsubscribe = {};
    GlobalListener.#event = {};
    GlobalListener.#channelsCache = {};
  }
  static removeListener(evnetName, context) {
    if (!GlobalListener.#event.hasOwnProperty(evnetName)) {
      return;
    }
    if (GlobalListener.#event[evnetName].hasOwnProperty(context)) {
      delete GlobalListener.#event[evnetName][context];
    }
  }
  static async VOICE_STATE_UPDATE(data) {
    if (data.user.id == state.client.user.id) {
      return;
    }
    const index = GlobalListener.data.channelsUser.findIndex((item) => item.user.id === data.user.id);
    if (index == -1) {
      GlobalListener.data.channelsUser.push(data);
    } else {
      GlobalListener.data.channelsUser[index] = data;
      return;
    }
    if (GlobalListener.#event['VOICE_STATE_UPDATE']) {
      Object.values(GlobalListener.#event['VOICE_STATE_UPDATE']).forEach(async (fun) => await fun());
    }
    Object.values(GlobalListener.#event['VOICE_STATE_CHANGE']).forEach(async (fun) => await fun('UPDATE'));
  }
  static async VOICE_STATE_DELETE(data) {
    if (data.user.id == state.client.user.id) {
      return;
    }
    const index = GlobalListener.data.channelsUser.findIndex((item) => item.user.id === data.user.id);
    if (index !== -1) {
      GlobalListener.data.channelsUser.splice(index, 1);
    }
    if (GlobalListener.#event['VOICE_STATE_DELETE']) {
      Object.values(GlobalListener.#event['VOICE_STATE_DELETE']).forEach(async (fun) => await fun());
    }
    Object.values(GlobalListener.#event['VOICE_STATE_CHANGE']).forEach(async (fun) => await fun('DELETE'));
  }
  static async VOICE_CHANNEL_SELECT(data) {
    await GlobalListener.#getCurrentChannelsUser(data, true);
    if (GlobalListener.#event['VOICE_STATE_CHANGE']) {
      Object.values(GlobalListener.#event['VOICE_STATE_CHANGE']).forEach(async (fun) => await fun('SELECT'));
    }
  }
  static async NOTIFICATION_CREATE(data) {
    GlobalListener.data.currentNotice = data.channel_id; //记录通知通道id
    GlobalListener.data.notices[data.channel_id] = GlobalListener.data.notices[data.channel_id] || 0;
    GlobalListener.data.notices[data.channel_id] += 1;
    if (data.icon_url) {
      if (data.icon_url.indexOf('?size=') != -1) {
        GlobalListener.data.noticeImage = await GlobalListener.getImageAndCache(data.icon_url, true);
      } else {
        GlobalListener.data.noticeImage = await GlobalListener.getImageAndCache(data.icon_url + '?size=128', true);
      }
    }

    Object.values(GlobalListener.#event['NOTIFICATION_CREATE']).forEach(async (fun) => await fun());
  }
  static VOICE_SETTINGS_UPDATE(data = null) {
    if (data) {
      Object.assign(GlobalListener.data, data);
    }
    Object.values(GlobalListener.#event['VOICE_SETTINGS_UPDATE']).forEach(async (fun) => await fun());
  }
}
