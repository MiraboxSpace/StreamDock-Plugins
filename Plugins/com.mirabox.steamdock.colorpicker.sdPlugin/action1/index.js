const $local = true, $back = false, $dom = {
    main: document.querySelector('.sdpi-wrapper'),
    SelectType: document.getElementById('SelectType'),
    DisplayFormatType: document.getElementById('DisplayFormatType'),
    copyToClipboard: document.getElementById('copyToClipboard')
};

// 处理来自StreamDock的事件
const $propEvent = {
    didReceiveSettings(data) {
        // 设置默认值
        let settings = data.settings || {};

        // 设置取样方式 - 默认 KEY_PRESS (0)
        if ($dom.SelectType) {
            $dom.SelectType.selectedIndex = settings.SelectType !== undefined ? settings.SelectType : 0;
        }

        // 设置显示方式 - 默认COLOR_NAME (0)
        if ($dom.DisplayFormatType) {
            $dom.DisplayFormatType.selectedIndex = settings.DisplayFormatType !== undefined ? settings.DisplayFormatType : 0;
        }

        // 设置复制到剪贴板 - 默认false
        if ($dom.copyToClipboard) {
            $dom.copyToClipboard.checked = settings.copyToClipboard !== undefined ? settings.copyToClipboard : false;
        }
    },
    // 插件向属性检查器发送数据时调用
    sendToPropertyInspector(data) {

    }
};


// 为取样方式添加变化监听器
$dom.SelectType.addEventListener('change', function () {
    $settings.SelectType = this.selectedIndex;
});


// 为显示方式添加变化监听器
$dom.DisplayFormatType.addEventListener('change', function () {
    $settings.DisplayFormatType = this.selectedIndex;
});


// 为复制到剪贴板添加变化监听器
$dom.copyToClipboard.addEventListener('change', function () {
    $settings.copyToClipboard = this.checked;
});





