/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    param: $('#param'),
    strip_bus: $('#strip_bus'),
    strip_bus_num: $('#strip_bus_num'),
    strip_layer: $('#strip_layer'),
    value: $('#value'),
    long_press_value: $('#long_press_value'),
    title: $('#title'),
    title_prefix: $('#title_prefix'),
    strip_layer_box: $('#strip_layer_box')
};
const $propEvent = {
    didReceiveGlobalSettings({ settings }) {
    },
    didReceiveSettings(data) {
        // Assuming $dom and $settings objects are already defined and populated.

        // For select elements (param, strip_bus, title)
        $dom.param.value = $settings.param;
        $dom.strip_bus.value = $settings.strip_bus;
        $dom.title.value = $settings.title;

        // For number input elements (strip_bus_num, strip_layer, value, long_press_value)
        // Note: Even if $settings.strip_bus_num is a number, assigning it to .value will stringify it,
        // which is fine for HTML input elements.
        $dom.strip_bus_num.value = $settings.strip_bus_num;
        $dom.strip_layer.value = $settings.strip_layer;
        $dom.value.value = $settings.value;
        $dom.long_press_value.value = $settings.long_press_value;

        // For text input element (title_prefix)
        $dom.title_prefix.value = $settings.title_prefix;

        if ($dom.strip_bus.value === "StripLayer") {
            $dom.strip_layer_box.style.display = "block";
        } else {
            $dom.strip_layer_box.style.display = "none";
        }
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

$dom.param.addEventListener('change', function () {
    $settings.param = this.value;
    if($settings.strip_bus === "StripLayer") {
        this.value = "Gain";
        $settings.param = "Gain";
    }
});

$dom.strip_bus.addEventListener('change', function () {
    $settings.strip_bus = this.value;
    if ($dom.strip_bus.value === "StripLayer") {
        $dom.strip_layer_box.style.display = "block";
    } else {
        $dom.strip_layer_box.style.display = "none";
    }
});

$dom.strip_bus_num.addEventListener('change', function () {
    $settings.strip_bus_num = parseInt(this.value);
});

$dom.strip_layer.addEventListener('change', function () {
    $settings.strip_layer = parseInt(this.value);
});

$dom.value.addEventListener('input', debounce(function () {
    $settings.value = this.value;
}, DEBOUNCE_TIME));

$dom.long_press_value.addEventListener('input', debounce(function () {
    $settings.long_press_value = this.value;
}, DEBOUNCE_TIME));

$dom.title.addEventListener('change', function () {
    $settings.title = this.value;
});

$dom.title_prefix.addEventListener('input', debounce(function () {
    $settings.title_prefix = this.value;
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