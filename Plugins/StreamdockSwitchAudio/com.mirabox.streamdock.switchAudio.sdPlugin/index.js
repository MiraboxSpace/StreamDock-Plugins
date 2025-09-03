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
        select: $('#select'),
        select2: $('#select2'),
        selectBox: $('#selectBox'),
        radio: $('.mode', true),
        device: $('.device', true)
    },
    $propEvent = {
        didReceiveSettings() {
            // console.log($settings);

            $dom.selectBox.style.display = $settings.radio == '0' ? 'none' : 'flex';
            $dom.select.innerHTML = ($settings.devices || []).map(item => {
                return `<option value="${item.deviceId}" ${$settings.select == item.deviceId ? "selected" : ""}>${item.deviceName}</option>`;
            }).join('');
            $dom.select2.innerHTML = ($settings.devices || []).map(item => {
                return `<option value="${item.deviceId}" ${$settings.select2 == item.deviceId ? "selected" : ""}>${item.deviceName}</option>`;
            }).join('');
            $dom.radio.forEach(item =>
                item.checked = item.value === $settings.radio ? true : false
            );
            $dom.device.forEach(item =>
                item.checked = item.value === $settings.device ? true : false
            );
        },
        sendToPropertyInspector(data) { }
    };


$dom.radio.forEach(item => item.on('change', function () {
    $settings.radio = this.value;
    $websocket.saveData(JSON.parse(JSON.stringify($settings)));
    $dom.selectBox.style.display = this.value == '0' ? 'none' : 'flex';
    $websocket.sendToPlugin({ settings: JSON.parse(JSON.stringify($settings)), flag2: true });
}));

$dom.device.forEach(item => item.on('change', function () {
    $settings.device = this.value;
    $websocket.sendToPlugin(JSON.parse(JSON.stringify($settings)));
}));

$dom.select.on('change', (e) => {
    $settings.select = e.target.value;
    $websocket.saveData(JSON.parse(JSON.stringify($settings)));
    $websocket.sendToPlugin({ settings: JSON.parse(JSON.stringify($settings)), flag2: true });
});

$dom.select2.on('change', (e) => {
    $settings.select2 = e.target.value;
    $websocket.saveData(JSON.parse(JSON.stringify($settings)));
});