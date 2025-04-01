/// <reference path="./utils/common.js" />
/// <reference path="./utils/axios.js" />

const plugin = new Plugins("xxx");

// 操作一
plugin.action1 = new Actions({
    default: {},
    _willAppear({ context, payload }) {
        let count = 0;
        if ("count" in payload.settings) {
            count = payload.settings.count;
        } else {
            window.socket.setSettings(context, { count: count });
        }
        window.socket.setTitle(context, count + '');
    },
    _willDisappear({ context }) { },
    keyUp(data) {
        let count = data.payload.settings.count + 1;
        window.socket.setSettings(data.context, { count: count })
        window.socket.setTitle(data.context, count + '');
    },
    dialRotate(data) {//旋钮旋转
        console.log(data);
    },
    dialDown(data) {//旋钮按下
        console.log(data);
    }
});