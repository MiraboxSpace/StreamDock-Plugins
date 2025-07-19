/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    logout: $('#logout'),
    rdio1: $('#rdio1'),
    rdio2: $('#rdio2'),
    slider: $('#slider'),
    box: $('#box'),
    temperatureslider: $('#temperatureslider'),
};
const $propEvent = {
    didReceiveSettings(data) {
        if (data.settings.rdio === 'input') {
            $dom.rdio1.value = data.settings.rdio
            $dom.rdio1.checked = true
            $dom.slider.max = 100
        } else {
            $dom.rdio2.value = data.settings.rdio
            $dom.rdio2.checked = true
            $dom.slider.max = 200
        }
        $dom.slider.value = data.settings.slider
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
            if(data?.type) {
                window.open(`../utils/${data?.type}.html`, "_blank", `width=500,height=350,top=${top},left=${left}`)
            }
        }
    }
};

$dom.rdio1.on('change', (e) => {//输入
    $settings.rdio = e.target.value
    $websocket.sendToPlugin({ 'rdio': e.target.value })
})

$dom.rdio2.on('change', (e) => {//输出
    $settings.rdio = e.target.value
    $websocket.sendToPlugin({ 'rdio': e.target.value })
})

$dom.slider.on('change', (e) => {
    $settings.slider = e.target.value
    $websocket.sendToPlugin({ 'rdio': $settings.rdio, 'slider': e.target.value })
})

$dom.logout.on('click', () => {
    $websocket.openUrl('http://127.0.0.1:26432/logout')
})