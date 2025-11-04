/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true,
	$back = false,
	$dom = {
		main: $('.sdpi-wrapper'),
		user: $('#user'),
		clearUser: $('#clearUser'),
		referenceTest: $('#reference'),
		channelTitle: $('#channelTitle'),
		gameId: $('#gameId'),
		selects: $('#selects'),
	};
const $propEvent = {
	// 操作持久化数据触发
	didReceiveSettings({ settings }) {
		if ('gameId' in settings) {
			$dom.gameId.value = settings.gameName;
		}
		if ('channelTitle' in settings) {
			$dom.channelTitle.value = settings.channelTitle;
		}
	},
	// 当插件使用 sendToPropertyInspector 事件时触发
	sendToPropertyInspector(data) {
		console.log('sendToPropertyInspector', data);
		// 初始化 不太好说
		// 表示需要执行 内容
		Object.keys(data).forEach(key => {
			executeMethod(key, data[key]);
		});
	},
	sendToPlugin(data) {
		console.log('sendToPlugin我被触发了。', data);
	},
};

//打开认证页面
$dom.user.on('click', function () {
	const tempToken = generateRandomString(32);
	console.log('我进来了！');
	$websocket.sendToPlugin({ saveLoginToken: tempToken });
	window.open('http://localhost:3000/validate?code=' + tempToken, Date.now(), 'width=400,height=300');
});

// 清理用户
$dom.clearUser.on('click', function () {
	fetch('http://localhost:3000/logout', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
	});
});

//  直播标题变化
$dom.channelTitle.on('input', event => {
	$settings.channelTitle = event.target.value;
});
// 游戏类型变化
$dom.gameId.on('input', event => {
	$dom.selects.innerHTML = '';
	console.log('event.target.value=  ', event.target.value);
	if (event.target.value === '' || event.target.value === null || event.target.value === undefined) {
		console.log('我现在又是空内容~');
		console.log('event.target.value=  ', event.target.value);
		$dom.selects.style.display = 'none';
		$settings.gameId = '';
        $settings.gameName = ''
	} else {
		debounce(event.target.value);
		$settings.gameName = event.target.value;
	}

	// if(event.target.textContent.length === 0 )
	// $settings.gameId = ''; // 这里很有可能会导致 gameId 变为空
	// 获取文本框和下拉框的值
});
const debounce = $.debounce(function (value) {
	const url = 'http://localhost:3000/getGameNameOrGameId?gameId=' + value;
	// 发起 GET 请求
	fetch(url)
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		})
		.then(result => {
			result.data.forEach(element => {
				$dom.selects.insertAdjacentHTML(
					'beforeend',
					`<option class="overflow-text" id="${element.id}">${element.name}</option>`
				);
			});
			$dom.selects.style.display = 'block';
		})
		.catch(error => {
			// 处理请求错误
			console.error('Fetch error:', error);
		});
}, 200);

$dom.selects.on('click', function (event) {
	$dom.gameId.value = $settings.gameName = event.target.textContent;
	$settings.gameId = event.target.id;
});
$dom.gameId.on('focus', event => {
	if ($dom.selects.firstChild) {
		$dom.selects.style.display = 'block';
	}
});
$dom.gameId.on('blur', event => {
	setTimeout(function () {
		$dom.selects.style.display = 'none';
	}, 200);
});

// 更新登录用户文本框
function inputChange(text) {
	console.log(text);
	const option = $dom.user.getElementsByTagName('option')[0];
	if (text != '' && text != '{}') {
		option.innerText = text;
		option.selected = true;
		option.disabled = false;
	} else {
		option.innerText = '未登录';
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
function openRemindinWindow10(messageObj) {
	var id = `message${++index}`;
	var context = `<div class="sdpi-item" id="${id}">
    <div style="
    flex: none;
    width: 94px;
    padding-right: 4px;
    font-weight: 600"> </div>
    <span class="sdpi-item-value" style="text-align: center; color: red;"> ${messageObj.message}</span>
</div>`;
	$dom.referenceTest.insertAdjacentHTML('afterend', context);
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
