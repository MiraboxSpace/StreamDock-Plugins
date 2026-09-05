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
    // radio group
    typeSet: $('#type-set'),
    typeAdjust: $('#type-adjust'),
    typeMute: $('#type-mute'),
    // typeAdd: $('#type-add'),

    // selects
    inputSelect: $('#input-select'),
    outputSelect: $('#output-select'),
    fadingDiv: $('#fading-div'),
    fadingSelect: $('#fading-select'),

    outputDiv: $('#output-div'),

    // range
    volumeSlider: $('#volume-slider'),
    volumeRange: $('#volume-range'),

    // checkbox
    // chkColorIcon: $('#chk-color-icon'),

    // step size
    stepSlider: document.getElementById('step-slider'),
    stepRange: document.getElementById('step-range'),
};
const inputFilterMap = {};
const $propEvent = {
    didReceiveSettings(data) {
        console.log(data);

        $settings.inputs.forEach(input => {
            inputFilterMap[input.name] = input.filters;
        });
        $dom.inputSelect.innerHTML = '';
        // const option = document.createElement("option");
        // option.value = "Forground App";
        // option.textContent = "Forground App";
        // $dom.inputSelect.appendChild(option);

        // option = document.createElement("option");
        // option.value = "────────────────────";
        // option.textContent = "────────────────────";
        // $dom.inputSelect.appendChild(option);

        Object.keys(inputFilterMap).forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            $dom.inputSelect.appendChild(option);
        });

        if ($settings.inputSelect) {
            $dom.inputSelect.value = $settings.inputSelect;
        }
        $dom.inputSelect.dispatchEvent(new Event("change"));

        const radio = document.querySelector(`input[name="type"][value="${$settings.TypeRadioValue}"]`);
        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change"));
        }
        if ($settings.outputSelect) {
            $dom.outputSelect.value = $settings.outputSelect;
        }
        $dom.outputSelect.dispatchEvent(new Event("change"));

        if ($settings.fadingSelect) {
            $dom.fadingSelect.value = $settings.fadingSelect;
        }
        $dom.fadingSelect.dispatchEvent(new Event("change"));
        if ($settings.volumeRangeValue) {
            $dom.volumeRange.value = $settings.volumeRangeValue;
            $dom.volumeRange.title = $settings.volumeRangeValue + " %";
        }else{
            $settings.volumeRangeValue = $dom.volumeRange.value;
        }
        if ($settings.stepRange) {
            $dom.stepRange.value = $settings.stepRangeValue;
        }else{
            $settings.stepRangeValue = $dom.stepRange.value;
        }

        toggleVolumeSlider(document.querySelector('input[name="type"]:checked').value);
    },
    sendToPropertyInspector(data) { }
};

function toggleVolumeSlider(value) {
    if (value === "set") {
        $dom.outputDiv.style.display = "flex";
        $dom.fadingDiv.style.display = "";
        $dom.volumeSlider.style.display = "";
        $dom.stepSlider.style.display = "none";
    } else if (value === "adjust") {
        $dom.outputDiv.style.display = "flex";
        $dom.fadingDiv.style.display = "none";
        $dom.volumeSlider.style.display = "none";
        $dom.stepSlider.style.display = "";
    } else if (value === "mute") {
        $dom.outputDiv.style.display = "flex";
        $dom.fadingDiv.style.display = "none";
        $dom.volumeSlider.style.display = "none";
        $dom.stepSlider.style.display = "none";
    } else if (value === "add") {
        $dom.outputDiv.style.display = "none";
        $dom.fadingDiv.style.display = "none";
        $dom.volumeSlider.style.display = "none";
        $dom.stepSlider.style.display = "none";
    }
    $settings.TypeRadioValue = value;
}

document.querySelectorAll('input[name="type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        toggleVolumeSlider(e.target.value);
    });
});

$dom.inputSelect.addEventListener("change", (e) => {
    console.log("Input 改变:", e.target.value);
    $settings.inputSelect = e.target.value;
});

$dom.outputSelect.addEventListener("change", (e) => {
    console.log("Output 改变:", e.target.value);
    $settings.outputSelect = e.target.value;
});

$dom.fadingSelect.addEventListener("change", (e) => {
    console.log("Fading 改变:", e.target.value);
    $settings.fadingSelect = e.target.value;
});

$dom.volumeRange.addEventListener("input", () => {
    $dom.volumeRange.title = $dom.volumeRange.value + " %";
    console.log("$dom.volumeRange input", $dom.volumeRange.title);
    $settings.volumeRangeValue = $dom.volumeRange.value;
});

$dom.stepRange.addEventListener("input", () => {
    $dom.stepRange.title = $dom.stepRange.value + " %";
    console.log("$dom.stepRange input", $dom.stepRange.title);
    $settings.stepRangeValue = $dom.stepRange.value;
});