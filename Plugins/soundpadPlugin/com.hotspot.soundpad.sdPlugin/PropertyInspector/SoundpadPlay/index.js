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

let $allSounds = [];
function populateSoundsByCategory(category) {
    const filtered = category
        ? $allSounds.filter(s => s.category === category)
        : $allSounds;

    $dom.SoundSelectID.innerHTML = '';
    filtered.forEach(sound => {
        const option = document.createElement('option');
        option.value = sound.name;
        option.textContent = sound.name;
        option.dataset.index = sound.index;
        $dom.SoundSelectID.appendChild(option);
    });
}

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

        $allSounds = data.CategoryAndSounds.sounds;
        $dom.CategorySelectID.value = $settings.CategorySelect || '';
        populateSoundsByCategory($settings.CategorySelect || '');
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

    populateSoundsByCategory(value);
    $dom.SoundSelectID.value = $settings.SoundSelect || '';

    const selectedOption = $dom.SoundSelectID.options[$dom.SoundSelectID.selectedIndex];
    if (selectedOption && selectedOption.dataset.index) {
        $dom.SoundIndexInputID.value = selectedOption.dataset.index;
        $settings.SoundIndexInput = selectedOption.dataset.index;
    } else {
        $dom.SoundIndexInputID.value = '';
        $settings.SoundIndexInput = '';
    }
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

    if ($settings.ShowTitleCheck) {
        const text = selectedOption?.textContent || $dom.SoundIndexInputID.value;
        setButtonImageWithTitle(text);
    }
}
function SoundIndexInputChange(value) {
    console.log('SoundIndexInputChange:', value);
    $settings.SoundIndexInput = value;
}
function setButtonImageWithTitle(text) {
    const img = new Image();
    img.src = "../../Images/sound.png";
    img.onload = function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const padding = 4;
        const maxWidth = canvas.width - padding * 2;

        ctx.font = "bold 11px Arial";
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(0, canvas.height - 18, canvas.width, 18);

        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(text, canvas.width / 2, canvas.height - 5, maxWidth);

        $websocket.setImage(canvas.toDataURL());
    };
}
function setButtonImage() {
    const img = new Image();
    img.src = "../../Images/sound.png";
    img.onload = function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        $websocket.setImage(canvas.toDataURL("image/png"));
    };
}
function ShowTitleCheckChange(checked) {
    console.log('ShowTitleCheckChange:', checked);
    $settings.ShowTitleCheck = checked;

    if (checked) {
        const text = $dom.SoundSelectID.options[$dom.SoundSelectID.selectedIndex]?.textContent || $dom.SoundIndexInputID.value;
        setButtonImageWithTitle(text);
    } else {
        setButtonImage();
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