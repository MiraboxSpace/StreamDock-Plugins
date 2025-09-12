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
    rotationStepInputElement: $('#rotationStepInputElement'),

    sliderValue: $('#sliderValue'),
    temperaturesliderInputElement: $('#temperaturesliderInputElement'),
    fadelengthInputElement: $('#fadelengthInputElement'),
    fadelengthLabel1Element: $('#fadelengthlabel1'),
    fadelengthLabel2Element: $('#fadelengthlabel2'),
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

        $dom.temperaturesliderInputElement.value = $settings.selectedSlider || 0;
        $dom.sliderValue.textContent = $dom.temperaturesliderInputElement.value;
        $dom.fadelengthInputElement.value = $settings.selectedFade || 0;

        $dom.rotationStepInputElement.value = $settings.rotationStep || 10;

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
    },
    sendToPropertyInspector(data) {
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
});

// input
$dom.rotationStepInputElement.addEventListener('input', function () {
    console.log('rotate step Length:', $dom.rotationStepInputElement.value);
    $settings.rotationStep = Number($dom.rotationStepInputElement.value);
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

