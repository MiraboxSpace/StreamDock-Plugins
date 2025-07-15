/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    sounds: $('#sounds'),
    search: $('#search'),
    logout: $('#logout'),
};

const $propEvent = {
    didReceiveSettings(data) {
        console.log(data);
        if ('sounds' in data.settings) {
            createHtml(data.settings);
        }
    },
    sendToPropertyInspector(data) {
        console.log(data);
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



$dom.logout.on('click', () => {
    $websocket.openUrl('http://127.0.0.1:26432/logout')
})

$dom.search.on('input', (e) => {
    if (e.target.value == '') {
        createHtml($settings)
        return
    }
    const filteredGroupedByGuild = {};
    Object.keys($settings.sounds).reverse().forEach(guildId => {
        const filteredSounds = $settings.sounds[guildId].filter(sound =>
            sound.name.includes(e.target.value)
        );
        if (filteredSounds.length > 0) {
            filteredGroupedByGuild[guildId] = filteredSounds;
        }
    });
    const temp = JSON.parse(JSON.stringify($settings));
    temp.sounds = filteredGroupedByGuild;
    createHtml(temp);
})

const addListener = (soundItem) => {
    soundItem.forEach((item) => {
        item.addEventListener('click', (e) => {
            soundItem.forEach(item => {
                item.classList.remove('active');
            });
            item.classList.add('active');
            $websocket.sendToPlugin({ key: e.target.getAttribute('key'), sound_id: e.target.getAttribute('soundId'), sounds: $settings.sounds, title: e.target.getAttribute('soundName'), emoji_name: e.target.getAttribute('emojiName') });
        });
    })
}

const createHtml = (settings) => {
    const sounds = settings.sounds;
    $dom.sounds.innerHTML = ''
    Object.keys(sounds).reverse().forEach(key => {
        let div = ''
        sounds[key].forEach(item => {
            console.log(settings.sound_id == item.sound_id);
            if (settings.sound_id == item.sound_id) {
                div += '<div class="soundItem active" key="' + key + '" soundId="' + item.sound_id + '" soundName="' + item.name + '" emojiName="' + item.emoji_name + '">' + (item.emoji_name ? item.emoji_name : '') + item.name + '</div>'
            } else {
                div += '<div class="soundItem" key="' + key + '" soundId="' + item.sound_id + '" soundName="' + item.name + '" emojiName="' + item.emoji_name + '">' + (item.emoji_name ? item.emoji_name : '') + item.name + '</div>'
            }
        })
        $dom.sounds.innerHTML += `
                    <div class="box">
                        <div class="title">
                            ${sounds[key][0].guild_name}
                        </div>
                        <div class="guild">${div}</div>
                    </div>
                `
    })
    const soundItem = document.querySelectorAll('.soundItem');
    addListener(soundItem);
}