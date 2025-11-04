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
    typeBox: $('#typeBox'),
    iconBox: $('#iconBox'),
    adjustmentBox: $('#adjustmentBox'),
    volumeBox: $('#volumeBox'),
    adjustment: $('#adjustment'),
    volume: $('#volume'),
    icon: $('#icon'),
    user: $('#user'),
    mode: $('#mode'),
    type: $('#type'),
    modeBox: $('#modeBox'),
    userBox: $('#userBox'),
  };

const $propEvent = {
  didReceiveSettings(data) {
    $websocket.getGlobalSettings();
    console.log(data);
    if ('voice_states' in data.settings) {
      $dom.user.innerHTML = '';
      data.settings.voice_states.forEach((item) => {
        $dom.user.innerHTML += `<option value="${item.user.id}">${item.user.global_name ? item.user.global_name : item.user.username}</option>`;
      });
      $dom.user.value = data.settings.user;
      $dom.modeBox.style.display = 'flex';
      $dom.typeBox.style.display = 'flex';
      $dom.userBox.style.display = 'flex';
    } else {
      $dom.userBox.style.display = 'none';
    }

    if ('mode' in data.settings) {
      $dom.mode.value = data.settings.mode;
    }
    if ('type' in data.settings) {
      $dom.type.value = data.settings.type;
    }
    if ('icon' in data.settings) {
      $dom.icon.value = data.settings.icon;
    }
    if ('adjustment' in data.settings) {
      $dom.adjustment.value = data.settings.adjustment;
    }
    if ('volume' in data.settings) {
      $dom.volume.value = data.settings.volume / 2;
      $dom.typeBox.style.display = 'none';
      $dom.iconBox.style.display = 'none';
      $dom.volumeBox.style.display = 'none';
      $dom.adjustmentBox.style.display = 'none';
      if ($dom.mode.value == 'mute') {
        $dom.typeBox.style.display = 'flex';
      } else if ($dom.mode.value == 'adjustment') {
        $dom.adjustmentBox.style.display = 'flex';
        $dom.iconBox.style.display = 'flex';
      } else if ($dom.mode.value == 'set') {
        $dom.volumeBox.style.display = 'flex';
      }
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

$dom.user.on('change', (e) => {
  $settings.user = $dom.user.value;
});

$dom.mode.on('change', (e) => {
  $settings.mode = $dom.mode.value;
  $dom.typeBox.style.display = 'none';
  $dom.iconBox.style.display = 'none';
  $dom.volumeBox.style.display = 'none';
  $dom.adjustmentBox.style.display = 'none';
  if ($dom.mode.value == 'mute') {
    $dom.typeBox.style.display = 'flex';
  } else if ($dom.mode.value == 'adjustment') {
    $dom.adjustmentBox.style.display = 'flex';
    $dom.iconBox.style.display = 'flex';
  } else if ($dom.mode.value == 'set') {
    $dom.volumeBox.style.display = 'flex';
  }
});

$dom.type.on('change', (e) => {
  $settings.type = $dom.type.value;
});

$dom.icon.on('change', (e) => {
  $settings.icon = $dom.icon.value;
});

$dom.adjustment.on('change', (e) => {
  $settings.adjustment = $dom.adjustment.value;
});

$dom.volume.on('change', (e) => {
  $settings.volume = $dom.volume.value * 2;
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

addSliderTooltip(document.getElementById('volume'), (value) => {
  return value;
});
