/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    logical_id: $('#logical_id'),
    mode: $('#mode'),
    title: $('#title'),
    title_prefix: $('#title_prefix'),
    // title_value: $('#title_value'),
    enabled_text: $('#enabled_text'),
    disabled_text: $('#disabled_text')
};
const $propEvent = {
    didReceiveGlobalSettings({ settings }) {
    },
    didReceiveSettings(data) {
        $dom.logical_id.value = $settings.logical_id;
        $dom.mode.value = $settings.mode;
        $dom.title.value = $settings.title;
        $dom.title_prefix.value = $settings.title_prefix;
        // $dom.title_value.value = $settings.title_value;
        $dom.enabled_text.value = $settings.enabled_text;
        $dom.disabled_text.value = $settings.disabled_text;
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

// 防抖时间（毫秒）
const DEBOUNCE_TIME = 300;

// Input fields with debounce
$dom.logical_id.addEventListener('input', debounce(function() {
  $settings.logical_id = this.value;
}, DEBOUNCE_TIME));


$dom.title_prefix.addEventListener('input', debounce(function() {
  $settings.title_prefix = this.value;
}, DEBOUNCE_TIME));

// $dom.title_value.addEventListener('input', debounce(function() {
//   $settings.title_value = this.value;
// }, DEBOUNCE_TIME));

$dom.enabled_text.addEventListener('input', debounce(function() {
  $settings.enabled_text = this.value;
}, DEBOUNCE_TIME));

$dom.disabled_text.addEventListener('input', debounce(function() {
  $settings.disabled_text = this.value;
}, DEBOUNCE_TIME));

// Select fields (listen on 'change' event)
$dom.mode.addEventListener('change', function () {
  $settings.mode = this.value;
});
$dom.title.addEventListener('change', function () {
  $settings.title = this.value;
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