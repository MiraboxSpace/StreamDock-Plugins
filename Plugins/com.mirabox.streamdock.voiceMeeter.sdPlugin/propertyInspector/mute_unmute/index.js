/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    mic_type: $('#mic_type'),
    strip_bus: $('#strip_bus'),
    mute_sends_hotkey: $('#mute_sends_hotkey'),
    unmute_sends_hotkey: $('#unmute_sends_hotkey'),
    strip_bus_num: $('#strip_bus_num'),
    title: $('#title'),
    value: $('#value')
};
const $propEvent = {
    didReceiveGlobalSettings({ settings }) {
    },
    didReceiveSettings(data) {
        $dom.mic_type.value = $settings.mic_type;
        $dom.strip_bus.value = $settings.strip_bus;
        $dom.strip_bus_num.value = $settings.strip_bus_num;
        $dom.mute_sends_hotkey.value = $settings.mute_sends_hotkey;
        $dom.unmute_sends_hotkey.value = $settings.unmute_sends_hotkey;
        $dom.title.value = $settings.title;
        $dom.value.value = $settings.value;
    },
    sendToPropertyInspector(data) {
    }
};

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}
const DEBOUNCE_TIME = 300;

$dom.mic_type.addEventListener('change', function () {
    $settings.mic_type = this.value
});

$dom.strip_bus.addEventListener('change', function () {
    $settings.strip_bus = this.value
});

$dom.strip_bus_num.addEventListener('change', function () {
    $settings.strip_bus_num = parseInt(this.value);
});

$dom.mute_sends_hotkey.addEventListener("click", () => {
    $dom.mute_sends_hotkey.value = ''
    // $dom.mute_sends_hotkey.value = $lang['Enter shortcut keys'] ?? 'Enter shortcut keys'
    $websocket.sendToPlugin({type: "hotkey", id: "mute_sends_hotkey_action"})
})

$dom.unmute_sends_hotkey.addEventListener("click", () => {
    $dom.unmute_sends_hotkey.value = ''
    // $dom.unmute_sends_hotkey.value = $lang['Enter shortcut keys'] ?? 'Enter shortcut keys'
    $websocket.sendToPlugin({type: "hotkey", id: "unmute_sends_hotkey_action"})
})

$dom.title.addEventListener('input', debounce(function () {
    $settings.title = this.value; // Assuming 'title' is a string, not an integer
}, DEBOUNCE_TIME));

$dom.value.addEventListener('input', debounce(function () {
    $settings.value = this.value; // Assuming 'title' is a string, not an integer
}, DEBOUNCE_TIME));
















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