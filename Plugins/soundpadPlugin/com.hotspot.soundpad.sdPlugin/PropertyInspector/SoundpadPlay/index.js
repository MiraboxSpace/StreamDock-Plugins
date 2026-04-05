/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

/**
 * 基础参数说明:
 *      @global websocket uuid action context settings lang
 *      @settings local back 是否国际化 | 是否自行回显
 *      @policy dom propEvent 缓存文档元素 | 软件触发事件 - 策略模式
 * =======================================================================>
 */

const $local = false, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    CategorySelectID: $('#CategorySelectID'),
    SoundSelectID: $('#SoundSelectID'),
    SoundIndexInputID: $('#SoundIndexInputID'),
    ShowTitleCheckID: $('#ShowTitleCheckID'),
    PTPModeCheckID: $('#PTPModeCheckID'),
};

const $propEvent = {
    didReceiveSettings(data) {
        console.log(data);
        $dom.CategorySelectID.value = $settings.CategorySelect || '';
        $dom.SoundSelectID.value = $settings.SoundSelect || '';
        $dom.SoundIndexInputID.value = $settings.SoundIndexInput || '';
        $dom.ShowTitleCheckID.checked = $settings.ShowTitleCheck || false;
        $dom.PTPModeCheckID.checked = $settings.PTPModeCheck || false;
    },
    sendToPropertyInspector(data) {
        console.log(data);

        $dom.CategorySelectID.innerHTML = '';
        data.CategoryAndSounds.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            $dom.CategorySelectID.appendChild(option);
        });

        $dom.SoundSelectID.innerHTML = '';
        data.CategoryAndSounds.sounds.forEach(sound => {
            const option = document.createElement('option');
            const isObject = typeof sound === 'object' && sound !== null;
            option.value = isObject ? sound.name : sound;
            option.textContent = isObject ? sound.name : sound;
            if (isObject) option.dataset.index = sound.index;
            $dom.SoundSelectID.appendChild(option);
        });

        $dom.CategorySelectID.value = $settings.CategorySelect || '';
        $dom.SoundSelectID.value = $settings.SoundSelect || '';

        // Auto-restore index after dropdown repopulation (e.g. after Refresh)
        const selectedOption = $dom.SoundSelectID.options[$dom.SoundSelectID.selectedIndex];
        if (selectedOption && selectedOption.dataset.index) {
            $dom.SoundIndexInputID.value = selectedOption.dataset.index;
            $settings.SoundIndexInput = selectedOption.dataset.index;
        } else {
            $dom.SoundIndexInputID.value = $settings.SoundIndexInput || '';
        }
    }
};

function CategorySelectChange(value) {
    console.log('CategorySelectChange:', value);
    $settings.CategorySelect = value;
}
function SoundSelectChange(value) {
    console.log('SoundSelectChange:', value);
    $settings.SoundSelect = value;

    // Auto-populate Sound Index from the selected option's data-index
    const selectedOption = $dom.SoundSelectID.options[$dom.SoundSelectID.selectedIndex];
    if (selectedOption && selectedOption.dataset.index) {
        const index = selectedOption.dataset.index;
        $dom.SoundIndexInputID.value = index;
        $settings.SoundIndexInput = index;
        console.log('Auto-populated SoundIndex:', index);
    }
}
function SoundIndexInputChange(value) {
    console.log('SoundIndexInputChange:', value);
    $settings.SoundIndexInput = value;
}
function ShowTitleCheckChange(checked) {
    console.log('ShowTitleCheckChange:', checked);
    $settings.ShowTitleCheck = checked;

    const text = $dom.SoundSelectID.options[$dom.SoundSelectID.selectedIndex]?.textContent || $dom.SoundIndexInputID.value;

    if (checked) {
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        var img = new Image();
        img.src = "../../Images/sound.png";
        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            ctx.font = "17px Arial";
            ctx.fillStyle = "white";

            var textWidth = ctx.measureText(text).width;
            var x = (canvas.width - textWidth) / 2;
            var y = canvas.height - 10;

            ctx.fillText(text, x, y);
            var newImage = canvas.toDataURL();
            console.log(newImage);
            $websocket.setImage(newImage)
        };
    } else {
        const img = new Image();
        img.src = "../../Images/sound.png";
        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL("image/png");
            $websocket.setImage(dataURL)
        };
    }
}
function PTPModeCheckChange(checked) {
    console.log('PTPModeCheckChange:', checked);
    $settings.PTPModeCheck = checked;
}
function RefreshButtonClick() {
    console.log('RefreshButtonClick clicked');

    const obj = {};
    obj.refresh = true;
    $websocket.sendToPlugin(obj);
}