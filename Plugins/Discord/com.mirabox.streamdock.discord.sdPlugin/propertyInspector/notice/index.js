/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    logout: $('#logout'),
};

const $propEvent = {
    didReceiveSettings(data) {

    },
    sendToPropertyInspector(data) {
        // console.log(data);
        if (data?.open) {
            window.$websocket = $websocket;
            window.$lang = $lang;
            // 获取屏幕的宽度和高度
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            // 计算居中位置
            const top = (screenHeight - 500) / 2;
            const left = (screenWidth - 350) / 2;
            window.open("../utils/authorization.html", "_blank", `width=500,height=350,top=${top},left=${left}`)
        }
    }
};


$dom.logout.on('click', () => {
    $websocket.openUrl('http://127.0.0.1:26432/logout')
})