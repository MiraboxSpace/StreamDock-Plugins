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
        title: $("#title"),
        mydevice: $("#mydevice")
    },
    $propEvent = {
        didReceiveSettings() {
            console.log($settings);
            if ($settings.mydevice) {
                console.log($settings.mydevice);
                $dom.mydevice.innerHTML = "";
                $settings.mydevice.forEach((item) => {
                    let option = `<option value="${item.value}">${item.name}</option>`
                    $dom.mydevice.innerHTML += option;
                })
            }
            if ($settings.select) {
                $dom.mydevice.value = $settings.select;
            }
        },
        sendToPropertyInspector(data) {
        }
    };
$dom.title.on("input", function () {
})

$dom.mydevice.on("change", function () {
    $websocket.sendToPlugin({ "mydevice": $dom.mydevice.value })
})