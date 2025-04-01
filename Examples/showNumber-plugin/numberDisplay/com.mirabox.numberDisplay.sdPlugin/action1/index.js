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
        number: $("#number")
    },
    $propEvent = {
        didReceiveSettings() {
            console.log($settings);
            if ($settings.number) {
                $dom.number.value = $settings.number
            }
        },
        sendToPropertyInspector(data) { }
    };
$dom.number.on("input", function () {
    $websocket.sendToPlugin({ "number": $dom.number.value })
})