import { log } from "./utils/log.mjs";
import path from "path";
import os from "os";
import { useI18nStore } from "../i18n.mjs";
import { fileURLToPath } from "node:url";
import { createJimp } from "@jimp/core";
import { Plugins, Actions, eventEmitter } from "./utils/plugin.mjs";
import { loadFont, measureText, defaultFormats, defaultPlugins } from "jimp";
import { refreshToken, setLoginStateCallback, initLogin, startLoginTimer } from "./Login.mjs";
import GlobalListener from "./GlobalListener.mjs";
import startAutoRefreshProxy from "./ProxyGetter.mjs";
import webp from "@jimp/wasm-webp";
import state from "./GlobalVar.mjs";
import { adjustOutputVolume, transformInverse } from "./utils/utils.mjs";
import { execSync } from "child_process";
let currentMsg = "";
const i18n = useI18nStore();
startAutoRefreshProxy();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const Jimp = createJimp({
    formats: [...defaultFormats, webp],
    plugins: defaultPlugins,
});
const SANS_32_WHITE = path.resolve(__dirname, "font", "open-sans-32-white.fnt");
const plugin = new Plugins();
state.plugin = plugin;
eventEmitter.subscribe("willAppear", (context) => refreshState(context));
const getSelectChannel = async (setting, istextChannel = false) => {
    await GlobalListener.getGuilds();
    let temp = { guilds: GlobalListener.data.guilds, channels: [], channel: "", select: "" };
    setting.select = setting.select || GlobalListener.data.guilds[0].id;
    if (GlobalListener.data.guilds.some((item) => item.id == setting.select)) {
        temp.select = setting.select;
    } else {
        temp.select = GlobalListener.data.guilds[0].id;
    }
    temp.selectImage = await GlobalListener.getGuildImage(temp.select);
    let temp_channels = await GlobalListener.getChannels(temp.select);
    if (istextChannel) {
        temp_channels = temp_channels.filter((item) => item.type == 0);
    } else {
        temp_channels = temp_channels.filter((item) => item.type == 2 || item.type == 13);
    }
    temp.channels = temp_channels;
    if (temp_channels.length == 0) {
        temp.channel = "";
        return temp;
    }
    temp.channel = setting.channel || temp_channels[0].id;
    if (!temp_channels.some((item) => item.id == temp.channel)) {
        temp.channel = temp_channels[0].id;
    }
    return temp;
};
const draw = async (count) => {
    const image = await Jimp.read("./static/icon/alert.png", { "image/png": {} });
    const width = image.bitmap.width;
    const circleCenterX = width - 28;
    const circleCenterY = 12;
    let font = await loadFont(SANS_32_WHITE);
    image.print({
        font,
        x: circleCenterX - measureText(font, count) / 2,
        y: circleCenterY,
        text: count,
    });
    return image.getBase64("image/jpeg", { quality: 70 });
};
const refreshState = (context = null) => {
    const loginstr = [i18n["connectionfailed{0}time"].replaceAll("{0}", state.LoginState.failCount), i18n["unconnected"], ""];
    let tempstr = loginstr[state.LoginState.loginState + 1];
    if (state.LoginState.failCount > 3) {
        tempstr = "Please try\nrestart\nDiscord";
    }
    if (context == null) {
        plugin.allAction.forEach((value) => {
            plugin.setTitle(value, tempstr);
        });
    } else {
        plugin.setTitle(context, tempstr);
    }
};

// 声音板
plugin.voiceboard = class extends Actions {
    async SOUNDBOARD_SOUNDS() {
        let res = await GlobalListener.getSoundboardSounds();
        const groupedByGuild = {};
        for (const sound of res) {
            if (!groupedByGuild[sound.guild_id]) {
                groupedByGuild[sound.guild_id] = [];
            }
            if (sound.guild_id === "0") {
                sound.guild_name = "Discord";
            } else {
                const guild = await state.client.getGuild(sound.guild_id);
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
        log.info("声音板: ", context);
        if ("title" in this.settings) {
            plugin.setTitle(context, this.settings.title, 3, 10);
        }
        if (state.LoginState.hasLogin == true) {
            this.SOUNDBOARD_SOUNDS();
        }
        this.unsubscribe = eventEmitter.subscribe("Login", this.SOUNDBOARD_SOUNDS.bind(this));
    }
    _didReceiveSettings({ context, payload }) {
        this.settings = payload.settings;
        plugin.setTitle(context, this.settings.title, 3, 10);
    }
    async _willDisappear({ context }) {
        this.unsubscribe();
    }
    sendToPlugin({ context, payload }) {
        if ("refresh" in payload) {
            GlobalListener.data.soundborad = false;
            this.SOUNDBOARD_SOUNDS();
        }
    }
    async keyUp({ context, payload }) {
        try {
            if ("sound_id" in payload.settings && state.client != null) {
                let sound = {};
                Object.keys(payload.settings.sounds).forEach((key) => {
                    payload.settings.sounds[key].forEach((item) => {
                        if (item.sound_id == payload.settings.sound_id) {
                            sound = item;
                            delete sound.guild_name;
                        }
                    });
                });
                state.client
                    ?.PLAY_SOUNDBOARD_SOUND(sound)
                    .then((res) => {})
                    .catch((error) => {
                        if (error.code == 4005 || error.code == 4018) {
                            return;
                        }
                        log.error("PLAY_SOUNDBOARD_SOUND failed");
                    });
            } else {
                log.info("not sound id or state.client");
            }
        } catch (error) {
            log.error(error);
        }
    }
};
// 麦克风静音
plugin.mute = class extends Actions {
    stateCallback(data = null) {
        if (GlobalListener.data.mute) {
            plugin.setState(this.context, 1);
        } else {
            if (GlobalListener.data.deaf) {
                plugin.setState(this.context, 1);
            } else {
                plugin.setState(this.context, 0);
            }
        }
    }

    async _willAppear({ context, payload }) {
        log.info("麦克风: ", state.LoginState.hasLogin);
        const MUTE = async (data) => {
            log.info("麦克风初始化");
            await GlobalListener.addListener("VOICE_SETTINGS_UPDATE", this.stateCallback.bind(this), context);
            this.stateCallback.call(this);
        };
        if (state.LoginState.hasLogin == true) {
            MUTE();
        }
        this.unsubscribe = eventEmitter.subscribe("Login", MUTE);
    }
    _willDisappear({ context }) {
        this.unsubscribe();
        GlobalListener.removeListener("VOICE_SETTINGS_UPDATE", context);
    }
    keyUp({ context }) {
        GlobalListener.data.mute = !GlobalListener.data.mute;
        state.client?.setVoiceSettings({ mute: GlobalListener.data.mute });
        if (GlobalListener.data.mute) {
            plugin.setState(this.context, 1);
        } else {
            if (GlobalListener.data.deaf) {
                plugin.setState(this.context, 1);
            } else {
                plugin.setState(this.context, 0);
            }
        }
    }
};
// 耳机静音
plugin.deaf = class extends Actions {
    stateCallback(data = null) {
        if (GlobalListener.data.deaf) {
            plugin.setState(this.context, 1);
        } else {
            plugin.setState(this.context, 0);
        }
    }
    async _willDisappear({ context }) {
        this.unsubscribe();
        GlobalListener.removeListener("VOICE_SETTINGS_UPDATE", context);
    }
    async _willAppear({ context, payload }) {
        log.info("耳机: ", state.LoginState.hasLogin);
        const DEAF = async () => {
            log.info("耳机静音初始化");
            await GlobalListener.addListener("VOICE_SETTINGS_UPDATE", this.stateCallback.bind(this), context);
            this.stateCallback.call(this);
        };
        if (state.LoginState.hasLogin == true) {
            DEAF();
        }
        this.unsubscribe = eventEmitter.subscribe("Login", DEAF);
    }
    keyUp({ context }) {
        //设置耳机静音或解除静音
        try {
            GlobalListener.data.deaf = !GlobalListener.data.deaf;
            state.client?.setVoiceSettings({ deaf: GlobalListener.data.deaf });
            if (GlobalListener.data.deaf) {
                plugin.setState(this.context, 1);
            } else {
                plugin.setState(this.context, 0);
            }
        } catch (error) {
            log.error(error);
        }
    }
};
// 麦克风控制
plugin.mutecontrol = class extends Actions {
    async _willAppear({ context, payload }) {
        log.info("麦克风控制: ", state.LoginState.hasLogin);
        const stateCallback = (data = null) => {
            if (GlobalListener.data.mute) {
                plugin.setState(context, 1);
            } else {
                if (GlobalListener.data.deaf) {
                    plugin.setState(context, 1);
                } else {
                    plugin.setState(context, 0);
                }
            }
            let temp = GlobalListener.data.input;
            plugin.setTitle(context, `${Math.round(transformInverse(temp.volume))}%`);
        };
        const MUTE = async (data) => {
            log.info("麦克风控制初始化");
            await GlobalListener.addListener("VOICE_SETTINGS_UPDATE", stateCallback, context);
            stateCallback();
        };
        if (state.LoginState.hasLogin == true) {
            MUTE();
        }
        this.unsubscribe = eventEmitter.subscribe("Login", MUTE);
    }
    async _willDisappear({ context }) {
        this.unsubscribe();
        GlobalListener.removeListener("VOICE_SETTINGS_UPDATE", context);
    }
    dialRotate({ payload, context }) {
        let temp = GlobalListener.data.input;
        let send = { volume: adjustOutputVolume(temp.volume, 5 * payload.ticks) };
        if (send.volume > 100) {
            send.volume = 100;
        }
        plugin.setTitle(context, `${Math.round(transformInverse(send.volume))}%`);
        try {
            state.client?.setVoiceSettings({ input: send });
        } catch (error) {
            log.error(error);
        }
    }
    dialDown({ context }) {
        try {
            let temp = !GlobalListener.data.mute;
            state.client?.setVoiceSettings({ mute: temp });
        } catch (error) {
            log.error(error);
        }
    }
};
// 耳机控制
plugin.deafcontrol = new Actions({
    async _willAppear({ context, payload }) {
        log.info("耳机控制: ", state.LoginState.hasLogin);
        const stateCallback = (data = null) => {
            if (GlobalListener.data.deaf) {
                plugin.setState(context, 1);
            } else {
                plugin.setState(context, 0);
            }
            let temp = GlobalListener.data.output;
            plugin.setTitle(context, `${Math.round(transformInverse(temp.volume))}%`);
        };
        const DEAF = async () => {
            log.info("耳机控制初始化");
            await GlobalListener.addListener("VOICE_SETTINGS_UPDATE", stateCallback, context);
            stateCallback();
        };
        if (state.LoginState.hasLogin == true) {
            DEAF();
        }
        this.unsubscribe[context] = eventEmitter.subscribe("Login", DEAF);
    },
    async _willDisappear({ context }) {
        this.unsubscribe[context]();
        GlobalListener.removeListener("VOICE_SETTINGS_UPDATE", context);
    },
    dialRotate({ payload, context }) {
        let temp = GlobalListener.data.output;
        let send = { volume: adjustOutputVolume(temp.volume, 5 * payload.ticks) };
        plugin.setTitle(context, `${Math.round(transformInverse(send.volume))}%`);
        try {
            state.client?.setVoiceSettings({ output: send });
        } catch (error) {
            log.error(error);
        }
    },
    dialDown({ context }) {
        //设置耳机静音或解除静音
        try {
            let temp = !GlobalListener.data.deaf;
            state.client?.setVoiceSettings({ deaf: temp });
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
        if (this.settings.channel != "") {
            const item = this.settings.channels.filter((e) => e.id == this.settings.channel);
            plugin.setTitle(this.context, item[0].name, 3, 10);
        } else {
            plugin.setTitle(this.context, "", 3, 10);
        }
    }
    async _willDisappear({ context, payload }) {
        this.unsubscribe();
    }
    async _willAppear({ context, payload }) {
        log.info("语音通道: ", context);
        const VOICECHANNEL = async () => {
            log.info("语音通道初始化");
            this.stateCallback();
        };
        if (state.LoginState.hasLogin) {
            VOICECHANNEL();
        }
        this.unsubscribe = eventEmitter.subscribe("Login", VOICECHANNEL);
    }
    sendToPlugin({ context, payload }) {
        if ("refresh" in payload) {
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
        state.client?.GET_SELECTED_VOICE_CHANNEL().then((res) => {
            if (res && res.id == payload.settings.channel) {
                state.client?.selectVoiceChannel(null).then((res) => {});
                plugin.showOk(context);
            } else {
                state.client?.selectVoiceChannel(null).then((res) => {});
                state.client
                    ?.selectVoiceChannel(payload.settings.channel)
                    .then((res) => {
                        plugin.showOk(context);
                        log.info("连接语音通道：" + payload.settings.channel);
                    })
                    .catch((error) => {
                        if (error.code == 4006) {
                            plugin.showAlert(context);
                        }
                        log.error("getChannels failed:", error);
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
        if (this.settings.channel != "") {
            const item = this.settings.channels.filter((e) => e.id == this.settings.channel);
            plugin.setTitle(this.context, item[0].name, 3, 10);
        } else {
            plugin.setTitle(this.context, "", 3, 10);
        }
    }
    sendToPlugin({ context, payload }) {
        if ("refresh" in payload) {
            this.stateCallback();
        }
    }
    async _willAppear({ context, payload }) {
        log.info("文本通道: ", context);
        const TEXTCHANNEL = async () => {
            log.info("文本通道初始化");
            this.stateCallback();
        };
        if (state.LoginState.hasLogin) {
            TEXTCHANNEL();
        }
        this.unsubscribe = eventEmitter.subscribe("Login", TEXTCHANNEL);
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
        state.client
            ?.selectTextChannel(payload.settings.channel)
            .then((res) => {
                log.info("连接文本通道：" + payload.settings.channel);
            })
            .catch((error) => {
                log.error("getVoiceSettings failed:", error);
            });
    }
};
// 获取通知
plugin.notice = new Actions({
    async _willAppear({ context, payload }) {
        log.info("获取通知: ", context);
        const stateCallback = async () => {
            const sum = Object.values(GlobalListener.data.notices).reduce((acc, val) => acc + val, 0);
            if (GlobalListener.data.noticeImage == null) {
                plugin.setImage(context, await draw(sum.toString()));
                return;
            }
            const image = await Jimp.fromBuffer(GlobalListener.data.noticeImage);
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
                const base64String = await blank.getBase64("image/jpeg", { quality: 70 });
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
            log.info("获取通知初始化");
            await GlobalListener.addListener("NOTIFICATION_CREATE", stateCallback, context);
        };
        if (state.LoginState.hasLogin) {
            NOTICE();
        }
        this.unsubscribe[context] = eventEmitter.subscribe("Login", NOTICE.bind(this));
    },
    async _willDisappear({ context }) {
        this.unsubscribe[context]();
        GlobalListener.removeListener("NOTIFICATION_CREATE", context);
    },
    async keyUp({ context, payload }) {
        if (GlobalListener.data.currentNotice == "") {
            return;
        }
        try {
            await state.client.selectTextChannel(GlobalListener.data.currentNotice);
            GlobalListener.data.notices = {};
            plugin.setImage(context, await draw("0"));
        } catch (error) {
            log.error("selectTextChannel failed:", error);
        }
    },
});
// 用户音量控制
plugin.userVolumeControl = new Actions({
    async VOLUME(context) {
        if (state.LoginState.hasLogin == false) {
            return;
        }
        let temp = await GlobalListener.getCurrentChannelsUser();
        this.data[context].voice_states = temp;
        plugin.setSettings(context, this.data[context]);
        if (!temp || temp.length == 0) {
            plugin.setTitle(context, "", 3, 10);
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
            plugin.setTitle(context, this.data[context].username || "", 3, 10);
        } else {
            let test = elementExists[0]?.user?.global_name || elementExists[0]?.user?.username || "";
            this.data[context].username = test;
            plugin.setTitle(context, test, 3, 6);
            let temp1 = await state.client.getImage(elementExists[0]?.user?.id);
            plugin.setImage(context, temp1.data_url);
        }
    },
    async _willAppear({ context, payload }) {
        log.info("用户音量控制: ", context);
        this.currentUser = {};
        if (state.LoginState.hasLogin) {
            this.VOLUME(context);
        }

        eventEmitter.subscribe("Login", this.VOLUME.bind(this, context));
    },
    async _didReceiveSettings({ payload, context }) {
        if (this.currentUser[context] != payload.settings.user) {
            let temp = this.data[context].voice_states.filter((item) => item.user.id == payload.settings.user)[0].user;
            this.currentUser[context] = payload.settings.user;
            let title = temp.global_name || temp.username;
            plugin.setTitle(context, title, 3, 6);
            let temp1 = await state.client.getImage(temp.id);
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
                if (this.data[context].mode == "mute") {
                    if (this.data[context].type == "unmute") {
                        voice_state.mute = false;
                    } else if (this.data[context].type == "mute") {
                        voice_state.mute = true;
                    } else {
                        voice_state.mute = !voice_state.mute;
                    }
                } else if (this.data[context].mode == "set") {
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
                state.client
                    ?.setUserVoiceSettings(this.data[context].user, userVoiceSettings)
                    .then((res) => {
                        const index = this.data[context].voice_states.findIndex((item) => item.user.id === this.data[context].user);
                        this.data[context].voice_states[index].mute = voice_state.mute;
                        this.data[context].voice_states[index].volume = voice_state.volume;
                        plugin.setSettings(context, this.data[context]);
                    })
                    .catch((error) => {
                        log.error("setUserVoiceSettings failed:", error);
                    });
            }
        } catch (error) {
            log.error(error);
        }
    },
});
// 用户音量控制旋钮
plugin.userVolumeControlKnob = class extends Actions {
    async stateCallback() {
        this.UpdateUser();
    }
    async UpdateUser() {
        let temp = GlobalListener.data.channelsUser;
        this.settings.voice_states = temp;
        plugin.setSettings(this.context, this.settings);
        if (!temp || temp.length == 0) {
            plugin.setTitle(this.context, this.settings.username || "", 3, 10);
            return;
        }

        if (temp[0].user == undefined) {
            return;
        }
        let selectUserID = this.settings.user;
        const elementExists = temp.filter((state) => {
            return state.user.id == selectUserID;
        });
        this.currentUser = selectUserID;
        if (elementExists.length == 0) {
            //没有选中的用户或者选中的用户不在了
            plugin.setTitle(this.context, this.settings.username || "", 3, 10);
        } else {
            let test = elementExists[0]?.user?.global_name || elementExists[0]?.user?.username || "";
            this.settings.username = test;
            plugin.setTitle(this.context, test, 3, 6);
            let temp1 = await state.client.getImage(elementExists[0]?.user?.id);
            plugin.setImage(this.context, temp1.data_url);
        }
    }
    async VOLUME() {
        if (state.LoginState.hasLogin == false) {
            return;
        }
        await GlobalListener.addListener("VOICE_STATE_CHANGE", this.stateCallback.bind(this), this.context);
        this.UpdateUser();
    }
    async _willAppear({ context, payload }) {
        log.info("用户音量控制旋钮: ", context);
        if (state.LoginState.hasLogin) {
            this.VOLUME(context);
        }

        eventEmitter.subscribe("Login", this.VOLUME.bind(this));
    }
    async _didReceiveSettings({ payload, context }) {
        this.settings = payload.settings;
        if (this.currentUser != payload.settings.user) {
            let temp = this.settings.voice_states.filter((item) => item.user.id == payload.settings.user)[0].user;
            this.currentUser = payload.settings.user;
            let title = temp.global_name || temp.username;
            this.settings.username = title;
            plugin.setTitle(context, title, 3, 6);
            let temp1 = await state.client.getImage(temp.id);
            plugin.setImage(context, temp1.data_url);
        }
    }
    dialRotate({ context, payload }) {
        try {
            if (Object.keys(this.settings).length === 0) {
                return;
            } else {
                let temp = this.settings.user;
                const voice_state = this.settings.voice_states.filter((item) => {
                    return item.user.id == temp;
                })[0];
                if (!voice_state) {
                    return;
                }
                voice_state.volume += (this.settings.adjustment || 1) * payload.ticks;
                if (voice_state.volume > 200) {
                    voice_state.volume = 200;
                } else if (voice_state.volume < 0) {
                    voice_state.volume = 0;
                }
                let userVoiceSettings = {
                    id: this.settings.user,
                    pan: voice_state.pan,
                    volume: voice_state.volume,
                    mute: voice_state.mute,
                };
                state.client
                    ?.setUserVoiceSettings(this.settings.user, userVoiceSettings)
                    .then((res) => {
                        const index = this.settings.voice_states.findIndex((item) => item.user.id === this.settings.user);
                        this.settings.voice_states[index].mute = voice_state.mute;
                        this.settings.voice_states[index].volume = voice_state.volume;
                        plugin.setSettings(context, this.settings);
                    })
                    .catch((error) => {
                        log.error("setUserVoiceSettings failed:", error);
                    });
            }
        } catch (error) {
            log.error(error);
        }
    }
};
// 音量控制
plugin.volumeControl = new Actions({
    async _willAppear({ context, payload }) {
        log.info("音量控制: ", state.LoginState.hasLogin);
    },
    keyUp({ context, payload }) {
        if (payload.settings.rdio && payload.settings.slider) {
            let res = {};
            res[payload.settings.rdio] = {};
            res[payload.settings.rdio].volume = adjustOutputVolume(0, payload.settings.slider);
            state.client?.setVoiceSettings(res);
        }
    },
});
// 设置音频设备
plugin.setDevices = new Actions({
    async _willAppear({ context, payload }) {
        log.info("设置音频设备: ", context);
        this.data[context] = payload.settings;
        const stateCallback = (data) => {
            let settings = {};
            settings.inputDevices = GlobalListener.data.input?.availableDevices || GlobalListener.data.input?.available_devices;
            settings.outputDevices = GlobalListener.data.output?.availableDevices || GlobalListener.data.output?.available_devices;
            if (this.data[context]) {
                Object.assign(this.data[context], settings);
            } else {
                this.data[context] = settings;
            }

            plugin.setSettings(context, this.data[context]);
        };
        const SETDEVICES = async () => {
            log.info("设置音频设备初始化");
            await GlobalListener.addListener("VOICE_SETTINGS_UPDATE", stateCallback, context);
            stateCallback();
        };
        if (state.LoginState.hasLogin == true) {
            SETDEVICES();
        }
        eventEmitter.subscribe("Login", SETDEVICES);
        this.unsubscribe[context] = SETDEVICES;
    },
    async _willDisappear({ context }) {
        eventEmitter.unsubscribe("Login", this.unsubscribe[context]);
        GlobalListener.removeListener("VOICE_SETTINGS_UPDATE", context);
    },
    async keyUp({ context, payload }) {
        let res = {};
        if (payload.settings.mode == "input") {
            res.input = {};
            res.input.device = payload.settings.input;
        } else if (payload.settings.mode == "output") {
            res.output = {};
            res.output.device = payload.settings.output;
        } else {
            res.output = {};
            res.input = {};
            res.input.device = payload.settings.input;
            res.output.device = payload.settings.output;
        }
        state.client?.setVoiceSettings(res);
    },
});
plugin.screenShare = new Actions({
    async keyUp({ context, payload }) {
        state.client?.TOGGLE_SCREENSHARE();
    },
});
plugin.toggleVideo = new Actions({
    async keyUp({ context, payload }) {
        state.client?.TOGGLE_VIDEO();
    },
});
plugin.didReceiveGlobalSettings = async (data) => {
    if (plugin.firstGlobalSettings) {
        setLoginStateCallback(refreshState);
        initLogin();
    }
    state.LoginState.failCount = 0;
    try {
        if (!plugin.globalSettings?.accessToken) {
            log.info("first:", plugin.firstGlobalSettings);
            await refreshToken(!plugin.firstGlobalSettings);
        }
    } catch (err) {
    } finally {
        plugin.setGlobalSettings(plugin.globalSettings);
    }
};

plugin.applicationDidLaunch = async (data) => {
    log.info("app run");
    if (os.platform() == "win32" && !allProcessesNotHigherIL("Discord")) {
        currentMsg = "Warn:Discord is running with administrator privileges, but this application is not and cannot connect.";
    } else {
        currentMsg = "";
    }
    startLoginTimer();
    state.LoginState.appState = true;
};
plugin.applicationDidTerminate = () => {
    log.info("app shutdown");
    currentMsg = "";
    clearTimeout(state.LoginState.timer);
    state.LoginState.appState = false;
};
plugin.propertyInspectorDidAppear = (data) => {
    if (currentMsg) {
        plugin.sendToPropertyInspector({ msg: currentMsg });
    }
};

function buildScript(name) {
    return `
Add-Type @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
public class P
{
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr OpenProcess(int access, bool inherit, int pid);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);
    public const int Q = 0x0020;
    public static bool TByName(string processName)
    {
        Process[] processes = Process.GetProcessesByName(processName);
        if (processes.Length == 0)
            return true;
        foreach (Process p in processes)
        {
            IntPtr h = OpenProcess(Q, false, p.Id);
            if (h == IntPtr.Zero)
            {
                return false;
            }
            CloseHandle(h);
        }
        return true;
    }
}
"@
[P]::TByName("${name}")
`.trim();
}
function encodeScript(script) {
    return Buffer.from(script, "utf16le").toString("base64");
}

function allProcessesNotHigherIL(name) {
    const psScript = buildScript(name);
    const encoded = encodeScript(psScript);
    const cmd = `powershell -NoLogo -NoProfile -EncodedCommand ${encoded}`;
    try {
        const out = execSync(cmd, { encoding: "utf8" }).trim();
        return out.toLowerCase() === "true";
    } catch (err) {
        log.error(err);
        return false;
    }
}
