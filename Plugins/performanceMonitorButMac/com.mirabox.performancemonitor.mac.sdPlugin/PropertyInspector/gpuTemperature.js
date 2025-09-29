const $local = true, $back = false, $dom = {
    main: document.querySelector('.sdpi-wrapper'),
    colorLowThreshold: document.getElementById('colorLowThreshold'),
    lowThresholdItem: document.getElementById('lowThresholdItem'),
    colorHighThreshold: document.getElementById('colorHighThreshold'),
    highThresholdItem: document.getElementById('highThresholdItem')
};
const $propEvent = {
    didReceiveSettings(data) {
        // 设置默认值
        $settings = data.settings || {};
        $settings.monitorType = 6;
        // 低阈值
        if ($settings.colorLowThreshold !== undefined && $dom.colorLowThreshold) {
            $dom.colorLowThreshold.value = colorToString($settings.colorLowThreshold);
        }
        else {
            $dom.colorLowThreshold.value = "#ffff00";
            $settings.colorLowThreshold = stringToColor("#ffff00");
        }
        if ($settings.lowThresholdItem !== undefined && $dom.lowThresholdItem) {
            $dom.lowThresholdItem.value = $settings.lowThresholdItem;
        }
        else {
            $settings.lowThresholdItem = 5;
            $dom.lowThresholdItem.value = 5;
        }

        // 高阈值
        if ($settings.colorHighThreshold !== undefined && $dom.colorHighThreshold) {
            $dom.colorHighThreshold.value = colorToString($settings.colorHighThreshold);
        }
        else {
            $dom.colorHighThreshold.value = "#ff0000";
            $settings.colorHighThreshold = stringToColor("#ff0000");
        }
        if ($settings.highThresholdItem !== undefined && $dom.highThresholdItem) {
            $dom.highThresholdItem.value = $settings.highThresholdItem;
        } else {
            $settings.highThresholdItem = 95;
            $dom.highThresholdItem.value = 95;
        }
        if ($websocket) {
            $websocket.saveData($settings);
        }
    },
    // 插件向属性检查器发送数据时调用
    sendToPropertyInspector(data) {

    }
};

// Listen the change event for colorLowThreshold
$dom.colorLowThreshold.addEventListener('change', function () {
    $settings.colorLowThreshold = stringToColor(this.value);
    // 发送设置到插件
    if ($websocket) {
        $websocket.saveData($settings);
    }
})

// Listen the change event for lowThresholdItem
$dom.lowThresholdItem.addEventListener('change', function () {
    $settings.lowThresholdItem = parseInt(this.value);
    // 发送设置到插件
    if ($websocket) {
        $websocket.saveData($settings);
    }
})

// Listen the change event for colorHighThreshold
$dom.colorHighThreshold.addEventListener('change', function () {
    $settings.colorHighThreshold = stringToColor(this.value);
    // 发送设置到插件
    if ($websocket) {
        $websocket.saveData($settings);
    }
});

//  Listen the change event for highThresholdItem
$dom.highThresholdItem.addEventListener('change', function () {
    $settings.highThresholdItem = parseInt(this.value);
    // 发送设置到插件
    if ($websocket) {
        $websocket.saveData($settings);
    }
});

// Convert a color integer like 0xrrggbb to a string like "#RRGGBB"
function colorToString(color) {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Convert a color string like "#RRGGBB" to an e.g. 0xrrggbb integer
function stringToColor(colorString) {
    if (colorString.length !== 7 || colorString[0] !== '#') {
        return null;
    }

    const r = parseInt(colorString.slice(1, 3), 16);
    const g = parseInt(colorString.slice(3, 5), 16);
    const b = parseInt(colorString.slice(5, 7), 16);
    // 0xrrggbb
    return (r << 16) | (g << 8) | b;
}