/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

/**
 * 基础参数说明:
 *      @global websocket uuid action context settings lang
 *      @settings local back 是否国际化 | 是否自行回显
 *      @policy dom propEvent 缓存文档元素 | 软件触发事件 - 策略模式
 * =======================================================================>
 */

let webcamStr = '', propStr = '';
const $local = false, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    webcamElement: $('#webcamSelect'),
    propElement: $('#propertySelect'),
    checkboxElement: $('#chk1'),
    titlePrefixElement: $('#titlePrefixItem'),
    titlePrefixInputElement: $('#titlePrefixItem input'),

    temperaturesliderElement: $('#temperatureslider'),
    fadelengthElement: $('#fadelength'),
    fadelengthLabel1Element: $('#fadelengthlabel1'),
    fadelengthLabel2Element: $('#fadelengthlabel2'),
    steplengthElement: $('#steplength'),

    sliderValue: $('#sliderValue'),
    temperaturesliderInputElement: $('#temperaturesliderInputElement'),
    fadelengthInputElement: $('#fadelengthInputElement'),
    steplengthInputElement: $('#steplengthInputElement'),

    supportTipsElement: $('#supportTips')
};
let camerasLoaded = false;
const $propEvent = {
    async didReceiveSettings(data) {
        console.log('didReceiveSettings', JSON.stringify(data));
        if (!camerasLoaded) {
            await listCameras();
            camerasLoaded = true;
        }
        $dom.webcamElement.value = $settings.webcamStr || "";
        if ($settings.propStr == null || $settings.propStr === '') {
            $dom.propElement.value = "-Select Value-";
        } else {
            $dom.propElement.value = $settings.propStr;
        }
        $dom.checkboxElement.checked = $settings.checked || false;
        if ($dom.checkboxElement.checked) {
            $dom.titlePrefixElement.style.display = 'flex';
        }

        let radioButton = document.getElementById(`rdio${$settings.selected}`);
        if (radioButton) {
            if (radioButton.value != document.querySelector('input[name="rdio"]:checked').value) {
                radioButton.setAttribute("checked", true);
                const event = new Event('change');
                radioButton.dispatchEvent(event);
                console.log('触发radio事件');
            }
        }

        $dom.temperaturesliderInputElement.value = $settings.selectedSlider || 0;
        $dom.sliderValue.textContent = $dom.temperaturesliderInputElement.value;
        $dom.fadelengthInputElement.value = $settings.selectedFade || 0;
        $dom.steplengthInputElement.value = $settings.selectedStep || 10;
          
        if ($settings.Support == false) {
            $dom.supportTipsElement.style.display = 'flex';
        } else {
            $dom.supportTipsElement.style.display = 'none';
        }
    },
    sendToPropertyInspector(data) {
        //如果数据是不需要持久化存起来的就在c++那边调用sendToPropertyInspector，这里就会收到sendToPropertyInspector这个事件

    }
};
//获取dom有封装的方法
async function listCameras() {
    let webcamData = [];
    try {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (err) {
            console.error('用户拒绝摄像头权限或其他错误:', err);
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');

        cameras.forEach(camera => {
            console.log('camera.label: ' + camera.label, 'camera.deviceId: ' + camera.deviceId)
            webcamData.push({
                label: camera.label
            });
        });
    } catch (err) {
        console.error('获取摄像头失败:', err);
    }
    webcamData.forEach(function (webcam) {
        const option = document.createElement('option');
        option.value = webcam.label;
        option.textContent = webcam.label;
        $dom.webcamElement.appendChild(option);
    });
}

// 下拉改变
$dom.webcamElement.addEventListener('change', function () {
    $settings.webcamStr = this.value
});
$dom.propElement.addEventListener('change', function () {
    $settings.propStr = this.value

    const radioButton = document.querySelector('input[name="rdio"]:checked');
    const event = new Event('change');
    radioButton.dispatchEvent(event);
});

// checbox选择
$dom.checkboxElement.addEventListener('change', function () {
    if ($dom.checkboxElement.checked) {
        $dom.titlePrefixElement.style.display = 'flex';
        $settings.checked = true;
    } else {
        $dom.titlePrefixElement.style.display = 'none';
        $settings.checked = false;
    }
});

// input
$dom.titlePrefixInputElement.addEventListener('input', function () {
    var text = $dom.titlePrefixInputElement.value;
    console.log('输入框的内容:', text);
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var img = new Image();
    img.src = "../../Images/webcamAction.png";

    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        ctx.font = "14px Arial";
        ctx.fillStyle = "white";

        var textWidth = ctx.measureText(text).width;
        var x = (canvas.width - textWidth) / 2;
        var y = canvas.height - 10;

        ctx.fillText(text, x, y);
        var newImage = canvas.toDataURL();
        console.log(newImage);
        $websocket.setImage(newImage)
    };
});

document.querySelectorAll('input[name="rdio"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        const radioButton = document.querySelector('input[name="rdio"]:checked');
        console.log('选中的值是：', radioButton.value);
        // 1 2不管 3显示进度条 4显示步长
        if (radioButton.value == "3") {
            // 显示滑动条
            $dom.temperaturesliderElement.style.display = 'flex';
            $dom.fadelengthElement.style.display = 'flex';
            $dom.fadelengthLabel1Element.style.display = 'block';
            $dom.fadelengthLabel2Element.style.display = 'block';
            $dom.steplengthElement.style.display = 'none';

            var range = {
                min: $settings.Min,
                max: $settings.Max
            }
            $dom.temperaturesliderInputElement.setAttribute("min", range.min);
            $dom.temperaturesliderInputElement.setAttribute("max", range.max);

            if ($dom.sliderValue.textContent < range.min) {
                $dom.sliderValue.textContent = range.min;
                $dom.temperaturesliderInputElement.value = range.min;
                $settings.selectedSlider = Number(range.min);
            } else if ($dom.sliderValue.textContent > range.max) {
                $dom.sliderValue.textContent = range.max;
                $dom.temperaturesliderInputElement.value = range.max;
                $settings.selectedSlider = Number(range.max);
            }
            console.log("range: ", range.min, range.max, " slider value: ", $dom.temperaturesliderInputElement.value);
        } else {
            $dom.temperaturesliderElement.style.display = 'none';
            $dom.fadelengthElement.style.display = 'none';
            $dom.fadelengthLabel1Element.style.display = 'none';
            $dom.fadelengthLabel2Element.style.display = 'none';

            if (radioButton.value == "4") {
                // 显示步长
                $dom.steplengthElement.style.display = 'flex';
            } else {
                $dom.steplengthElement.style.display = 'none';
            }
        }
        $settings.selected = Number(radioButton.value);
    });
});

$dom.temperaturesliderInputElement.addEventListener('change', function () {
    console.log('Temperature Value:', $dom.temperaturesliderInputElement.value);
    $dom.sliderValue.textContent = $dom.temperaturesliderInputElement.value;
    $settings.selectedSlider = Number($dom.temperaturesliderInputElement.value);
});

$dom.fadelengthInputElement.addEventListener('input', function () {
    console.log('Fade Length (ms):', $dom.fadelengthInputElement.value);
    $settings.selectedFade = Number($dom.fadelengthInputElement.value);
});

$dom.steplengthInputElement.addEventListener('input', function () {
    console.log('Step Length:', $dom.steplengthInputElement.value);
    $settings.selectedStep = Number($dom.steplengthInputElement.value);
});
