/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    deviceSelect: $('#deviceSelect'),
    logoutBtn: $('#logoutBtn'),
    refresh: $('#refresh'),
    uri: $('#uri'),
    showCover: $('#showCover')
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
        // console.log(data);
        $websocket.getGlobalSettings();
        showCover.checked = $settings.showCover;
    },
    sendToPropertyInspector(data) {
        console.log(data);
        if ('devices' in data) {
            createHtml(data.devices);
        }
        if ('playlists' in data) {
            createHtml2(data.playlists);
        }
    }
};

function createHtml(devices) {
    deviceSelect.innerHTML = '';

    devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.id;
        option.text = `${device.name} (${device.type})${device.is_active ? ' ✓' : ''}`;
        if (!("device_id" in $settings)) {
            $settings.device_id = device.id;
        }
        if (device.id == $settings.device_id) {
            option.selected = true;
        }
        deviceSelect.appendChild(option);
    });

    deviceSelect.addEventListener('change', function () {
        $settings.device_id = deviceSelect.value;
    });
}

function createHtml2(lists) {
    uri.innerHTML = '';

    lists.forEach(item => {
        const option = document.createElement('option');
        option.value = item.uri;
        option.text = item.name;
        if (!("uri" in $settings)) {
            $settings.uri = item.uri;
        }
        if (item.uri == $settings.uri) {
            option.selected = true;
        }
        uri.appendChild(option);
    });

    uri.addEventListener('change', function () {
        $settings.uri = uri.value;
    });
}

showCover.addEventListener('change', function () {
    $settings.showCover = this.checked;
});

refresh.addEventListener('click', () => {
    deviceSelect.innerHTML = `<option value="">${$lang['Loading...']}</option>`;
    $websocket.sendToPlugin({
        type: 'refresh'
    });
});

logoutBtn.addEventListener('click', () => {
    $websocket.setGlobalSettings({});
    $propEvent.didReceiveGlobalSettings({});
});