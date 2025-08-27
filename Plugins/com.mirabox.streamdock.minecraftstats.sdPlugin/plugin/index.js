const { Plugins, Actions, log, EventEmitter } = require('./utils/plugin');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { error } = require('console');
const mcs = require('node-mcstatus');
const { resolve } = require('path');
const plugin = new Plugins('demo');


plugin.didReceiveGlobalSettings = ({ payload: { settings } }) => {
    log.info('didReceiveGlobalSettings', settings);
};

const getBase64Image = (filePath) => {
    const absPath = path.resolve(__dirname, '..', filePath); // 适配你的目录结构
    const imageBuffer = fs.readFileSync(absPath);
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    if (ext === '.svg') mimeType = 'image/svg+xml';
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
}

const createSvg = (data, bgBase64) => {
    const { host, players, maxPlayers, hiddenPerson = false, hiddenMax = false } = data;
    return `<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
    <image x="0" y="0" width="144" height="144" xlink:href="${bgBase64}" />
    <text x="10" y="25" font-family="Arial" font-weight="bold" font-size="24" fill="#ffff00" text-anchor="left"
        stroke="black" stroke-width="1" paint-order="stroke">
        ${host}
    </text>
    ${hiddenPerson ? '' : `
    <g transform="translate(10,45)">
        <circle cx="8" cy="6" r="3" fill="#ffff00" stroke="#ffff00" stroke-width="2"/>
        <line x1="8" y1="10" x2="8" y2="16" stroke="#ffff00" stroke-width="2"/>
        <line x1="8" y1="14" x2="2" y2="12" stroke="#ffff00" stroke-width="2"/>
        <line x1="8" y1="14" x2="14" y2="12" stroke="#ffff00" stroke-width="2"/>
        <line x1="8" y1="16" x2="4" y2="22" stroke="#ffff00" stroke-width="2"/>
        <line x1="8" y1="16" x2="12" y2="22" stroke="#ffff00" stroke-width="2"/>
    </g>
    <text x="30" y="63" font-family="Arial" font-weight="bold" font-size="24" fill="#ffff00" text-anchor="left"
        stroke="black" stroke-width="1" paint-order="stroke">
        ${players}
    </text>
    `}
    ${hiddenMax ? '' : `
    <text x="10" y="100" font-family="Arial" font-weight="bold" font-size="24" fill="#ffff00" text-anchor="left"
        stroke="black" stroke-width="1" paint-order="stroke">
        Max:
    </text>
    <text x="70" y="100" font-family="Arial" font-weight="bold" font-size="24" fill="#ffff00" text-anchor="left"
        stroke="black" stroke-width="1" paint-order="stroke">
        ${maxPlayers}
    </text>
    `}
</svg>`;
};
const createSvg2 = (bgBase64) => `<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
    <image x="0" y="0" width="144" height="144" xlink:href="${bgBase64}" />
    <text x="72" y="72" font-family="Arial" font-weight="bold" font-size="24" fill="#ffff00" text-anchor="middle"
        stroke="black" stroke-width="2" paint-order="stroke">not</text>
    <text x="72" y="92" font-family="Arial" font-weight="bold" font-size="24" fill="#ffff00" text-anchor="middle"
        stroke="black" stroke-width="2" paint-order="stroke">Connected</text>
</svg>`;
const timers = {};
const debounceTimers = {};
const imagePath = {}; // 存放图片路径 每次钩子执行的时候验证一次是否更新过
const connectMcs = (settings) => {
    return new Promise((resolve, reject) => {
        // log.info(settings)
        const host = settings.Hostname;
        // const host = '';
        const port = settings.minecraftPort || 25565;
        const options = { query: true };
        mcs.statusJava(host, port, options).then((result) => {
            // log.info(JSON.stringify(result))
            resolve(result)
        }).catch((error) => {
            // log.info(error)
            reject(error)
        })
    })
}

const inintData = async (context, settings, imageData) => {
    try {
        const result = await connectMcs(settings);
        settings.Hostname = result.host;
        settings.serverStatus = result.online ? 'onLine' : 'offLine';
        settings.minecraftPort = result.port;
        settings.players = result.players.online || 0;
        settings.maxPlayers = result.players.max || 0;
        plugin.setSettings(context, settings);
        log.info('连接成功', result)
        const svg = createSvg({
            host: settings.title ? settings.title : settings.Hostname, // title 优先级最高
            players: settings.players,
            maxPlayers: settings.maxPlayers,
            hiddenPerson: settings.hiddenPlayers,
            hiddenMax: settings.hiddenMaxPlayers
        }, imageData);
        // log.info(svg)
        plugin.setImage(context, `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`);

    } catch (error) {
        log.error('连接失败', error);
        const svg = createSvg2(imageData);
        plugin.setImage(context, `data:image/svg+xml;charset=utf8,${svg}`);
    }
}

plugin.action1 = new Actions({
    default: {

    },
    images: {},
    async _willAppear({ context, payload }) {
        // log.info(getBase64Image('static/minecraft.png'))
        const settings = payload.settings;
        imagePath[context] = settings.Image || 'static/pluginAction.png';
        this.images[context] = getBase64Image(imagePath[context]);
        log.info('willAppear');
        inintData(context, settings, this.images[context]);
        // log.info("demo: ", context);
        // let n = 0;
        timers[context] = setInterval(async () => {
            // const svg = createSvg(++n);
            // plugin.setImage(context, `data:image/svg+xml;charset=utf8,${svg}`);
            // 每次修改属性选择器 需要调用接口吗 还是说获取先用以前的数据
            if (settings.Hostname) {
                inintData(context, settings, this.images[context]);
            }
        }, 60000);
    },
    _willDisappear({ context }) {
        // log.info('willDisAppear', context)
        timers[context] && clearInterval(timers[context]);
    },
    _didReceiveSettings({ context, payload }) {
        const settings = payload.settings;
        // 添加防抖机制
        if (debounceTimers[context]) clearTimeout(debounceTimers[context]);
        // 设置新的定时器
        debounceTimers[context] = setTimeout(() => {
            // 对图片路径进行一次 比对
            if (settings.Image && settings.Image !== imagePath[context]) { 
                imagePath[context] = settings.Image;
                this.images[context] = getBase64Image(imagePath[context]);
            }
            if (settings.isConnect) {
                settings.isConnect = false;
            }
            inintData(context, settings, this.images[context])
            // else {
            //     const svg = createSvg({
            //         host: settings.Title ? settings.Title : settings.Hostname, // title 优先级最高
            //         players: settings.players,
            //         maxPlayers: settings.maxPlayers,
            //         hiddenPerson: settings.hiddenPlayers,
            //         hiddenMax: settings.hiddenMaxPlayers
            //     }, this.images[context]);
            //     plugin.setImage(context, `data:image/svg+xml;charset=utf8,${svg}`);
            // }
        }, 500)

    },
    _propertyInspectorDidAppear({ context }) {
    },
    sendToPlugin({ payload, context }) {
    },
    keyUp({ context, payload }) {
        const settings = payload.settings;
        if(settings.AppLocationPath) {
            const child = spawn(settings.AppLocationPath, [], {
                detached: true,
                stdio: 'ignore' // 必须 ignore，否则不能真正脱离
              });
              
              child.unref(); // 让父进程不再等待子进程退出
        }
    },
    dialDown({ context, payload }) { },
    dialRotate({ context, payload }) { }
});