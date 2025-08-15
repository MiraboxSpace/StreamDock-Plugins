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
    CategorySelectID: $('#CategorySelectID')
};

let isInit = false;
const $propEvent = {
    didReceiveSettings(data) {
        console.log(data);
        $dom.CategorySelectID.value = $settings.CategorySelect || '';
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

        $dom.CategorySelectID.value = $settings.CategorySelect || '';
    }
};

function CategorySelectChange(value) {
    console.log('CategorySelectChange:', value);
    $settings.CategorySelect = value;
}
function RefreshButtonClick() {
    console.log('RefreshButtonClick clicked');

    const obj = {};
    obj.refresh = true;
    $websocket.sendToPlugin(obj);
}