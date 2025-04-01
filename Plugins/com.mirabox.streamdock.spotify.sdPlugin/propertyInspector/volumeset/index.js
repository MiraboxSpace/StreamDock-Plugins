/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    logoutBtn: $('#logoutBtn'),
    volume: $('#volume'),
    show: $('#show')
};

const $propEvent = {
    didReceiveGlobalSettings({ settings }) {
        // console.log(settings);
        if (settings == undefined || !("access_token" in settings)) {
            window.$websocket = $websocket;
            window.$lang = $lang;
            // 获取屏幕的宽度和高度
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            // 计算居中位置
            const top = (screenHeight - 800) / 2;
            const left = (screenWidth - 550) / 2;
            window.open("../utils/authorization.html", "_blank", `width=800,height=550,top=${top},left=${left}`)
        }
    },
    didReceiveSettings(data) {
        console.log(data);
        $websocket.getGlobalSettings();
        show.checked = $settings.show;
        volume.value = $settings.volume;
    },
    sendToPropertyInspector(data) {
        console.log(data);
    }
};

show.addEventListener('change', function () {
    $settings.show = this.checked;
});

volume.addEventListener('input', function () {
    $settings.volume = volume.value;
});

logoutBtn.addEventListener('click', () => {
    $websocket.setGlobalSettings({});
    $propEvent.didReceiveGlobalSettings({});
});