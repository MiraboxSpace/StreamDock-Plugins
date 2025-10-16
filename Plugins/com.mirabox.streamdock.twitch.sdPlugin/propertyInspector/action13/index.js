/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />
// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    user: $('#user'),
    clearUser: $('#clearUser'),
    referenceTest: $('#reference'),

};
const $propEvent = {
    // 操作持久化数据触发  
    didReceiveSettings({ settings }) {

    },
    // 当插件使用 sendToPropertyInspector 事件时触发
    sendToPropertyInspector(data) {
        console.log("sendToPropertyInspector", data)
        // 初始化 不太好说
        // 表示需要执行 内容
        Object.keys(data).forEach(key => {
            executeMethod(key, data[key])
        });
    },
    sendToPlugin(data) {
        console.log("sendToPlugin我被触发了。", data)
    }
};

//打开认证页面
$dom.user.on('click', function () {
    const tempToken = generateRandomString(32);
    console.log("我进来了！")
    $websocket.sendToPlugin({ "saveLoginToken": tempToken })
    $websocket.openUrl('http://localhost:3000/validate?code=' + tempToken, Date.now());
});

// 清理用户
$dom.clearUser.on("click", function () {
    fetch('http://localhost:3000/logout', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
	});
});


// 更新登录用户文本框
function inputChange(text) {
    console.log(text)
    const option = $dom.user.getElementsByTagName("option")[0];
    if (text != "" && text != "{}") {
        option.innerText = text;
        option.selected = true;
        option.disabled = false;
    } else {
        option.innerText = $lang['未登录'];
        option.disabled = true;
    }
}
// 打开登录用户窗口
function openLoginWindow() {
    $dom.user.click();
}

// 传递方法名和参数
function executeMethod(methodName, parameter) {
    // 使用 window[methodName] 获取方法引用，然后调用它
    if (typeof window[methodName] === 'function') {
        window[methodName](parameter);
    } else {
        console.error(`Method ${methodName} not found.`);
    }
}


var index = 0;
function openRemindinWindow13(messageObj) {
    var id = `message${++index}`;
    var context = `<div class="sdpi-item" id="${id}">
    <div style="
    flex: none;
    width: 94px;
    padding-right: 4px;
    font-weight: 600"> </div>
    <span class="sdpi-item-value" style="text-align: center; color: red;"> ${messageObj.message}</span>
</div>`;
    $dom.referenceTest.insertAdjacentHTML('afterend', context)
    // 设置定时器，5秒后执行删除操作
    setTimeout(function () {
        // 获取要删除的子元素
        var childElement = document.getElementById(id);
        // 删除子元素
        if (childElement) {
            childElement.parentNode.removeChild(childElement);
        }
    }, messageObj.time);
}

