/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true,
  $back = false,
  $dom = {
    main: $('.sdpi-wrapper'),
    logout: $('#logout'),
    logoutdiv: $('#logoutdiv'),
    output: $('#output'),
    outputBox: $('#outputBox'),
    input: $('#input'),
    inputBox: $('#inputBox'),
    mode: $('#mode'),
  };
const refresh = (settings) => {
  settings.mode = settings.mode || 'input';
  $dom.mode.value = settings.mode;
  // $dom.outputBox.style.display = 'flex'
  $dom.outputBox.style.display = 'none';
  $dom.inputBox.style.display = 'none';
  if ($dom.mode.value == 'input') {
    $dom.inputBox.style.display = 'flex';
  } else if ($dom.mode.value == 'output') {
    $dom.outputBox.style.display = 'flex';
  } else if ($dom.mode.value == 'both') {
    $dom.outputBox.style.display = 'flex';
    $dom.inputBox.style.display = 'flex';
  }

  if ('inputDevices' in settings) {
    $dom.input.innerHTML = '';
    settings.inputDevices.forEach((item) => {
      $dom.input.innerHTML += `<option value="${item.id}">${item.name}</option>`;
    });
    $dom.input.value = settings.input;
  }
  if ('outputDevices' in settings) {
    $dom.output.innerHTML = '';
    settings.outputDevices.forEach((item) => {
      $dom.output.innerHTML += `<option value="${item.id}">${item.name}</option>`;
    });
    $dom.output.value = settings.output;
  }
};
const $propEvent = {
  didReceiveSettings(data) {
    $websocket.getGlobalSettings();
    refresh(data.settings);
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

$dom.logout.on('click', () => {
  // $websocket.openUrl('http://127.0.0.1:26432/logout');
  $websocket.setGlobalSettings({ clientId: '', clientSecret: '', accessToken: '' });
});

$dom.mode.on('change', (e) => {
  $settings.mode = $dom.mode.value;
  refresh($settings);
});

$dom.input.on('change', (e) => {
  $settings.input = $dom.input.value;
});

$dom.output.on('change', (e) => {
  $settings.output = $dom.output.value;
});
