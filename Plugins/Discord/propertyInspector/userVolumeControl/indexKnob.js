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
    user: $('#user'),
    adjustmentBox: $('#adjustmentBox'),
    adjustment: $('#adjustment'),
    userBox: $('#userBox'),
  };

const $propEvent = {
  didReceiveSettings(data) {
    $websocket.getGlobalSettings();
    if ('voice_states' in data.settings) {
      $dom.user.innerHTML = '';
      data.settings.voice_states.forEach((item) => {
        $dom.user.innerHTML += `<option value="${item.user.id}">${item.user.global_name ? item.user.global_name : item.user.username}</option>`;
      });
      $dom.user.value = data.settings.user;
      $dom.adjustmentBox.style.display = 'flex';
      $dom.userBox.style.display = 'flex';
    } else {
      $dom.userBox.style.display = 'none';
      $dom.adjustmentBox.style.display = 'none';
    }
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

$dom.user.on('change', (e) => {
  $settings.user = $dom.user.value;
});
$dom.logout.on('click', () => {
  // $websocket.openUrl('http://127.0.0.1:26432/logout');
  $websocket.setGlobalSettings({ clientId: '', clientSecret: '', accessToken: '' });
});
$dom.adjustment.on('change', (e) => {
  $settings.adjustment = $dom.adjustment.value;
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

addSliderTooltip(document.getElementById('adjustment'), (value) => {
  return value;
});
