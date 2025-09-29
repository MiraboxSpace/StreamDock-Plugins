const $local = true, $back = false, $dom = {
    main: document.querySelector('.sdpi-wrapper'),
};
const $propEvent = {
    didReceiveSettings(data) {
        // 设置默认值
        $settings = data.settings || {};
        $settings.monitorType = 4;

        if ($websocket) {
            $websocket.saveData($settings);
        }
    },
    // 插件向属性检查器发送数据时调用
    sendToPropertyInspector(data) {

    }
};

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