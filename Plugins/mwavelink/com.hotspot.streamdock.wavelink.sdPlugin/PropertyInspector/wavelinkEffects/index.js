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
    typeEffect: $('#type-effect'),
    typeChain: $('#type-chain'),

    // selects
    inputSelect: $('#input-select'),

    // selects
    EffectSelect: $('#Effect-select'),
    EffectDiv: $('#Effect-div'),

    // selects
    outputSelect: $('#output-select'),
    outputDiv: $('#output-div'),
};

const inputFilterMap = {};
const $propEvent = {
    didReceiveSettings(data) {
        console.log(data);
        $settings.inputs.forEach(input => {
            inputFilterMap[input.name] = input.filters;
        });
        $dom.inputSelect.innerHTML = '';
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

        if ($settings.EffectSelect) {
            $dom.EffectSelect.value = $settings.EffectSelect;
        }

        const radio = document.querySelector(`input[name="type"][value="${$settings.TypeRadioValue}"]`);
        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change"));
        }
        if ($settings.outputSelect) {
            $dom.outputSelect.value = $settings.outputSelect;
        }

        toggleVolumeSlider(document.querySelector('input[name="type"]:checked').value);
    },
    sendToPropertyInspector(data) { }
};

function toggleVolumeSlider(value) {
    if (value === "effect") {
        $dom.EffectDiv.style.display = "";
        $dom.outputDiv.style.display = "none";
    } else if (value === "chain") {
        $dom.EffectDiv.style.display = "none";
        $dom.outputDiv.style.display = "";
    }
    $settings.TypeRadioValue = value;
}

document.querySelectorAll('input[name="type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        toggleVolumeSlider(e.target.value);
    });
});

$dom.inputSelect.addEventListener("change", (e) => {
    const selectedInput = e.target.value;
    const filters = inputFilterMap[selectedInput] || [];

    $dom.EffectSelect.innerHTML = "";
    if (filters.length > 0) {
        filters.forEach(f => {
            const option = document.createElement("option");
            option.value = f.filterID;
            option.textContent = f.name;
            $dom.EffectSelect.appendChild(option);
        });
    } else {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No filter found.";
        $dom.EffectSelect.appendChild(option);
    }
    // 好像没有触发effect的改变
    if ($settings.EffectSelect) {
        $dom.EffectSelect.value = $settings.EffectSelect;
    }
    $dom.EffectSelect.dispatchEvent(new Event("change"));

    if ($settings.outputSelect) {
        $dom.outputSelect.value = $settings.outputSelect;
    } else {
        $settings.outputSelect = $dom.outputSelect.value;
    }

    console.log("Input 改变:", selectedInput, $settings.outputSelect);
    $settings.inputSelect = selectedInput;
});

$dom.EffectSelect.addEventListener("change", (e) => {
    console.log("Effect 改变:", e.target.value);
    $settings.EffectSelect = e.target.value;
});

$dom.outputSelect.addEventListener("change", (e) => {
    console.log("Output 改变:", e.target.value);
    $settings.outputSelect = e.target.value;
});
