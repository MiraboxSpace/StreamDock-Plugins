/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    mode1_check: $('#mode1_check'),
    mode1_key_press: $('#mode1_key_press'),
    mode1_send_hotkey: $('#mode1_send_hotkey'),
    mode1_midi: $('#mode1_midi'),
    mode2_key_press: $('#mode2_key_press'),
    mode2_send_hotkey: $('#mode2_send_hotkey'),
    mode2_midi: $('#mode2_midi'),
    // title: $('#title'),
    title_prefix: $('#title_prefix'),
    title_value: $('#title_value'),
    mode1_text: $('#mode1_text'),
    mode2_text: $('#mode2_text')
};
const $propEvent = {
    didReceiveGlobalSettings({ settings }) {
    },
    didReceiveSettings(data) {
      $dom.mode1_check.value = $settings.mode1_check;
      $dom.mode1_key_press.value = $settings.mode1_key_press;
      $dom.mode1_send_hotkey.value = $settings.mode1_send_hotkey;
      $dom.mode1_midi.value = $settings.mode1_midi;
      $dom.mode2_key_press.value = $settings.mode2_key_press;
      $dom.mode2_send_hotkey.value = $settings.mode2_send_hotkey;
      $dom.mode2_midi.value = $settings.mode2_midi;
      // $dom.title.value = $settings.title;
      $dom.title_prefix.value = $settings.title_prefix;
      $dom.title_value.value = $settings.title_value;
      $dom.mode1_text.value = $settings.mode1_text;
      $dom.mode2_text.value = $settings.mode2_text;
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

// Input elements with debounce
$dom.mode1_check.addEventListener('input', debounce(function() {
  $settings.mode1_check = this.value;
}, DEBOUNCE_TIME));

$dom.mode1_key_press.addEventListener('input', debounce(function() {
  $settings.mode1_key_press = this.value;
}, DEBOUNCE_TIME));

$dom.mode1_midi.addEventListener('input', debounce(function() {
  $settings.mode1_midi = this.value;
}, DEBOUNCE_TIME));

$dom.mode2_key_press.addEventListener('input', debounce(function() {
  $settings.mode2_key_press = this.value;
}, DEBOUNCE_TIME));

$dom.mode2_midi.addEventListener('input', debounce(function() {
  $settings.mode2_midi = this.value;
}, DEBOUNCE_TIME));

$dom.title_prefix.addEventListener('input', debounce(function() {
  $settings.title_prefix = this.value;
}, DEBOUNCE_TIME));

$dom.title_value.addEventListener('input', debounce(function() {
  $settings.title_value = this.value;
}, DEBOUNCE_TIME));

$dom.mode1_text.addEventListener('input', debounce(function() {
  $settings.mode1_text = this.value;
}, DEBOUNCE_TIME));

$dom.mode2_text.addEventListener('input', debounce(function() {
  $settings.mode2_text = this.value;
}, DEBOUNCE_TIME));

// Select elements
// $dom.title.addEventListener('change', function() {
//   $settings.title = this.value;
// });

// Readonly input elements
$dom.mode1_send_hotkey.addEventListener('click', function() {
  // $settings.mode1_send_hotkey = this.value; // Or handle the click event as needed
  $websocket.sendToPlugin({type: "hotkey", id: "mode1_send_hotkey_action"})
});

$dom.mode2_send_hotkey.addEventListener('click', function() {
  // $settings.mode2_send_hotkey = this.value; // Or handle the click event as needed
  $websocket.sendToPlugin({type: "hotkey", id: "mode2_send_hotkey_action"})
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