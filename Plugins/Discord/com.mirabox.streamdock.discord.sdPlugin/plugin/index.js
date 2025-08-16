const { Plugins, Actions, log, EventEmitter } = require('./utils/plugin');
const { getScopes, getAccessToken, getClientId, getClientSecret, getExpiresIn, getLastUpdateTimeStamp, getRefreshToken, getCode, saveToken } = require('./utils/getToken');
const RPC = require('discord-rpc');
const { RpcCommands, RPCCommands } = require('./node_modules/discord-rpc/src/constants');
// const { login } = require('./utils/login');
const fs = require('fs-extra');
const Jimp = require('jimp');
const https = require('https');
const { URLSearchParams } = require('url');
const { getProxySettings } = require('get-proxy-settings');
const { HttpsProxyAgent } = require('https-proxy-agent');


const plugin = new Plugins('discord');
const eventEmitter = new EventEmitter();
let client = null;
const contexts = []

//##################################################
//##################全局异常捕获#####################
process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason) => {
    log.error('Unhandled Rejection:', reason);
});
//##################################################
//##################################################

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function debounce(fn, delay) {
  let timer = null;
  return function() {
    const context = this;
    const args = arguments;
    
    // 每次触发都清除之前的定时器
    clearTimeout(timer);
    
    // 设置新的定时器
    timer = setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  };
}
const _login = async () => {
    try {
        // const scopes = ['rpc', 'identify', 'rpc.voice.read', 'messages.read', 'rpc.notifications.read', 'rpc.voice.write'];
        const scopes = await getScopes('./data/globalData.json');
        const accessToken = await getAccessToken('./data/globalData.json');
        const clientId = await getClientId('./data/globalData.json');
        const clientSecret = await getClientSecret('./data/globalData.json');
        const expiresIn = await getExpiresIn('./data/globalData.json');
        const lastUpdateTimeStamp = await getLastUpdateTimeStamp('./data/globalData.json');
        const refreshToken = await getRefreshToken('./data/globalData.json');

        if (accessToken) {
            client = new RPC.Client({ transport: 'ipc' });
            try {
                await client.login({ clientId, accessToken, scopes }); // 等待登录完成
                log.info('Logged in successfully!');
                client.on('ready', () => {
                    log.info('Client is ready!');
                    // plugin.sendToPropertyInspector({ open: true, type: 'close'})
                    try {
                        // eventEmitter.emit('SOUNDBOARD_SOUNDS');
                        contexts.forEach(context => {
                            eventEmitter.emit(context);
                        });
                    } catch (error) {
                        log.error('Error in Discord RPC client:', error);
                    }
                });
                client.on('disconnected', () => {
                    // log.info(`WebSocket 连接已关闭，代码：${client?.transport.ws._closeCode}，原因：${client?.transport.ws._closeMessage}`);
                    log.info('disconnected', client?.transport.ipc);
                    client = null;
                    login();
                });
            } catch (error) {
                log.info('Logged in Failed!');
                if (error.code === 4009) { // code: 4009, Token does not match current user Invalid token
                    const filePath = './data/globalData.json'; // 文件路径
                    // try {
                    //     await fs.outputJson(filePath, {}); // 异步写入文件
                    //     log.info('Token does not match current user');
                    // } catch (fileError) {
                    //     log.error('Failed to write to file:', fileError);
                    // }
                    try {
                        const data = await refresh_token(refreshToken);
                        data.lastUpdateTimeStamp = Date.now();
                        await saveToken(filePath, data);
                    } catch (error) {
                        console.error('刷新令牌失败:', error);
                    }

                } else if (error.message !== 'Could not connect') {
                    log.error('Login failed:', error);
                }
                client = null;
                await delay(3000); // 等待 3 秒后重试
                login();
            }
        }
    } catch (error) {
        log.error('Login failed:', error);
    }
}
const login = debounce(_login, 1000);

login();

// 声音板
plugin.action1 = new Actions({
    default: {
        subscribe: true,
        timer: null
    },
    async _willAppear({ context, payload }) {
        log.info("声音板: ", context);
        contexts.push(context);
        const SOUNDBOARD_SOUNDS = () => {
            client.request('GET_SOUNDBOARD_SOUNDS').then(async (res) => {
                const groupedByGuild = {};
                for (const sound of res) {
                    if (!groupedByGuild[sound.guild_id]) {
                        groupedByGuild[sound.guild_id] = [];
                    }
                    if (sound.guild_id === '0') {
                        sound.guild_name = 'Discord';
                    } else {
                        const guild = await client?.getGuild(sound.guild_id);
                        sound.guild_name = guild.name;
                    }
                    if (payload.settings?.sound_id == sound.sound_id) {
                        plugin.setTitle(context, payload.settings?.title)
                    }
                    groupedByGuild[sound.guild_id].push(sound);
                }
                payload.settings.sounds = groupedByGuild
                plugin.setSettings(context, payload.settings);
            }).catch((error) => {
                log.error('SOUNDBOARD_SOUNDS:', error);
            });
        };
        SOUNDBOARD_SOUNDS();
        if ("title" in payload.settings) {
            plugin.setTitle(context, payload.settings.title)
        }
        eventEmitter.subscribe(context, SOUNDBOARD_SOUNDS);
    },
    _willDisappear({ context }) {
        contexts.splice(contexts.indexOf(context), 1);
    },
    async _propertyInspectorDidAppear({ context }) { // 当属性选择器出现
        eventEmitter.emit(context);
        checkLogin();
    },
    sendToPlugin({ payload, context }) {
        plugin.setTitle(context, payload.title)
        plugin.setSettings(context, payload);
    },
    async keyUp({ context, payload }) {
        try {
            if ('sound_id' in payload.settings && client != null) {
                let sound = {};
                Object.keys(payload.settings.sounds).forEach(key => {
                    payload.settings.sounds[key].forEach(item => {
                        if (item.sound_id == payload.settings.sound_id) {
                            sound = item;
                            delete sound.guild_name;
                        }
                    })
                })
                client.request('PLAY_SOUNDBOARD_SOUND', sound).then((res) => {
                }).catch((error) => {
                    if (error.code == 4005 || error.code == 4018) {
                        return;
                    }
                    log.error('PLAY_SOUNDBOARD_SOUND failed:', error);
                });
            }
        } catch (error) {
            log.error(error);
        }
    },
});

// 麦克风静音
plugin.mute = new Actions({
    default: {
        subscribe: true
    },
    async _willAppear({ context, payload }) {
        // log.info("麦克风: ", context);
        contexts.push(context);
        const MUTE = () => {
            try {
                client?.getVoiceSettings().then((res) => {
                    if (res?.mute) {
                        plugin.setState(context, 1);
                    } else {
                        //只要耳机静音麦克风必须静音
                        if (res?.deaf) {
                            plugin.setState(context, 1)
                        } else {
                            plugin.setState(context, 0)
                        }
                    }
                }).catch((error) => {
                    log.error('getVoiceSettings failed:', error);
                });
                client?.subscribe("VOICE_SETTINGS_UPDATE", '');
                client?.on('VOICE_SETTINGS_UPDATE', (data) => {
                    try {
                        // log.info(data)
                        if (data?.mute) {
                            // log.info(data)
                            plugin.setState(context, 1)
                        } else {
                            if (data?.deaf) {
                                plugin.setState(context, 1)
                            } else {
                                plugin.setState(context, 0)
                            }
                        }
                    } catch (error) {
                        log.error(error);
                    }
                });
            } catch (error) {
                log.error(error)
            }
        }
        MUTE();
        eventEmitter.subscribe(context, MUTE);
    },
    _willDisappear({ context }) { contexts.splice(contexts.indexOf(context), 1); },
    async _propertyInspectorDidAppear({ context }) { // 当属性选择器出现
        eventEmitter.emit(context);
        checkLogin();
    },
    sendToPlugin({ payload, context }) {

    },
    keyUp({ context }) {
        try {
            //设置麦克风静音或解除静音
            client?.getVoiceSettings().then((res) => {
                try {
                    log.info(res)
                    res.mute = !res.mute
                    client?.setVoiceSettings({ mute: res.mute })
                    // log.info("设置VoiceSettings")
                    if (res.mute) {
                        plugin.setState(context, 1)
                    } else {
                        plugin.setState(context, 0)
                    }
                } catch (error) {
                    log.error(error);
                }
            }).catch((error) => {
                log.error('getVoiceSettings failed:', error);
            });
        } catch (error) {
            log.error(error);
        }
    },
});

// 耳机静音
plugin.deaf = new Actions({
    default: {
        subscribe: true
    },
    async _willAppear({ context, payload }) {
        log.info("耳机: ", context);
        contexts.push(context);

        const DEAF = () => {
            try {
                client?.getVoiceSettings().then((res) => {
                    if (res?.deaf) {
                        plugin.setState(context, 1)
                    } else {
                        plugin.setState(context, 0)
                    }
                }).catch((error) => {
                    log.error('getVoiceSettings failed:', error);
                });
                client?.subscribe("VOICE_SETTINGS_UPDATE", '');
                client?.on('VOICE_SETTINGS_UPDATE', (data) => {
                    if (data?.deaf) {
                        plugin.setState(context, 1)
                    } else {
                        plugin.setState(context, 0)
                    }
                });
            } catch (error) {
                log.error(error);
            }
        }
        DEAF();
        eventEmitter.subscribe(context, DEAF);
    },
    _willDisappear({ context }) { contexts.splice(contexts.indexOf(context), 1); },
    _propertyInspectorDidAppear({ context }) { // 当属性选择器出现
        eventEmitter.emit(context);
        checkLogin();
    },
    sendToPlugin({ payload, context }) {

    },
    keyUp({ context }) {
        //设置耳机静音或解除静音
        client?.getVoiceSettings().then((res) => {
            res.deaf = !res.deaf
            client?.setVoiceSettings({ deaf: res.deaf })
            if (res.deaf) {
                plugin.setState(context, 1)
            } else {
                plugin.setState(context, 0)
            }
        }).catch((error) => {
            log.error('getVoiceSettings failed:', error);
        });
    },
});


// 麦克风控制
plugin.mutecontrol = new Actions({
    default: {
        subscribe: true
    },
    async _willAppear({ context, payload }) {
        // log.info("麦克风: ", context);
        contexts.push(context);
        const MUTE = () => {
            try {
                client?.getVoiceSettings().then((res) => {
                    if (res?.mute) {
                        plugin.setState(context, 1);
                    } else {
                        if (res?.deaf) {
                            plugin.setState(context, 1);
                        } else {
                            plugin.setState(context, 0);
                        }
                    }
                    //只要耳机静音麦克风必须静音

                }).catch((error) => {
                    log.error('getVoiceSettings failed:', error);
                });
                client?.subscribe("VOICE_SETTINGS_UPDATE", '');
                client?.on('VOICE_SETTINGS_UPDATE', (data) => {
                    try {
                        // log.info(data)
                        if (data?.mute) {
                            // log.info(data)
                            plugin.setState(context, 1)
                        } else {
                            if (data?.deaf) {
                                plugin.setState(context, 1)
                            } else {
                                plugin.setState(context, 0)
                            }
                        }
                        //耳机静音的时候进入了这，但是麦克风mute=true所以图标没改
                        //所以做一下处理只要耳机静音麦克风必须静音
                    } catch (error) {
                        log.error(error);
                    }
                });
            } catch (error) {
                log.error(error)
            }
        }
        MUTE();
        eventEmitter.subscribe(context, MUTE);
    },
    _willDisappear({ context }) { contexts.splice(contexts.indexOf(context), 1); },
    async _propertyInspectorDidAppear({ context }) { // 当属性选择器出现
        eventEmitter.emit(context);
        checkLogin();
    },
    dialRotate({ payload, context }) {
        try {
            client?.getVoiceSettings().then((res) => {
                try {
                    if (res.input.volume > 50) {
                        res.input.volume += 10 * payload.ticks;
                    } else {
                        res.input.volume += payload.ticks;
                    }
                    if (res.input.volume > 100) {
                        res.input.volume = 100;
                    } else if (res.input.volume < 0) {
                        res.input.volume = 0;
                    }
                    client?.setVoiceSettings({ input: res.input });
                } catch (error) {
                    log.error(error);
                }
            }).catch((error) => {
                log.error('getVoiceSettings failed:', error);
            });
        } catch (error) {
            log.error(error);
        }
    },
    dialUp({ context }) {
        try {
            //设置麦克风静音或解除静音
            client?.getVoiceSettings().then((res) => {
                try {
                    res.mute = !res.mute
                    //这个里面报错，切换一下输入和输出设备就解决了
                    // id'child "input" fails because [child "device_id" fails because ["device_id" must be one of [default, {0.0.1.00000000}.{c41d0a6b-997d-49ad-bba0-a918eb6f6561}, {0.0.1.00000000}.{2d6c5eb9-1305-4c5a-af68-c48c63c2db7a}]]]'
                    client?.setVoiceSettings({ mute: res.mute })
                    // log.info("设置VoiceSettings")
                    if (res.mute) {
                        plugin.setState(context, 1)
                    } else {
                        plugin.setState(context, 0)
                    }
                } catch (error) {
                    log.error(error);
                }
            }).catch((error) => {
                log.error('getVoiceSettings failed:', error);
            });
        } catch (error) {
            log.error(error);
        }
    },
});

// 耳机控制
plugin.deafcontrol = new Actions({
    default: {
        subscribe: true
    },
    async _willAppear({ context, payload }) {
        log.info("耳机: ", context);
        contexts.push(context);

        const DEAF = () => {
            try {
                client?.getVoiceSettings().then((res) => {
                    if (res?.deaf) {
                        plugin.setState(context, 1)
                    } else {
                        plugin.setState(context, 0)
                    }
                }).catch((error) => {
                    log.error('getVoiceSettings failed:', error);
                });
                client?.subscribe("VOICE_SETTINGS_UPDATE", '');
                client?.on('VOICE_SETTINGS_UPDATE', (data) => {
                    if (data?.deaf) {
                        plugin.setState(context, 1)
                    } else {
                        plugin.setState(context, 0)
                    }
                });
            } catch (error) {
                log.error(error);
            }
        }
        DEAF();
        eventEmitter.subscribe(context, DEAF);
    },
    _willDisappear({ context }) { contexts.splice(contexts.indexOf(context), 1); },
    _propertyInspectorDidAppear({ context }) { // 当属性选择器出现
        eventEmitter.emit(context);
        checkLogin();
    },

    dialRotate({ payload, context }) {
        try {
            client?.getVoiceSettings().then((res) => {
                try {
                    if (res.output.volume > 50) {
                        res.output.volume += 10 * payload.ticks;
                    } else {
                        res.output.volume += payload.ticks;
                    }
                    if (res.output.volume > 200) {
                        res.output.volume = 200;
                    } else if (res.output.volume < 0) {
                        res.output.volume = 0;
                    }
                    client?.setVoiceSettings({ output: res.output });
                } catch (error) {
                    log.error(error);
                }
            }).catch((error) => {
                log.error('getVoiceSettings failed:', error);
            });
        } catch (error) {
            log.error(error);
        }
    },
    dialUp({ context }) {
        //设置耳机静音或解除静音
        client?.getVoiceSettings().then((res) => {
            res.deaf = !res.deaf
            client?.setVoiceSettings({ deaf: res.deaf})
            if (res.deaf) {
                plugin.setState(context, 1)
            } else {
                plugin.setState(context, 0)
            }
        }).catch((error) => {
            log.error('getVoiceSettings failed:', error);
        });
    },
});

// 语音通道
plugin.voicechannel = new Actions({
    default: {
        subscribe: true
    },
    async _willAppear({ context, payload }) {
        log.info("语音通道: ", context);
        contexts.push(context);
        const VOICECHANNEL = () => {
            client?.getGuilds().then((res) => {//获取服务器
                // log.info(context)
                let payload = {
                    settings: plugin.voicechannel.data[context]
                }

                if (payload.settings.channels) {
                    plugin.setSettings(context, { 'guilds': res.guilds, 'select': payload.settings.select, 'channels': payload.settings.channels, 'channel': payload.settings.channel })
                    const item = payload.settings.channels.filter((e) => e.id == payload.settings.channel)
                    plugin.setTitle(context, item[0].name)
                } else {
                    //第一次来默认给选中第一个服务器的语音通道
                    client?.getChannels(res.guilds[0].id).then((data) => {
                        //获取语音通道type=2或13代码里面说2是语音通道，但是有是13
                        const channels = data.filter((item) => item.type == 2 || item.type == 13)
                        plugin.setSettings(context, { 'guilds': res.guilds, 'channels': channels, 'select': res.guilds[0].id, 'channel': channels[0].id })
                        plugin.setTitle(context, channels[0].name)
                    }).catch((error) => {
                        log.error('getChannels failed:', error);
                    });
                }
            }).catch((error) => {
                log.error('getChannels failed:', error);
            });
        }
        VOICECHANNEL();
        eventEmitter.subscribe(context, VOICECHANNEL);
    },
    _willDisappear({ context }) { contexts.splice(contexts.indexOf(context), 1); },
    async _propertyInspectorDidAppear({ context, payload }) { // 当属性选择器出现
        eventEmitter.emit(context);
        checkLogin();
    },
    sendToPlugin({ payload, context }) {
        // log.info(payload)
        if (payload.channel) {//选择了新的语音通道
            plugin.setSettings(context, { 'guilds': payload.guilds, 'select': payload.select, 'channels': payload.channels, 'channel': payload.channel });
            plugin.voicechannel.data[context] = { 'guilds': payload.guilds, 'select': payload.select, 'channels': payload.channels, 'channel': payload.channel };
            const item = payload.channels.filter((e) => e.id == payload.channel);
            plugin.setTitle(context, item[0].name);
        } else {//选择了新的服务器
            client?.getChannels(payload.select).then((res) => {//获取语音通道type=2或13
                const channels = res.filter((item) => item.type == 2 || item.type == 13);
                // log.info(channels)
                plugin.setSettings(context, { 'guilds': payload.guilds, 'select': payload.select, 'channels': channels, 'channel': channels[0].id });
                plugin.voicechannel.data[context] = { 'guilds': payload.guilds, 'select': payload.select, 'channels': payload.channels, 'channel': payload.channel };
                plugin.setTitle(context, channels[0].name);
            }).catch((error) => {
                log.error('getChannels failed:', error);
            });
        }
    },
    keyUp({ context, payload }) {
        // log.info(payload)
        client.request(RPCCommands.GET_SELECTED_VOICE_CHANNEL).then((res) => {
            if (res == undefined || res == null) {
                client?.selectVoiceChannel(payload.settings.channel).then((res) => {
                    log.info("连接语音通道：" + payload.settings.channel)
                    plugin.showOk(context);
                }).catch((error) => {
                    if (error.code == 4006) {
                        plugin.showAlert(context);
                    }
                    log.error('getChannels failed:', error);
                });
                return;
            }
            if (res.id == payload.settings.channel) {
                client?.selectVoiceChannel(null).then((res) => { });
                plugin.showOk(context);
            } else {
                client?.selectVoiceChannel(null).then((res) => { });
                client?.selectVoiceChannel(payload.settings.channel).then((res) => {
                    plugin.showOk(context);
                    log.info("连接语音通道：" + payload.settings.channel)
                }).catch((error) => {
                    if (error.code == 4006) {
                        plugin.showAlert(context);
                    }
                    log.error('getChannels failed:', error);
                });
            }
        });

    },
});

// 文本通道
plugin.textchannel = new Actions({
    default: {
        subscribe: true
    },
    async _willAppear({ context, payload }) {
        log.info("文本通道: ", context);
        contexts.push(context);
        const TEXTCHANNEL = () => {
            client?.getGuilds().then((res) => {//获取服务器
                log.info(context)
                let payload = {
                    settings: plugin.textchannel.data[context]
                }
                if (payload.settings.channels) {
                    plugin.setSettings(context, { 'guilds': res.guilds, 'select': payload.settings.select, 'channels': payload.settings.channels, 'channel': payload.settings.channel });
                    const item = payload.settings.channels.filter((e) => e.id == payload.settings.channel);
                    plugin.setTitle(context, item[0].name);
                } else {
                    //第一次来默认给选中第一个服务器的文本通道
                    client?.getChannels(res.guilds[0].id).then((data) => {//文本通道type=0
                        const channels = data.filter((item) => item.type == 0);
                        plugin.setSettings(context, { 'guilds': res.guilds, 'channels': channels, 'select': res.guilds[0].id, 'channel': channels[0].id });
                        plugin.setTitle(context, channels[0].name);
                    }).catch((error) => {
                        log.error('getChannels failed:', error);
                    });
                }
            }).catch((error) => {
                log.error('getChannels failed:', error);
            });
        }
        TEXTCHANNEL();
        eventEmitter.subscribe(context, TEXTCHANNEL);
    },
    _willDisappear({ context }) { contexts.splice(contexts.indexOf(context), 1); },
    async _propertyInspectorDidAppear({ context, payload }) { // 当属性选择器出现
        eventEmitter.emit(context);
        checkLogin();
    },
    sendToPlugin({ payload, context }) {
        // log.info(payload)
        if (payload.channel) {//选择了新的文本通道
            plugin.setSettings(context, { 'guilds': payload.guilds, 'select': payload.select, 'channels': payload.channels, 'channel': payload.channel })
            plugin.textchannel.data[context] = { 'guilds': payload.guilds, 'select': payload.select, 'channels': payload.channels, 'channel': payload.channel };
            const item = payload.channels.filter((e) => e.id == payload.channel)
            plugin.setTitle(context, item[0].name)
        } else {//选择了新的服务器
            // const item = payload.guilds.filter((e) => e.id == payload.select)
            client?.getChannels(payload.select).then((res) => {//文本通道type=0
                const channels = res.filter((item) => item.type == 0)
                // log.info(channels)
                plugin.setSettings(context, { 'guilds': payload.guilds, 'select': payload.select, 'channels': channels, 'channel': channels[0].id })
                plugin.textchannel.data[context] = { 'guilds': payload.guilds, 'select': payload.select, 'channels': payload.channels, 'channel': payload.channel };
                plugin.setTitle(context, channels[0].name)
            }).catch((error) => {
                log.error('getVoiceSettings failed:', error);
            });
        }
    },
    keyUp({ context, payload }) {
        // log.info(payload)
        client?.selectTextChannel(payload.settings.channel).then((res) => {
            log.info("连接文本通道：" + payload.settings.channel)
        }).catch((error) => {
            log.error('getVoiceSettings failed:', error);
        });
    },
});


// 获取通知
plugin.notice = new Actions({
    default: {
        notices: {},
        current: '',
        count: 0,
        timer: null,
        subscribe: true,
    },
    async _willAppear({ context, payload }) {

        // const fs = require('fs');
        // log.info("获取通知: ", context);
        contexts.push(context);
        const that = this;
        log.info(that.data[context])
        const NOTICE = () => {
            try {
                log.info("获取通知: ");
                client?.subscribe("NOTIFICATION_CREATE", '');
                client?.on('NOTIFICATION_CREATE', (data) => {
                    log.info(that.data[context])
                    try {
                        that.data[context].current = data?.channel_id;//记录通知通道id
                        //计数
                        if (data?.channel_id in that.data[context]?.notices) {
                            that.data[context].notices[data?.channel_id] += 1;
                        } else {
                            that.data[context].notices[data?.channel_id] = 1;
                        }
                        //展示对应数量
                        that.data[context].count = that.data[context].notices[data.channel_id]
                        darw(context, that.data[context].count, data.title);
                        that.data[context].timer && clearTimeout(that.data[context].timer);
                        that.data[context].timer = setTimeout(() => {//1.5秒后取消头像展示并展示总数
                            that.data[context].count = 0;
                            Object.keys(that.data[context].notices).forEach(key => {
                                // log.info(that.data[context].notices[key])
                                that.data[context].count += that.data[context].notices[key];
                            });
                            darw(context, that.data[context].count, '');
                        }, 1500)
                    } catch (error) {
                        log.info(error)
                    }
                });
            } catch (error) {
                log.error('NOTIFICATION_CREATE failed:', error);
            }
        }
        NOTICE();
        eventEmitter.subscribe(context, NOTICE);
    },
    _willDisappear({ context }) { contexts.splice(contexts.indexOf(context), 1); },
    async _propertyInspectorDidAppear({ context }) { // 当属性选择器出现
        checkLogin();
    },
    sendToPlugin({ payload, context }) {

    },
    keyDown({ context, payload }) {

    },
    keyUp({ context, payload }) {
        if (this.data[context].current == '') {
            return
        }
        client?.selectTextChannel(this.data[context].current).then((res) => {
            this.data[context].notices = {};
            darw(context, '', '')
        }).catch((error) => {
            log.error('selectTextChannel failed:', error);
        });
    },
});

const darw = (context, count, title) => {
    Jimp.read(".././static/icon/13.png")
        .then(image => {
            // 获取图像宽度和高度
            const width = image.bitmap.width;
            const height = image.bitmap.height;

            // 定义圆圈的半径
            const circleRadius = 40;
            const circleDiameter = circleRadius * 2;

            // 在右上角绘制红色圆圈
            const circleX = width - circleRadius - 10; // 右边缘留10px的空隙
            const circleY = circleRadius + 10; // 上边缘留10px的空隙

            // 创建一个新的 Jimp 对象来绘制圆圈
            new Jimp(circleDiameter, circleDiameter, 0x00000000, (err, circle) => {
                if (err) throw err;

                // 绘制红色圆圈
                circle.scan(0, 0, circleDiameter, circleDiameter, function (x, y, idx) {
                    const dx = x - circleRadius;
                    const dy = y - circleRadius;
                    if (dx * dx + dy * dy <= circleRadius * circleRadius) {
                        this.bitmap.data[idx] = 255;      // 红色
                        this.bitmap.data[idx + 1] = 0;    // 绿色
                        this.bitmap.data[idx + 2] = 0;    // 蓝色
                        this.bitmap.data[idx + 3] = 255;  // 透明度
                    }
                });

                // 将红色圆圈合并到原始图像上
                if (count != '') {
                    image.composite(circle, circleX - circleRadius, circleY - circleRadius);
                }

                // 加载字体并在圆圈内写入白色数字
                Jimp.loadFont(Jimp.FONT_SANS_64_WHITE).then(font => {
                    image.print(
                        font,
                        circleX - 40, // 文字的X坐标
                        circleY - 40, // 文字的Y坐标
                        {
                            text: count.toString(),
                            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                        },
                        circleDiameter,
                        circleDiameter
                    );

                    // 将图像转换为Base64字符串
                    image.getBase64Async(Jimp.MIME_JPEG)
                        .then(base64 => {
                            plugin.setImage(context, base64);
                            plugin.setTitle(context, title, 3, 6)
                        })
                        .catch(err => {
                            log.error('Error converting image to Base64:', err);
                        });
                }).catch(err => {
                    log.error('Error loading font:', err);
                });
            });
        })
        .catch(err => {
            log.error('Error processing image:', err);
        });
}




// 用户音量控制
plugin.userVolumeControl = new Actions({
    default: {
        subscribe: true,
        voice_states: [],
        settings: {},
        timer: null
    },
    async _willAppear({ context, payload }) {
        log.info("用户音量控制: ", context);
        // plugin.setSettings(context, {})
        this.data[context].settings = payload.settings;
        // log.info(this.data[context].settings)
        contexts.push(context);
        const VOLUME = () => {
            this.data[context].timer = setInterval(() => {
                client.request(RPCCommands.GET_SELECTED_VOICE_CHANNEL).then((res) => {
                    if (res == null) {
                        this.data[context].settings = {};
                        plugin.setSettings(context, {});
                        plugin.setTitle(context, '');
                        return
                    }
                    if (res?.voice_states && !arraysAreEqual(this.data[context].voice_states, res.voice_states)) {
                        res.voice_states = res.voice_states.filter(state => {//排除自己
                            return !(state?.user && state.user.id === client.user.id);
                        });
                        this.data[context].voice_states = res.voice_states;

                        const elementExists = res.voice_states.filter(state => {//找出选中的用户
                            // log.info(state?.user.id,'222222')
                            return state?.user.id === this.data[context].settings?.user;
                        });
                        // log.info(elementExists, this.data[context].settings?.user,'111111')
                        // log.info(elementExists)
                        if (res.voice_states[0]?.user == undefined) {//没有用户
                            return
                        }
                        if (elementExists.length == 0) {//没有选中的用户或者选中的用户不在了
                            this.data[context].settings = {
                                user: res.voice_states[0]?.user.id,
                                mode: 'mute',
                                type: 'muteOrUnmute',
                                volume: res.voice_states[0]?.volume,
                                voice_states: res.voice_states
                            }
                            plugin.setSettings(context, this.data[context].settings);
                            plugin.setTitle(context, res.voice_states[0]?.user?.global_name ? res.voice_states[0]?.user?.global_name : res.voice_states[0]?.user?.username, 3, 6);
                            // userVolumeControlDarw(context, res.voice_states[0], this.data[context].settings);
                        } else {//找到了选中的用户
                            plugin.setTitle(context, elementExists[0]?.user?.global_name ? elementExists[0]?.user?.global_name : elementExists[0]?.user?.username, 3, 6);
                            // userVolumeControlDarw(context, elementExists[0], this.data[context].settings);
                        }
                    }
                }).catch((error) => {
                    log.error('用户音量控制获取当前选中语音通道:', error);
                });
            }, 3000)
        }
        VOLUME();
        eventEmitter.subscribe(context, VOLUME);
    },
    _willDisappear({ context }) {
        contexts.splice(contexts.indexOf(context), 1);
        this.data[context].timer && clearInterval(this.data[context].timer)
    },
    async _propertyInspectorDidAppear({ context }) { // 当属性选择器出现
        checkLogin();
    },
    sendToPlugin({ payload, context }) {
        if ('user' in payload) {
            try {
                this.data[context].settings.user = payload.user
                let title = this.data[context].voice_states.filter(item => item.user.id == payload.user)[0].user?.global_name;
                title = title ? title : this.data[context].voice_states.filter(item => item.user.id == payload.user)[0].user?.username;
                plugin.setTitle(context, title, 3, 6);
            } catch (error) {
                log.error('用户信息为空',error)
            }
        }
        if ('mode' in payload) {
            this.data[context].settings.mode = payload.mode
        }
        if ('type' in payload) {
            this.data[context].settings.type = payload.type
        }
        if ('icon' in payload) {
            this.data[context].settings.icon = payload.icon
        }
        if ('adjustment' in payload) {
            this.data[context].settings.adjustment = payload.adjustment
        }
        if ('volume' in payload) {
            this.data[context].settings.volume = payload.volume
        }

        plugin.setSettings(context, this.data[context].settings)
    },
    keyDown({ context, payload }) {

    },
    keyUp({ context, payload }) {
        try {
            if (Object.keys(this.data[context].settings).length === 0) {
                return
            } else {
                const voice_state = this.data[context].voice_states.filter(item => { return item.user.id == this.data[context].settings.user })[0];
                if (this.data[context].settings.mode == 'mute') {
                    if (this.data[context].settings.type == 'unmute') {
                        voice_state.mute = false;
                    } else if (this.data[context].settings.type == 'mute') {
                        voice_state.mute = true;
                    } else {
                        voice_state.mute = !voice_state.mute;
                    }
                } else if (this.data[context].settings.mode == 'set') {
                    voice_state.volume = parseInt(this.data[context].settings.volume)
                } else {
                    voice_state.volume += parseInt(this.data[context].settings.adjustment ? this.data[context].settings.adjustment : 0) / 100 * voice_state.volume
                    if (voice_state.volume > 200) {
                        voice_state.volume = 200
                    } else if (voice_state.volume < 0) {
                        voice_state.volume = 0
                    }
                }
                let userVoiceSettings = {
                    id: this.data[context].settings.user,
                    pan: voice_state.pan,
                    volume: voice_state.volume,
                    mute: voice_state.mute,
                }
                log.info(JSON.stringify(userVoiceSettings, null , 2))
                client?.setUserVoiceSettings(this.data[context].settings.user, userVoiceSettings).then((res) => {
                    const index = this.data[context].voice_states.findIndex(item => item.user.id === this.data[context].settings.user);
                    this.data[context].voice_states[index].mute = voice_state.mute;
                    this.data[context].voice_states[index].volume = voice_state.volume;
                    // userVolumeControlDarw(context, this.data[context].voice_states.filter(item => item.user.id == this.data[context].settings.user)[0], this.data[context].settings);
                    // if (this.data[context].settings.mode == 'adjustment') {
                    // userVolumeControlVolumeDarw(context, voice_state, this.data[context].settings);
                    // }
                }).catch((error) => {
                    log.error('setUserVoiceSettings failed:', error);
                });
            }
        } catch (error) {
            log.error(error)
        }
    },
});

function arraysAreEqual(arr1, arr2) {
    // 检查数组长度
    if (arr1.length !== arr2.length) {
        return false;
    }

    // 检查数组元素
    for (let i = 0; i < arr1.length; i++) {
        if (!deepEqual(arr1[i], arr2[i])) {
            return false;
        }
    }

    return true;
}

function deepEqual(obj1, obj2) {
    // 深度比较函数，比较两个对象是否相等
    // 这里使用 JSON.stringify 简单比较，可以根据实际需求修改
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}


// 音量控制
plugin.volumeControl = new Actions({
    default: {
        rdio: 'output'
    },
    async _willAppear({ context, payload }) {
        log.info("音量控制: ", context);
        try {
            if ('rdio' in payload.settings) {
                this.data[context].rdio = payload.settings.rdio
            }
        } catch (error) {
            log.error(error)
        }
    },
    _willDisappear(data) { },
    async _propertyInspectorDidAppear({ context }) { // 当属性选择器出现
        checkLogin();
        try {
            client?.getVoiceSettings().then((res) => {
                plugin.setSettings(context, { 'rdio': this.data[context].rdio, 'slider': res[this.data[context].rdio].volume })
            }).catch((error) => {
                log.error('getVoiceSettings failed:', error);
            });
        } catch (error) {
            log.error(error)
        }
    },
    sendToPlugin({ payload, context }) {
        try {
            if (payload.slider) {//设置音量
                this.data[context].rdio = payload.rdio
                plugin.setSettings(context, { 'rdio': payload.rdio, 'slider': payload.slider })
            } else {//查询音量
                client?.getVoiceSettings().then((res) => {
                    // log.info(res[payload.rdio].volume)
                    this.data[context].rdio = payload.rdio
                    plugin.setSettings(context, { 'rdio': payload.rdio, 'slider': res[payload.rdio].volume })
                }).catch((error) => {
                    log.error('getVoiceSettings failed:', error);
                });
            }
        } catch (error) {
            log.error(error)
        }
    },
    keyDown({ context, payload }) {
    },
    keyUp({ context, payload }) {
        client?.getVoiceSettings().then((res) => {
            // log.info(res)
            // log.info(payload.settings)
            res[payload.settings.rdio].volume = parseInt(payload.settings.slider);
            client?.setVoiceSettings(res);
            // log.info(res)
        }).catch((error) => {
            log.error('getVoiceSettings failed:', error);
        });
    },
});


// 设置音频设备
plugin.setDevices = new Actions({
    default: {
        settings: {}
    },
    async _willAppear({ context, payload }) {
        log.info("设置音频设备: ", context);
        this.data[context].settings = payload.settings;
        if (!('mode' in this.data[context].settings)) {
            this.data[context].settings.mode = 'input';
            plugin.setSettings(context, this.data[context].settings);
        }
    },
    _willDisappear(data) { },
    async _propertyInspectorDidAppear({ context }) { // 当属性选择器出现
        checkLogin();
        try {
            client?.getVoiceSettings().then((res) => {
                this.data[context].settings.inputDevices = res?.input?.availableDevices;
                this.data[context].settings.outputDevices = res?.output?.availableDevices;
                if(!this.data[context].settings?.output) {
                    this.data[context].settings.output = res?.output?.device;
                }
                if(!this.data[context].settings?.input) {
                    this.data[context].settings.input = res?.input?.device;
                }
                // this.data[context].settings.output = res?.output?.device;
                // this.data[context].settings.input = res?.input?.device;
                plugin.setSettings(context, this.data[context].settings);
            }).catch((error) => {
                log.error('getVoiceSettings failed:', error);
            });
        } catch (error) {
            log.error(error)
        }
    },
    sendToPlugin({ payload, context }) {
        if ('mode' in payload) {
            this.data[context].settings.mode = payload.mode;
        }
        if ('input' in payload) {
            this.data[context].settings.input = payload.input;
        }
        if ('output' in payload) {
            this.data[context].settings.output = payload.output;
        }
        plugin.setSettings(context, this.data[context].settings);
        // this.keyUp({context, payload: this.data[context]});
    },
    keyDown({ context, payload }) {

    },
    keyUp({ context, payload }) {
        client?.getVoiceSettings().then((res) => {
            if (payload.settings.mode == 'input') {
                res.input.device = payload.settings.input;
            } else if (payload.settings.mode == 'output') {
                res.output.device = payload.settings.output;
            } else {
                res.input.device = payload.settings.input;
                res.output.device = payload.settings.output;
            }
            client?.setVoiceSettings(res);
        }).catch((error) => {
            log.error('getVoiceSettings failed:', error);
        });
    },
});






const checkLogin = async () => {
    const access_token = await getAccessToken('./data/globalData.json'); // 动态获取 token
    if (access_token == null) {
        try {
            // window.open("successful.html", "width=400,height=300");
            plugin.sendToPropertyInspector({ open: true, type: 'authorization'})
        } catch (error) {
            log.error(error);
        }
        return
    }
    if(client == null) {
        login();
        setTimeout(() => {
            if(client == null) {
                plugin.sendToPropertyInspector({ open: true, type: 'reluanch'})
            }
        }, 5000)
    }
}
const API_ENDPOINT = 'https://discord.com/api/v10';
const REDIRECT_URI = 'http://127.0.0.1:26432';

async function exchange_code(code) {
    const clientId = await getClientId('./data/globalData.json');
    const clientSecret = await getClientSecret('./data/globalData.json');
    const data = await getProxySettings();
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        postData.append('grant_type', 'authorization_code');
        postData.append('code', code);
        postData.append('redirect_uri', REDIRECT_URI);

        const options = {
        hostname: 'discord.com',
        path: '/api/v10/oauth2/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        },
        agent: data? new HttpsProxyAgent(data.https): null
        };

        const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
            } else {
            reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
            }
        });
        });

        req.on('error', (error) => {
        reject(error);
        });

        req.write(postData.toString());
        req.end();
    });
}

async function refresh_token(refresh_token) {
    const clientId = await getClientId('./data/globalData.json');
    const clientSecret = await getClientSecret('./data/globalData.json');
  const data = await getProxySettings();
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams();
    postData.append('grant_type', 'refresh_token');
    postData.append('refresh_token', refresh_token);

    const options = {
      hostname: 'discord.com',
      path: '/api/v10/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      agent: data? new HttpsProxyAgent(data.https): null
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.write(postData.toString());
    req.end();
  });
}

//启动服务器
//Start the server
startServer()

function startServer() {
    const express = require('express');
    const cors = require('cors');
    let id = ''
    let secret

    const app = express();
    app.use(cors());
    const port = 26432;

    app.get('/', async (req, res) => {
        log.info('callback')
        res.sendFile(__dirname + '/callback.html');
    });

    //跳转授权
    //Jump authorization
    app.get('/authorization', (req, res) => {
        // log.info(req.query)
        id = req.query.clientId
        secret = req.query.clientSecret
        // res.redirect(`https://discord.com/oauth2/authorize?client_id=${id}&response_type=token&redirect_uri=http%3A%2F%2F127.0.0.1%3A26432&scope=identify+rpc+rpc.voice.read+rpc.notifications.read+messages.read+rpc.voice.write`)
        // res.redirect(`https://discord.com/oauth2/authorize?client_id=${id}&response_type=token&redirect_uri=http%3A%2F%2F127.0.0.1%3A26432&scope=identify+rpc+rpc.voice.read+messages.read+rpc.notifications.read+rpc.voice.write`)
        res.redirect(`https://discord.com/oauth2/authorize?client_id=${id}&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A26432&scope=identify+rpc+rpc.voice.read+rpc.notifications.read+rpc.voice.write&state=15773059ghq9183habn&prompt=none&integration_type=0`)
    })


    // 启动服务器
    // Start the server
    app.listen(port, () => {
        log.info(`Server is running at http://127.0.0.1:${port}`);
    });

    // 添加接收数据的路由处理器
    // Add a route handler to receive data
    app.post('/data', (req, res) => {
        let data = '';
        // 接收请求数据
        // Receiving request data
        req.on('data', chunk => {
            data += chunk;
        });

        req.on('end', async () => {
            try {
                const parsedData = JSON.parse(data);
                log.info(parsedData);
                
                globalData = { ...parsedData, clientId: id, clientSecret: secret, lastUpdateTimeStamp: Date.now() };
                
                const filePath = './data/globalData.json';
                await fs.outputJson(filePath, globalData);
                
                const code = await getCode(filePath);
                const tokenData = await exchange_code(code);
                tokenData.lastUpdateTimeStamp = Date.now();
                
                plugin.sendToPropertyInspector({ 'access_token': tokenData.access_token });
                log.info(tokenData);
                await saveToken(filePath, tokenData);
                login();
                res.json({ msg: "完成" }); // 所有操作完成后响应
            } catch (err) {
                log.error(err);
                res.status(500).json({ error: err.message }); // 返回错误信息
            }
        });
    });

    app.get('/logout', async (req, res) => {
        log.info('logout')
        const filePath = './data/globalData.json'; // 路径 path
        try {
            client = null;
            await fs.outputJson(filePath, {})
        } catch (err) {
            log.error(err)
        }
        res.sendFile(__dirname + '/successful.html');
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
