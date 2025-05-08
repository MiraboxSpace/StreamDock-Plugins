/**
 * Plugin 2.5.0 新特性 =>
 * 
 *      1 => 工具与主文件相分离 - 按需引入
 *      2 => $plugin - 全局插件配置对象 ※
 *      3 => 新增 Action 行动类 默认包含一些方法
 *      4 => 注意事项: 为了避免命名冲突，请勿使用 $ 相关的名称以及JQuery库
 * 
 * ===== CJHONG ========================================== 2023.10.11 =====>
 */

let $websocket, $lang;

class Timer {
    constructor(task, interval, immediate = false) {
        if (immediate) task()
        this.worker = new Worker('../static/utils/worker.js');
        this.worker.postMessage(interval);
        this.worker.onmessage = task;
    }
    stop() {
        this.worker.terminate();
    }
}

class Action {
    constructor(data) {
        this.data = {}
        this.default = {}
        Object.assign(this, data)
    }
    // 初始化数据
    willAppear(data) {
        const { context, payload: { settings } } = data
        this.data[context] = Object.assign({ ...this.default }, settings)
        this._willAppear?.(data)
    }
    // 行动销毁
    willDisappear(data) {
        this._willDisappear?.(data)
        delete this.data[data.context];
    }
    // 高精度定时器
    interval(task, interval, immediate = false) {
        return new Timer(task, interval, immediate)
    }
}

// 打开网页
WebSocket.prototype.openUrl = function (url) {
    this.send(JSON.stringify({
        event: "openUrl",
        payload: { url }
    }))
}

// 与属性检查器通信
WebSocket.prototype.sendToPropertyInspector = function (action, context, payload) {
    this.send(JSON.stringify({
        event: "sendToPropertyInspector",
        action, context, payload
    }))
}

// 保存持久化数据
WebSocket.prototype.setSettings = function (context, payload) {
    this.send(JSON.stringify({
        event: "setSettings",
        context, payload
    }))
}

// 设置背景
WebSocket.prototype.setImage = function (context, url, isGif = false) {
    if (isGif) {
        this.send(JSON.stringify({
            event: "setImage",
            context, payload: {
                target: 0,
                image: url
            }
        }))
    } else {
        const image = new Image();
        image.src = url;
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0);
            this.send(JSON.stringify({
                event: "setImage",
                context, payload: {
                    target: 0,
                    image: canvas.toDataURL("image/png")
                }
            }))
        }
    }
}

// 设置标题
WebSocket.prototype.setTitle = function (context, str, row = 0, num = 6) {
    let newStr = '';
    if (row) {
        let nowRow = 1, strArr = str.split('');
        strArr.forEach((item, index) => {
            if (nowRow < row && index >= nowRow * num) {
                nowRow++
                newStr += '\n'
            }
            if (nowRow <= row && index < nowRow * num) {
                newStr += item
            }
        })
        if (strArr.length > row * num) {
            newStr = newStr.substring(0, newStr.length - 1)
            newStr += '..'
        }
    }
    this.send(JSON.stringify({
        event: "setTitle",
        context, payload: {
            target: 0,
            title: newStr || str
        }
    }))
}

// 设置状态
WebSocket.prototype.setState = function (context, state) {
    this.send(JSON.stringify({
        event: "setState",
        payload: { state },
        context
    }));
}

// StreamDock 软件入口函数
const connectSocket = connectElgatoStreamDeckSocket;
async function connectElgatoStreamDeckSocket(port, uuid, event, info) {
    $lang = JSON.parse(info).application.language
    $websocket = new WebSocket("ws://127.0.0.1:" + port);
    $websocket.onopen = () => $websocket.send(JSON.stringify({ uuid, event }))
    $websocket.onmessage = e => {
        const data = JSON.parse(e.data)
        const action = data.action?.split(`com.hotspot.streamdock.${$plugin.name}.`)[1]
        $plugin[action]?.[data.event]?.(data)
    }
}