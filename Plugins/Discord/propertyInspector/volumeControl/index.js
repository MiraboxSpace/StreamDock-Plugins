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
    rdio1: $('#rdio1'),
    rdio2: $('#rdio2'),
    slider: $('#slider'),
    box: $('#box'),
    temperatureslider: $('#temperatureslider'),
  };
const $propEvent = {
  didReceiveSettings(data) {
    $websocket.getGlobalSettings();
    if (data.settings.rdio == 'input') {
      $dom.rdio1.value = 'input';
      $dom.rdio1.checked = true;
      $dom.slider.max = 100;
    } else {
      $settings.rdio = 'output';
      $dom.rdio2.value = 'output';
      $dom.rdio2.checked = true;
      $dom.slider.max = 200;
    }
    data.settings.slider = data.settings.slider || $dom.slider.max / 2;
    $dom.slider.value = data.settings.slider;
  },

  didReceiveGlobalSettings({ settings }) {
    console.log('Global setting');
    if (!settings.clientSecret && !settings.accessToken) {
      openAuthorization();
    } else {
      logoutdiv.style.display = 'flex';
    }
  },
};

$dom.rdio1.on('change', (e) => {
  //输入
  $dom.slider.max = 100;
  $settings.rdio = e.target.value;
});

$dom.rdio2.on('change', (e) => {
  //输出
  $dom.slider.max = 200;
  $settings.rdio = e.target.value;
});

$dom.slider.on('change', (e) => {
  $settings.slider = e.target.value;
});

$dom.logout.on('click', () => {
  // $websocket.openUrl('http://127.0.0.1:26432/logout');
  $websocket.setGlobalSettings({ clientId: '', clientSecret: '', accessToken: '' });
});
const addSliderTooltip = function (slider, textFn) {
  if (typeof textFn != 'function') {
    textFn = (value) => {
      return value;
    };
  }
  const adjustSlider = slider;
  const tooltip = document.querySelector('.sdpi-info-label');

  // Add clickable labels
  const parent = slider.parentNode;
  if (parent) {
    const clickables = parent.getElementsByClassName('clickable');
    for (const clickable of clickables) {
      const value = clickable.getAttribute('x-value');
      if (value) {
        clickable.addEventListener('click', (event) => {
          slider.value = value;
          let ev = new Event('change', { bubbles: true, cancelable: true });
          slider.dispatchEvent(ev);
        });
      }
    }
  }

  tooltip.textContent = textFn(parseFloat(adjustSlider.value));

  const fn = () => {
    const tw = tooltip.getBoundingClientRect().width;
    const rangeRect = adjustSlider.getBoundingClientRect();
    const w = rangeRect.width - tw / 2;
    const percnt = (adjustSlider.value - adjustSlider.min) / (adjustSlider.max - adjustSlider.min);
    if (tooltip.classList.contains('hidden')) {
      tooltip.style.top = '-1000px';
    } else {
      tooltip.style.left = `${rangeRect.left + Math.round(w * percnt) - tw / 4}px`;
      tooltip.textContent = textFn(parseFloat(adjustSlider.value));
      tooltip.style.top = `${rangeRect.top - 30}px`;
    }
  };

  if (adjustSlider) {
    adjustSlider.addEventListener(
      'mouseenter',
      function () {
        tooltip.classList.remove('hidden');
        tooltip.classList.add('shown');
        fn();
      },
      false,
    );

    adjustSlider.addEventListener(
      'mouseout',
      function () {
        tooltip.classList.remove('shown');
        tooltip.classList.add('hidden');
        fn();
      },
      false,
    );

    adjustSlider.addEventListener('input', fn, false);
  }
};

addSliderTooltip(document.getElementById('slider'), (value) => {
  return value;
});
