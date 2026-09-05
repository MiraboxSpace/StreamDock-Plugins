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
    typeToggle: $('#type-toggle'),
    // typemanage: $('#type-manage'),

    // selects
    outputSelect: $('#output-select'),
    outputDiv: $('#output-div'),

    submixSelect: $('#submix-select'),
    submixDiv: $('#submix-div'),

    primarySelect: $('#primary-select'),
    primaryDiv: $('#primary-div'),

    secondarySelect: $('#secondary-select'),
    secondaryDiv: $('#secondary-div'),
};


var localMixers = [];
var streamMixers = [];
function populateSubmixSelect(selectElement, deviceNames) {
    selectElement.innerHTML = '';

    deviceNames.forEach(deviceName => {
        const option = document.createElement('option');
        option.value = deviceName;
        option.textContent = deviceName;
        selectElement.appendChild(option);
    });
}
// 互斥  primarySelect secondarySelect
function updateDisabledOptions() {
    // 重置所有禁用
    [...$dom.primarySelect.options].forEach(opt => opt.disabled = false);
    [...$dom.secondarySelect.options].forEach(opt => opt.disabled = false);

    // 禁用互斥值
    if ($dom.primarySelect.value) {
        [...$dom.secondarySelect.options].forEach(opt => {
            if (opt.value === $dom.primarySelect.value) opt.disabled = true;
        });
    }
    if ($dom.secondarySelect.value) {
        [...$dom.primarySelect.options].forEach(opt => {
            if (opt.value === $dom.secondarySelect.value) opt.disabled = true;
        });
    }
}
const $propEvent = {
    didReceiveSettings(data) {
        console.log(data);
        if ($settings.localMixer && Array.isArray($settings.localMixer)) {
            localMixers = [];
            $settings.localMixer.forEach(device => {
                if (device.name) {
                    localMixers.push(device.name);
                }
            });
        }

        if ($settings.streamMixer && Array.isArray($settings.streamMixer)) {
            streamMixers = [];
            $settings.streamMixer.forEach(device => {
                if (device.name) {
                    streamMixers.push(device.name);
                }
            });
        }

        if ($settings.outputSelect === "monitor-mix") {
            populateSubmixSelect($dom.submixSelect, localMixers);
            populateSubmixSelect($dom.primarySelect, localMixers);
            populateSubmixSelect($dom.secondarySelect, localMixers);

            $dom.primarySelect.value = $settings.primarySelect || localMixers[0];
            updateDisabledOptions();
            $dom.secondarySelect.value = $settings.secondarySelect || localMixers[1];
            updateDisabledOptions();
        } else if ($settings.outputSelect === "stream-mix") {
            populateSubmixSelect($dom.submixSelect, streamMixers);
            populateSubmixSelect($dom.primarySelect, streamMixers);
            populateSubmixSelect($dom.secondarySelect, streamMixers);

            $dom.primarySelect.value = $settings.primarySelect || streamMixers[0];
            updateDisabledOptions();
            $dom.secondarySelect.value = $settings.secondarySelect || streamMixers[1];
            updateDisabledOptions();
        }

        const radio = document.querySelector(`input[name="type"][value="${$settings.TypeRadioValue}"]`);
        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change"));
        }
        if ($settings.outputSelect) {
            $dom.outputSelect.value = $settings.outputSelect;
        }
        $dom.outputSelect.dispatchEvent(new Event("change"));

        if ($settings.submixSelect) {
            $dom.submixSelect.value = $settings.submixSelect;
        }
        
        toggleVolumeSlider(document.querySelector('input[name="type"]:checked').value);
    },
    sendToPropertyInspector(data) { }
};

function toggleVolumeSlider(value) {
    if (value === "set") {
        $dom.outputDiv.style.display = "";
        $dom.submixDiv.style.display = "";
        $dom.primaryDiv.style.display = "none";
        $dom.secondaryDiv.style.display = "none";
    } else if (value === "manage") {
        $dom.outputDiv.style.display = "none";
        $dom.submixDiv.style.display = "none";
        $dom.primaryDiv.style.display = "none";
        $dom.secondaryDiv.style.display = "none";
    } else if (value === "toggle") {
        $dom.outputDiv.style.display = "";
        $dom.submixDiv.style.display = "none";
        $dom.primaryDiv.style.display = "";
        $dom.secondaryDiv.style.display = "";
    }
    $settings.TypeRadioValue = value;
}

document.querySelectorAll('input[name="type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        toggleVolumeSlider(e.target.value);
        $settings.TypeRadioValue = e.target.value;

        if ($settings.outputSelect) {
            $dom.outputSelect.value = $settings.outputSelect;
        }
        $dom.outputSelect.dispatchEvent(new Event("change"));
    });
});

function initPrimarySecondary(mixers) {
    // primary
    if ($settings.primarySelect) {
        $dom.primarySelect.value = $settings.primarySelect;
    } else {
        const candidate = mixers.find(m => m !== $dom.secondarySelect.value);
        if (candidate) {
            $dom.primarySelect.value = candidate;
            $settings.primarySelect = candidate;
        }
    }
    updateDisabledOptions();

    // secondary
    if ($settings.secondarySelect) {
        $dom.secondarySelect.value = $settings.secondarySelect;
    } else {
        const candidate = mixers.find(m => m !== $dom.primarySelect.value);
        if (candidate) {
            $dom.secondarySelect.value = candidate;
            $settings.secondarySelect = candidate;
        }
    }
    updateDisabledOptions();
}
$dom.outputSelect.addEventListener("change", (e) => {
    console.log("Output 改变:", e.target.value);
    $settings.outputSelect = e.target.value;

    if ($settings.outputSelect === "monitor-mix") {
        populateSubmixSelect($dom.submixSelect, localMixers);
        populateSubmixSelect($dom.primarySelect, localMixers);
        populateSubmixSelect($dom.secondarySelect, localMixers);

        initPrimarySecondary(localMixers);
    } else if ($settings.outputSelect === "stream-mix") {
        populateSubmixSelect($dom.submixSelect, streamMixers);
        populateSubmixSelect($dom.primarySelect, streamMixers);
        populateSubmixSelect($dom.secondarySelect, streamMixers);

        initPrimarySecondary(streamMixers);
    }
});

$dom.submixSelect.addEventListener("change", (e) => {
    console.log("submixSelect 改变:", e.target.value);
    $settings.submixSelect = e.target.value;
});

$dom.primarySelect.addEventListener("change", (e) => {
    console.log("primarySelect 改变:", e.target.value);
    $settings.primarySelect = e.target.value;
    updateDisabledOptions();
});

$dom.secondarySelect.addEventListener("change", (e) => {
    console.log("secondarySelect 改变:", e.target.value);
    $settings.secondarySelect = e.target.value;
    updateDisabledOptions();
});
