/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    logoutBtn: $('#logoutBtn'),
    titleFormat: $('#titleFormat'),
    showTitle: $('#showTitle'),
    timeDisplay: $('#timeDisplay'),
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
        titleFormat.value = $settings.titleFormat;
        showTitle.checked = $settings.showTitle;
        timeDisplay.value = $settings.timeDisplay;
    },
    sendToPropertyInspector(data) {
        console.log(data);
        if ('devices' in data) {
            createHtml(data.devices);
        }
    }
};

function createHtml(devices) {
    const deviceSelect = document.getElementById('deviceSelect');
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
        $settings.device_id = this.value;
    });
}

// 添加事件监听
timeDisplay.addEventListener('change', function () {
    $settings.timeDisplay = this.value;
});
showTitle.addEventListener('change', function () {
    $settings.showTitle = this.checked;
});
titleFormat.addEventListener('change', function () {
    $settings.titleFormat = this.value;
});

// 注销按钮事件
logoutBtn.addEventListener('click', () => {
    $websocket.setGlobalSettings({});
    $propEvent.didReceiveGlobalSettings({});
});

















// $dom.logout.on('click', () => {
//     $websocket.setGlobalSettings({})
//     $propEvent.didReceiveGlobalSettings({});
// })

// $dom.search.on('input', (e) => {
//     if (e.target.value == '') {
//         createHtml($settings)
//         return
//     }
//     const filteredGroupedByGuild = {};
//     Object.keys($settings.sounds).reverse().forEach(guildId => {
//         const filteredSounds = $settings.sounds[guildId].filter(sound =>
//             sound.name.includes(e.target.value)
//         );
//         if (filteredSounds.length > 0) {
//             filteredGroupedByGuild[guildId] = filteredSounds;
//         }
//     });
//     const temp = JSON.parse(JSON.stringify($settings));
//     temp.sounds = filteredGroupedByGuild;
//     createHtml(temp);
// })

// const addListener = (soundItem) => {
//     soundItem.forEach((item) => {
//         item.addEventListener('click', (e) => {
//             soundItem.forEach(item => {
//                 item.classList.remove('active');
//             });
//             item.classList.add('active');
//             $websocket.sendToPlugin({ key: e.target.getAttribute('key'), sound_id: e.target.getAttribute('soundId'), sounds: $settings.sounds, title: e.target.getAttribute('soundName'), emoji_name: e.target.getAttribute('emojiName') });
//         });
//     })
// }

// const createHtml = (settings) => {
//     const sounds = settings.sounds;
//     $dom.sounds.innerHTML = ''
//     Object.keys(sounds).reverse().forEach(key => {
//         let div = ''
//         sounds[key].forEach(item => {
//             console.log(settings.sound_id == item.sound_id);
//             if (settings.sound_id == item.sound_id) {
//                 div += '<div class="soundItem active" key="' + key + '" soundId="' + item.sound_id + '" soundName="' + item.name + '" emojiName="' + item.emoji_name + '">' + (item.emoji_name ? item.emoji_name : '') + item.name + '</div>'
//             } else {
//                 div += '<div class="soundItem" key="' + key + '" soundId="' + item.sound_id + '" soundName="' + item.name + '" emojiName="' + item.emoji_name + '">' + (item.emoji_name ? item.emoji_name : '') + item.name + '</div>'
//             }
//         })
//         $dom.sounds.innerHTML += `
//                     <div class="box">
//                         <div class="title">
//                             ${sounds[key][0].guild_name}
//                         </div>
//                         <div class="guild">${div}</div>
//                     </div>
//                 `
//     })
//     const soundItem = document.querySelectorAll('.soundItem');
//     addListener(soundItem);
// }