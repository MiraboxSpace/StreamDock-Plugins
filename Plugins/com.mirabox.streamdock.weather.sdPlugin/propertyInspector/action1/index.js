/**
 * 基础参数说明:
 *      @local 是否国际化
 *      @back 自主决定回显时机
 *      @dom 保存需要的文档元素
 *      @propEvent 软件回调事件 - 策略模式
 * ==================================================>
 */
const $local = true, $back = false,
    $dom = {
        main: $('.sdpi-wrapper'),
        titleWrap: $('#titleWrap'),
        tempList: $('#tempList'),
        inputCity: $('#inputCity'),
        inputTitle: $('#inputTitle'),
        themeList: $('#themeList'),
        searchBtn: $('#searchBtn'),
        searchList: $('#searchList'),
        radio: $('input[name="rdio"]', true),
        radio2: $('input[name="rdio2"]', true),
        radioUseApi: $('input[name="radioUseApi"]', true)

    },
    $propEvent = {
        didReceiveSettings() {
            $dom.searchList.innerHTML = ($settings.searchList || []).map(item => {
                return `<option value="${item.id}">${item.name}</option>`;
            }).join('');
            $dom.tempList.value = $settings.tempList || '0';
            $dom.inputCity.value = $settings.inputCity || '';
            $dom.inputTitle.value = $settings.title || '';
            $dom.searchList.value = $settings.cityId || '';
            $dom.themeList.value = $settings.theme || 'Modern';
            titleWrap.style.display = ($settings.radio || '0') == '0' ? 'none' : 'flex';
            $dom.radio.forEach(item =>
                item.checked = item.value === ($settings.radio || '0') ? true : false);
            $dom.radio2.forEach(item =>
                item.checked = item.value === ($settings.radio2 || '0') ? true : false);
            $dom.radioUseApi.forEach(item =>
                item.checked = item.value === ($settings.radioUseApi || 'qweather') ? true: false);
        },
        sendToPropertyInspector(data) { }
    };

// 从这里开始...
$dom.radioUseApi.forEach(item => item.on('change', function () {
    $settings.radioUseApi = this.value;
    $websocket.sendToPlugin({ radioUseApi: this.value });
}));

$dom.radio.forEach(item => item.on('change', function () {
    $settings.radio = this.value;
    $websocket.sendToPlugin({ radio: this.value });
    titleWrap.style.display = this.value == '0' ? 'none' : 'flex';
}));

$dom.radio2.forEach(item => item.on('change', function () {
    $settings.radio2 = this.value;
    $websocket.sendToPlugin({ radio2: this.value });
}));

// 防抖查询城市列表
const searchFunc = $.debounce(() => {
    $websocket.sendToPlugin({ inputCity: $dom.inputCity.value });
}, 1000);
$dom.inputCity.on('input', () => {
    searchFunc();
    $settings.inputCity = $dom.inputCity.value;
});

// 切换温度单位
$dom.tempList.on('change', () => {
    $settings.tempList = $dom.tempList.value;
    $websocket.sendToPlugin({ tempList: $dom.tempList.value });
});

// 搜索天气
$dom.searchList.on('change', () => {
    $settings.cityId = $dom.searchList.value;
    $websocket.sendToPlugin({ cityId: $dom.searchList.value });
});
$dom.searchBtn.on('click', () => {
    $websocket.sendToPlugin({ cityId: $dom.searchList.value });
});

// 自定义标题
$dom.inputTitle.on('input', () => {
    $settings.title = $dom.inputTitle.value;
    $websocket.sendToPlugin({ title: $dom.inputTitle.value });
});

// 主题切换
$dom.themeList.on('change', () => {
    $settings.theme = $dom.themeList.value;
    $websocket.sendToPlugin({ theme: $dom.themeList.value });
});