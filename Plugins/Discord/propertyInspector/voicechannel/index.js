/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true,
  $back = false,
  $dom = {
    main: $('.sdpi-wrapper'),
    select: $('#select'),
    select2: $('#select2'),
    box: $('#box'),
    box2: $('#box2'),
    logout: $('#logout'),
    logoutdiv: $('#logoutdiv'),
    refresh: $('#refresh'),
  };
const $propEvent = {
  didReceiveSettings(data) {
    $websocket.getGlobalSettings();
    $dom.select.innerHTML = '';
    console.log(data);
    data.settings?.guilds?.forEach(function (option) {
      let optionElement = document.createElement('option');
      optionElement.value = option.id;
      optionElement.innerText = option.name;
      $dom.select.appendChild(optionElement);
    });
    $dom.select2.innerHTML = '';
    data.settings?.channels?.forEach(function (option) {
      let optionElement = document.createElement('option');
      optionElement.value = option.id;
      optionElement.innerText = option.name;
      $dom.select2.appendChild(optionElement);
    });
    if (data.settings.select) {
      $dom.select.value = data.settings.select;
    }
    if (data.settings.channel) {
      $dom.select2.value = data.settings.channel;
    }
  },
  didReceiveGlobalSettings({ settings }) {
    console.log('Global setting');
    if (!settings.clientSecret) {
      openAuthorization();
    } else {
      logoutdiv.style.display = 'flex';
    }
  },
};

$dom.select.on('change', (e) => {
  $settings.select = e.target.value;
});

$dom.select2.on('change', (e) => {
  $settings.channel = e.target.value;
});

$dom.logout.on('click', () => {
  // $websocket.openUrl('http://127.0.0.1:26432/logout');
  $websocket.setGlobalSettings({ clientId: '', clientSecret: '', accessToken: '' });
});
$dom.refresh.on('click', () => {
  $websocket.sendToPlugin({ refresh: true });
});
