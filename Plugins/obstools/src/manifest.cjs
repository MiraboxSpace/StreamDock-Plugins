/**
 * StreamDock Plugin Template V1.2.2 说明文件 =>
 *
 *      1 => 开发环境支持热更新 => 修改代码无需重启服务器和软件 ( 修改图片/配置文件时需要重启 ) !
 *      2 => 自动打包到插件目录 => 使用 pnpm dev/build 即可自动打包到插件目录，无需手动复制删除。
 *      3 => 数据持久化驱动视图 => 通过 v-model 绑定 settings 的值即可实现双向绑定持久化数据回显啦 !
 *      4 => 完美集成 Navie UI 组件库 => 主题可调，无需穿透样式，有超过 90 个组件，希望能帮你少写点代码。
 *      5 => 完美集成 tailwindcss => 原子化css提升您的开发效率。
 *
 *      !! 注意事项 !! => 自动化含有许多约定配置 => 以下内容请务必认真填写 => 祝你开发愉快 _> </>
 *
 * =========== Kriac =================================================================================== 于 2024.03.30 更新 ===========>
 */

const Plugin = {
  UUID: 'obs',
  version: '1.0.0',
  APIVersion: '1.0',
  Icon: 'images/obs.png',
  i18n: {
    zh_CN: {
    Name: 'OBS 工具',
    Description: 'OBS 工具'
  },
  de: {
    Name: 'OBS-Tool',
    Description: 'OBS-Tool'
  },
  en: {
    Name: 'OBS Tool',
    Description: 'OBS Tool'
  },
  es: {
    Name: 'Herramienta OBS',
    Description: 'Herramienta OBS'
  },
  fr: {
    Name: 'Outil OBS',
    Description: 'Outil OBS'
  },
  it: {
    Name: 'Strumento OBS',
    Description: 'Strumento OBS'
  },
  ja: {
    Name: 'OBSツール',
    Description: 'OBSツール'
  },
  ko: {
    Name: 'OBS 도구',
    Description: 'OBS 도구'
  },
  pl: {
    Name: 'Narzędzie OBS',
    Description: 'Narzędzie OBS'
  },
  pt: {
    Name: 'Ferramenta OBS',
    Description: 'Ferramenta OBS'
  },
  ru: {
    Name: 'Инструмент OBS',
    Description: 'Инструмент OBS'
  }
  },
  Software: {
    MinimumVersion: "6.5"
  },
  ApplicationsToMonitor: {
    windows: [
    ]
  }
};

// 操作数组
const Actions = [
  {
    UUID: 'browsersource',
    Icon: 'images/OBS/0-01.jpg',
    i18n: {
      zh_CN: {
    Name: '浏览器源',
    Tooltip: '浏览器源'
  },
  de: {
    Name: 'Browserquelle',
    Tooltip: 'Browserquelle'
  },
  en: {
    Name: 'Browser Source',
    Tooltip: 'Browser Source'
  },
  es: {
    Name: 'Fuente de navegador',
    Tooltip: 'Fuente de navegador'
  },
  fr: {
    Name: 'Source navigateur',
    Tooltip: 'Source navigateur'
  },
  it: {
    Name: 'Sorgente browser',
    Tooltip: 'Sorgente browser'
  },
  ja: {
    Name: 'ブラウザソース',
    Tooltip: 'ブラウザソース'
  },
  ko: {
    Name: '브라우저 소스',
    Tooltip: '브라우저 소스'
  },
  pl: {
    Name: 'Źródło przeglądarki',
    Tooltip: 'Źródło przeglądarki'
  },
  pt: {
    Name: 'Fonte do navegador',
    Tooltip: 'Fonte do navegador'
  },
  ru: {
    Name: 'Источник браузера',
    Tooltip: 'Источник браузера'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-01.jpg'
      },
      {
        Image: 'images/OBS/0-01-active.jpg'
      }
    ],
    Settings: {
      "mute": false,
      "file": false,
      "autoHide": 20
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information']
  },
  {
    UUID: 'cpuusage',
    Icon: 'images/OBS/0-02.jpg',
    i18n: {
      zh_CN: {
    Name: 'CPU 使用率',
    Tooltip: 'CPU 使用率'
  },
  de: {
    Name: 'CPU-Auslastung',
    Tooltip: 'CPU-Auslastung'
  },
  en: {
    Name: 'CPU Usage',
    Tooltip: 'CPU Usage'
  },
  es: {
    Name: 'Uso de CPU',
    Tooltip: 'Uso de CPU'
  },
  fr: {
    Name: 'Utilisation du CPU',
    Tooltip: 'Utilisation du CPU'
  },
  it: {
    Name: 'Utilizzo CPU',
    Tooltip: 'Utilizzo CPU'
  },
  ja: {
    Name: 'CPU使用率',
    Tooltip: 'CPU使用率'
  },
  ko: {
    Name: 'CPU 사용률',
    Tooltip: 'CPU 사용률'
  },
  pl: {
    Name: 'Użycie CPU',
    Tooltip: 'Użycie CPU'
  },
  pt: {
    Name: 'Uso da CPU',
    Tooltip: 'Uso da CPU'
  },
  ru: {
    Name: 'Использование ЦП',
    Tooltip: 'Использование ЦП'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-02.jpg',
        TitleAlignment: 'center',
        FontSize: 12,
      },
      {
        Image: 'images/OBS/0-02.jpg',
        TitleAlignment: 'center',
        FontSize: 12,
      }
    ],
    Settings: {
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'droppedframes',
    Icon: 'images/OBS/0-03.jpg',
    i18n: {
      zh_CN: {
    Name: '丢失帧',
    Tooltip: '丢失帧'
  },
  de: {
    Name: 'Dropped Frames',
    Tooltip: 'Dropped Frames'
  },
  en: {
    Name: 'Dropped Frames',
    Tooltip: 'Dropped Frames'
  },
  es: {
    Name: 'Frames perdidos',
    Tooltip: 'Frames perdidos'
  },
  fr: {
    Name: 'Images perdues',
    Tooltip: 'Images perdues'
  },
  it: {
    Name: 'Frame persi',
    Tooltip: 'Frame persi'
  },
  ja: {
    Name: 'ドロップフレーム',
    Tooltip: 'ドロップフレーム'
  },
  ko: {
    Name: '드롭된 프레임',
    Tooltip: '드롭된 프레임'
  },
  pl: {
    Name: 'Utracone klatki',
    Tooltip: 'Utracone klatki'
  },
  pt: {
    Name: 'Frames perdidos',
    Tooltip: 'Frames perdidos'
  },
  ru: {
    Name: 'Потерянные кадры',
    Tooltip: 'Потерянные кадры'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-03.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-03.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      framesType: "outputSkippedFrames",
      color: "#FF0000",
      minimum_threshold: 0,
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'filtertoggle',
    Icon: 'images/OBS/0-04.jpg',
    i18n: {
      zh_CN: {
    Name: '滤镜切换',
    Tooltip: '滤镜切换'
  },
  de: {
    Name: 'Filterwechsel',
    Tooltip: 'Filterwechsel'
  },
  en: {
    Name: 'Filter Switch',
    Tooltip: 'Filter Switch'
  },
  es: {
    Name: 'Cambio de filtro',
    Tooltip: 'Cambio de filtro'
  },
  fr: {
    Name: 'Changement de filtre',
    Tooltip: 'Changement de filtre'
  },
  it: {
    Name: 'Cambio filtro',
    Tooltip: 'Cambio filtro'
  },
  ja: {
    Name: 'フィルター切替',
    Tooltip: 'フィルター切替'
  },
  ko: {
    Name: '필터 전환',
    Tooltip: '필터 전환'
  },
  pl: {
    Name: 'Przełączanie filtrów',
    Tooltip: 'Przełączanie filtrów'
  },
  pt: {
    Name: 'Troca de filtro',
    Tooltip: 'Troca de filtro'
  },
  ru: {
    Name: 'Переключение фильтров',
    Tooltip: 'Переключение фильтров'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-04.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-04-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {

    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  // {
  //   UUID: 'focusedwindowcapture',
  //   Icon: 'images/obs.png',
  //   i18n: {
  //     en: {
  //       Name: 'Focused Window Capture',
  //       Tooltip: 'Focused Window Capture'
  //     },
  //     zh_CN: {
  //       Name: '专注窗口捕捉',
  //       Tooltip: '专注窗口捕捉'
  //     }
  //   },
  //   state: 0,
  //   States: [
  //     {
  //       Image: 'images/obs.png',
  //       TitleAlignment: 'center',
  //       FontSize: 14,
  //     },
  //     {
  //       Image: 'images/obs.png',
  //       TitleAlignment: 'center',
  //       FontSize: 14,
  //     }
  //   ],
  //   Settings: {

  //   },
  //   UserTitleEnabled: true,
  //   SupportedInMultiActions: true,
  //   Controllers: ['Keypad', 'Information', 'Knob']
  // },
  // {
  //   UUID: 'hotkeytrigger',
  //   Icon: 'images/obs.png',
  //   i18n: {
  //     en: {
  //       Name: 'Hotkey Trigger',
  //       Tooltip: 'Hotkey Trigger'
  //     },
  //     zh_CN: {
  //       Name: '捕获快捷键',
  //       Tooltip: '捕获快捷键'
  //     }
  //   },
  //   state: 0,
  //   States: [
  //     {
  //       Image: 'images/obs.png',
  //       TitleAlignment: 'center',
  //       FontSize: 14,
  //     },
  //     {
  //       Image: 'images/obs.png',
  //       TitleAlignment: 'center',
  //       FontSize: 14,
  //     }
  //   ],
  //   Settings: {

  //   },
  //   UserTitleEnabled: true,
  //   SupportedInMultiActions: true,
  //   Controllers: ['Keypad', 'Information', 'Knob']
  // },
  {
    UUID: 'imagesettings',
    Icon: 'images/OBS/0-07.jpg',
    i18n: {
      zh_CN: {
    Name: '图像设置',
    Tooltip: '图像设置'
  },
  de: {
    Name: 'Bildeinstellungen',
    Tooltip: 'Bildeinstellungen'
  },
  en: {
    Name: 'Image Settings',
    Tooltip: 'Image Settings'
  },
  es: {
    Name: 'Configuración de imagen',
    Tooltip: 'Configuración de imagen'
  },
  fr: {
    Name: 'Paramètres d\'image',
    Tooltip: 'Paramètres d\'image'
  },
  it: {
    Name: 'Impostazioni immagine',
    Tooltip: 'Impostazioni immagine'
  },
  ja: {
    Name: '画像設定',
    Tooltip: '画像設定'
  },
  ko: {
    Name: '이미지 설정',
    Tooltip: '이미지 설정'
  },
  pl: {
    Name: 'Ustawienia obrazu',
    Tooltip: 'Ustawienia obrazu'
  },
  pt: {
    Name: 'Configurações de imagem',
    Tooltip: 'Configurações de imagem'
  },
  ru: {
    Name: 'Настройки изображения',
    Tooltip: 'Настройки изображения'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-07.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-07-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      "filePath": '',
      "autoHide": 20
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'inputmonitorset',
    Icon: 'images/OBS/0-08.jpg',
    i18n: {
      zh_CN: {
    Name: '输入监视器设置',
    Tooltip: '输入监视器设置'
  },
  de: {
    Name: 'Eingangsmonitor-Einstellungen',
    Tooltip: 'Eingangsmonitor-Einstellungen'
  },
  en: {
    Name: 'Input Monitor Settings',
    Tooltip: 'Input Monitor Settings'
  },
  es: {
    Name: 'Configuración de monitor de entrada',
    Tooltip: 'Configuración de monitor de entrada'
  },
  fr: {
    Name: 'Paramètres du moniteur d\'entrée',
    Tooltip: 'Paramètres du moniteur d\'entrée'
  },
  it: {
    Name: 'Impostazioni monitor di ingresso',
    Tooltip: 'Impostazioni monitor di ingresso'
  },
  ja: {
    Name: '入力モニター設定',
    Tooltip: '入力モニター設定'
  },
  ko: {
    Name: '입력 모니터 설정',
    Tooltip: '입력 모니터 설정'
  },
  pl: {
    Name: 'Ustawienia monitora wejściowego',
    Tooltip: 'Ustawienia monitora wejściowego'
  },
  pt: {
    Name: 'Configurações do monitor de entrada',
    Tooltip: 'Configurações do monitor de entrada'
  },
  ru: {
    Name: 'Настройки входного монитора',
    Tooltip: 'Настройки входного монитора'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-08.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-08-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {

    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'inputmutetoggle',
    Icon: 'images/OBS/0-09.jpg',
    i18n: {
      zh_CN: {
    Name: '输入静音切换',
    Tooltip: '输入静音切换'
  },
  de: {
    Name: 'Eingangsstummschaltung',
    Tooltip: 'Eingangsstummschaltung'
  },
  en: {
    Name: 'Input Mute Toggle',
    Tooltip: 'Input Mute Toggle'
  },
  es: {
    Name: 'Alternar silencio de entrada',
    Tooltip: 'Alternar silencio de entrada'
  },
  fr: {
    Name: 'Basculer entrée muette',
    Tooltip: 'Basculer entrée muette'
  },
  it: {
    Name: 'Attiva/disattiva muto ingresso',
    Tooltip: 'Attiva/disattiva muto ingresso'
  },
  ja: {
    Name: '入力ミュート切り替え',
    Tooltip: '入力ミュート切り替え'
  },
  ko: {
    Name: '입력 음소거 전환',
    Tooltip: '입력 음소거 전환'
  },
  pl: {
    Name: 'Przełącz wyciszenia wejścia',
    Tooltip: 'Przełącz wyciszenia wejścia'
  },
  pt: {
    Name: 'Alternar mudo de entrada',
    Tooltip: 'Alternar mudo de entrada'
  },
  ru: {
    Name: 'Переключение входа в режим без звука',
    Tooltip: 'Переключение входа в режим без звука'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-09.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-09-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {

    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'inputvolumeadjust',
    Icon: 'images/OBS/0-10.jpg',
    i18n: {
      zh_CN: {
    Name: '输入音量调节',
    Tooltip: '输入音量调节'
  },
  de: {
    Name: 'Eingangslautstärkeregler',
    Tooltip: 'Eingangslautstärkeregler'
  },
  en: {
    Name: 'Input Volume Control',
    Tooltip: 'Input Volume Control'
  },
  es: {
    Name: 'Control de volumen de entrada',
    Tooltip: 'Control de volumen de entrada'
  },
  fr: {
    Name: 'Réglage du volume d\'entrée',
    Tooltip: 'Réglage du volume d\'entrée'
  },
  it: {
    Name: 'Regolazione volume ingresso',
    Tooltip: 'Regolazione volume ingresso'
  },
  ja: {
    Name: '入力音量調節',
    Tooltip: '入力音量調節'
  },
  ko: {
    Name: '입력 음량 조절',
    Tooltip: '입력 음량 조절'
  },
  pl: {
    Name: 'Regulacja głośności wejścia',
    Tooltip: 'Regulacja głośności wejścia'
  },
  pt: {
    Name: 'Controle de volume de entrada',
    Tooltip: 'Controle de volume de entrada'
  },
  ru: {
    Name: 'Регулировка громкости входа',
    Tooltip: 'Регулировка громкости входа'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-10.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-10-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      step: "+5"
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'inputvolumeadset',
    Icon: 'images/OBS/0-11.jpg',
    i18n: {
      zh_CN: {
    Name: '输入音量设置',
    Tooltip: '输入音量设置'
  },
  de: {
    Name: 'Eingangslautstärkeeinstellung',
    Tooltip: 'Eingangslautstärkeeinstellung'
  },
  en: {
    Name: 'Input Volume Settings',
    Tooltip: 'Input Volume Settings'
  },
  es: {
    Name: 'Configuración de volumen de entrada',
    Tooltip: 'Configuración de volumen de entrada'
  },
  fr: {
    Name: 'Paramètres de volume d\'entrée',
    Tooltip: 'Paramètres de volume d\'entrée'
  },
  it: {
    Name: 'Impostazioni volume ingresso',
    Tooltip: 'Impostazioni volume ingresso'
  },
  ja: {
    Name: '入力音量設定',
    Tooltip: '入力音量設定'
  },
  ko: {
    Name: '입력 음량 설정',
    Tooltip: '입력 음량 설정'
  },
  pl: {
    Name: 'Ustawienia głośności wejścia',
    Tooltip: 'Ustawienia głośności wejścia'
  },
  pt: {
    Name: 'Configurações de volume de entrada',
    Tooltip: 'Configurações de volume de entrada'
  },
  ru: {
    Name: 'Настройки громкости входа',
    Tooltip: 'Настройки громкости входа'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-11.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-11-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      db: 0
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'instantreplay',
    Icon: 'images/OBS/0-12.jpg',
    i18n: {
        zh_CN: {
    Name: '即时回放',
    Tooltip: '即时回放'
  },
  de: {
    Name: 'Sofortwiedergabe',
    Tooltip: 'Sofortwiedergabe'
  },
  en: {
    Name: 'Instant Replay',
    Tooltip: 'Instant Replay'
  },
  es: {
    Name: 'Repetición instantánea',
    Tooltip: 'Repetición instantánea'
  },
  fr: {
    Name: 'Relecture instantanée',
    Tooltip: 'Relecture instantanée'
  },
  it: {
    Name: 'Riproduzione istantanea',
    Tooltip: 'Riproduzione istantanea'
  },
  ja: {
    Name: 'インスタントリプレイ',
    Tooltip: 'インスタントリプレイ'
  },
  ko: {
    Name: '인스턴트 리플레이',
    Tooltip: '인스턴트 리플레이'
  },
  pl: {
    Name: 'Natychmiastowe odtwarzanie',
    Tooltip: 'Natychmiastowe odtwarzanie'
  },
  pt: {
    Name: 'Repetição instantânea',
    Tooltip: 'Repetição instantânea'
  },
  ru: {
    Name: 'Мгновенное воспроизведение',
    Tooltip: 'Мгновенное воспроизведение'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-12.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-12-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      autoReplay: false,
      autoSwitch: false,
      delay: 0,
      isMuted: false,
      autoHide: 0,
      speed: 100,
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'previousscene',
    Icon: 'images/OBS/0-13.jpg',
    i18n: {
  zh_CN: {
    Name: '前一个场景',
    Tooltip: '前一个场景'
  },
  de: {
    Name: 'Vorherige Szene',
    Tooltip: 'Vorherige Szene'
  },
  en: {
    Name: 'Previous Scene',
    Tooltip: 'Previous Scene'
  },
  es: {
    Name: 'Escena anterior',
    Tooltip: 'Escena anterior'
  },
  fr: {
    Name: 'Scène précédente',
    Tooltip: 'Scène précédente'
  },
  it: {
    Name: 'Scena precedente',
    Tooltip: 'Scena precedente'
  },
  ja: {
    Name: '前のシーン',
    Tooltip: '前のシーン'
  },
  ko: {
    Name: '이전 장면',
    Tooltip: '이전 장면'
  },
  pl: {
    Name: 'Poprzednia scena',
    Tooltip: 'Poprzednia scena'
  },
  pt: {
    Name: 'Cena anterior',
    Tooltip: 'Cena anterior'
  },
  ru: {
    Name: 'Предыдущая сцена',
    Tooltip: 'Предыдущая сцена'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-13.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-13-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      sceneName: ""
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'nextscene',
    Icon: 'images/OBS/0-14.jpg',
    i18n: {
      zh_CN: {
    Name: '后一个场景',
    Tooltip: '后一个场景'
  },
  de: {
    Name: 'Nächste Szene',
    Tooltip: 'Nächste Szene'
  },
  en: {
    Name: 'Next Scene',
    Tooltip: 'Next Scene'
  },
  es: {
    Name: 'Escena siguiente',
    Tooltip: 'Escena siguiente'
  },
  fr: {
    Name: 'Scène suivante',
    Tooltip: 'Scène suivante'
  },
  it: {
    Name: 'Scena successiva',
    Tooltip: 'Scena successiva'
  },
  ja: {
    Name: '次のシーン',
    Tooltip: '次のシーン'
  },
  ko: {
    Name: '다음 장면',
    Tooltip: '다음 장면'
  },
  pl: {
    Name: 'Następna scena',
    Tooltip: 'Następna scena'
  },
  pt: {
    Name: 'Próxima cena',
    Tooltip: 'Próxima cena'
  },
  ru: {
    Name: 'Следующая сцена',
    Tooltip: 'Следующая сцена'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-14.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-14-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      sceneName: ""
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'remoterecording',
    Icon: 'images/OBS/0-15.jpg',
    i18n: {
      zh_CN: {
    Name: '远程录制 开始/停止/暂停',
    Tooltip: '远程录制 开始/停止/暂停'
  },
  de: {
    Name: 'Fernaufnahme Start/Stopp/Pause',
    Tooltip: 'Fernaufnahme Start/Stopp/Pause'
  },
  en: {
    Name: 'Remote Recording Start/Stop/Pause',
    Tooltip: 'Remote Recording Start/Stop/Pause'
  },
  es: {
    Name: 'Grabación remota Iniciar/Detener/Pausa',
    Tooltip: 'Grabación remota Iniciar/Detener/Pausa'
  },
  fr: {
    Name: 'Enregistrement à distance Démarrer/Arrêter/Pause',
    Tooltip: 'Enregistrement à distance Démarrer/Arrêter/Pause'
  },
  it: {
    Name: 'Registrazione remota Avvia/Interrompi/Pausa',
    Tooltip: 'Registrazione remota Avvia/Interrompi/Pausa'
  },
  ja: {
    Name: 'リモート録画 開始/停止/一時停止',
    Tooltip: 'リモート録画 開始/停止/一時停止'
  },
  ko: {
    Name: '원격 녹화 시작/중지/일시정지',
    Tooltip: '원격 녹화 시작/중지/일시정지'
  },
  pl: {
    Name: 'Zdalne nagrywanie Start/Stop/Pauza',
    Tooltip: 'Zdalne nagrywanie Start/Stop/Pauza'
  },
  pt: {
    Name: 'Gravação remota Iniciar/Parar/Pausar',
    Tooltip: 'Gravação remota Iniciar/Parar/Pausar'
  },
  ru: {
    Name: 'Удалённая запись Старт/Стоп/Пауза',
    Tooltip: 'Удалённая запись Старт/Стоп/Пауза'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-15.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-15-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      shortPress: "Start/Stop",
      longPress: "Pause/Resume",
      longKeypressTime: 600,
      startIcon: "🔴",
      stoppedIcon: "⏹️​​",
      pausedIcon: "⏸️​"
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'remotestreaming',
    Icon: 'images/OBS/0-16.jpg',
    i18n: {
        zh_CN: {
    Name: '远程流式处理 开始/停止',
    Tooltip: '远程流式处理 开始/停止'
  },
  de: {
    Name: 'Remote-Streaming Start/Stopp',
    Tooltip: 'Remote-Streaming Start/Stopp'
  },
  en: {
    Name: 'Remote Streaming Start/Stop',
    Tooltip: 'Remote Streaming Start/Stop'
  },
  es: {
    Name: 'Streaming remoto Iniciar/Detener',
    Tooltip: 'Streaming remoto Iniciar/Detener'
  },
  fr: {
    Name: 'Streaming à distance Démarrer/Arrêter',
    Tooltip: 'Streaming à distance Démarrer/Arrêter'
  },
  it: {
    Name: 'Streaming remoto Avvia/Interrompi',
    Tooltip: 'Streaming remoto Avvia/Interrompi'
  },
  ja: {
    Name: 'リモートストリーミング 開始/停止',
    Tooltip: 'リモートストリーミング 開始/停止'
  },
  ko: {
    Name: '원격 스트리밍 시작/중지',
    Tooltip: '원격 스트리밍 시작/중지'
  },
  pl: {
    Name: 'Zdalne streamowanie Start/Stop',
    Tooltip: 'Zdalne streamowanie Start/Stop'
  },
  pt: {
    Name: 'Streaming remoto Iniciar/Parar',
    Tooltip: 'Streaming remoto Iniciar/Parar'
  },
  ru: {
    Name: 'Удалённая трансляция Старт/Стоп',
    Tooltip: 'Удалённая трансляция Старт/Стоп'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-16.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-16-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      streamingIcon: "📡",
      stoppedIcon: "⏹️​​",
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'setprofile',
    Icon: 'images/OBS/0-17.jpg',
    i18n: {
      zh_CN: {
    Name: '设置配置文件',
    Tooltip: '设置配置文件'
  },
  de: {
    Name: 'Profil einrichten',
    Tooltip: 'Profil einrichten'
  },
  en: {
    Name: 'Set Profile',
    Tooltip: 'Set Profile'
  },
  es: {
    Name: 'Configurar perfil',
    Tooltip: 'Configurar perfil'
  },
  fr: {
    Name: 'Définir le profil',
    Tooltip: 'Définir le profil'
  },
  it: {
    Name: 'Imposta profilo',
    Tooltip: 'Imposta profilo'
  },
  ja: {
    Name: 'プロファイル設定',
    Tooltip: 'プロファイル設定'
  },
  ko: {
    Name: '프로필 설정',
    Tooltip: '프로필 설정'
  },
  pl: {
    Name: 'Ustaw profil',
    Tooltip: 'Ustaw profil'
  },
  pt: {
    Name: 'Definir perfil',
    Tooltip: 'Definir perfil'
  },
  ru: {
    Name: 'Настройка профиля',
    Tooltip: 'Настройка профиля'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-17.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-17-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      profile: "",
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'setscenecollection',
    Icon: 'images/OBS/0-18.jpg',
    i18n: {
zh_CN: {
    Name: '设置场景集合',
    Tooltip: '设置场景集合'
  },
  de: {
    Name: 'Szenensammlung einrichten',
    Tooltip: 'Szenensammlung einrichten'
  },
  en: {
    Name: 'Set Scene Collection',
    Tooltip: 'Set Scene Collection'
  },
  es: {
    Name: 'Configurar colección de escenas',
    Tooltip: 'Configurar colección de escenas'
  },
  fr: {
    Name: 'Définir la collection de scènes',
    Tooltip: 'Définir la collection de scènes'
  },
  it: {
    Name: 'Imposta raccolta scene',
    Tooltip: 'Imposta raccolta scene'
  },
  ja: {
    Name: 'シーンコレクション設定',
    Tooltip: 'シーンコレクション設定'
  },
  ko: {
    Name: '장면 컬렉션 설정',
    Tooltip: '장면 컬렉션 설정'
  },
  pl: {
    Name: 'Ustaw kolekcję scen',
    Tooltip: 'Ustaw kolekcję scen'
  },
  pt: {
    Name: 'Definir coleção de cenas',
    Tooltip: 'Definir coleção de cenas'
  },
  ru: {
    Name: 'Настройка коллекции сцен',
    Tooltip: 'Настройка коллекции сцен'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-18.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-18-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      sceneProfile: "",
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'settransition',
    Icon: 'images/OBS/0-19.jpg',
    i18n: {
zh_CN: {
    Name: '设置过渡',
    Tooltip: '设置过渡'
  },
  de: {
    Name: 'Übergang einstellen',
    Tooltip: 'Übergang einstellen'
  },
  en: {
    Name: 'Set Transition',
    Tooltip: 'Set Transition'
  },
  es: {
    Name: 'Configurar transición',
    Tooltip: 'Configurar transición'
  },
  fr: {
    Name: 'Définir la transition',
    Tooltip: 'Définir la transition'
  },
  it: {
    Name: 'Imposta transizione',
    Tooltip: 'Imposta transizione'
  },
  ja: {
    Name: 'トランジション設定',
    Tooltip: 'トランジション設定'
  },
  ko: {
    Name: '전환 설정',
    Tooltip: '전환 설정'
  },
  pl: {
    Name: 'Ustaw przejście',
    Tooltip: 'Ustaw przejście'
  },
  pt: {
    Name: 'Definir transição',
    Tooltip: 'Definir transição'
  },
  ru: {
    Name: 'Настроить переход',
    Tooltip: 'Настроить переход'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-19.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-19-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      transition: "",
      durationChange: false,
      duration: 300
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'sceneswitcher',
    Icon: 'images/OBS/0-20.jpg',
    i18n: {
  zh_CN: {
    Name: '场景切换器',
    Tooltip: '场景切换器'
  },
  de: {
    Name: 'Szenenwechsler',
    Tooltip: 'Szenenwechsler'
  },
  en: {
    Name: 'Scene Switcher',
    Tooltip: 'Scene Switcher'
  },
  es: {
    Name: 'Selector de escenas',
    Tooltip: 'Selector de escenas'
  },
  fr: {
    Name: 'Changeur de scène',
    Tooltip: 'Changeur de scène'
  },
  it: {
    Name: 'Selettore di scene',
    Tooltip: 'Selettore di scene'
  },
  ja: {
    Name: 'シーンスイッチャー',
    Tooltip: 'シーンスイッチャー'
  },
  ko: {
    Name: '장면 전환기',
    Tooltip: '장면 전환기'
  },
  pl: {
    Name: 'Przełącznik scen',
    Tooltip: 'Przełącznik scen'
  },
  pt: {
    Name: 'Seletor de cenas',
    Tooltip: 'Seletor de cenas'
  },
  ru: {
    Name: 'Переключатель сцен',
    Tooltip: 'Переключатель сцен'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-20.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-20-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      scene: "",
      transition: false,
      previewColor: "#FFFFFF",
      liveColor: "#FF0000",
      preview: false,
      image: "",
      imageBase64: ""
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'sourceanimation',
    Icon: 'images/OBS/0-21.jpg',
    i18n: {
  zh_CN: {
    Name: '源动画',
    Tooltip: '源动画'
  },
  de: {
    Name: 'Quellenanimation',
    Tooltip: 'Quellenanimation'
  },
  en: {
    Name: 'Source Animation',
    Tooltip: 'Source Animation'
  },
  es: {
    Name: 'Animación de fuente',
    Tooltip: 'Animación de fuente'
  },
  fr: {
    Name: 'Animation de source',
    Tooltip: 'Animation de source'
  },
  it: {
    Name: 'Animazione sorgente',
    Tooltip: 'Animazione sorgente'
  },
  ja: {
    Name: 'ソースアニメーション',
    Tooltip: 'ソースアニメーション'
  },
  ko: {
    Name: '소스 애니메이션',
    Tooltip: '소스 애니메이션'
  },
  pl: {
    Name: 'Animacja źródła',
    Tooltip: 'Animacja źródła'
  },
  pt: {
    Name: 'Animação de fonte',
    Tooltip: 'Animação de fonte'
  },
  ru: {
    Name: 'Анимация источника',
    Tooltip: 'Анимация источника'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-21.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-21-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      scene: "",
      repeatAnimationCount: 0,
      phaseActive: null,
      phaseTemplate: {
        id: "",
        name: "",
        aproxTime: 1000,
        steps: 100,
        setDefaults: true,
        startBehaviourHide: false,
        endBehaviourHide: false,
        endBehaviourRemove: false,
        record: false,
        animations: []
      },
      phases: [],
      recordState: false,
      recordStart: {},
      recordEnd: {}
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'sourcevisibility',
    Icon: 'images/OBS/0-22.jpg',
    i18n: {
  zh_CN: {
    Name: '源可见性',
    Tooltip: '源可见性'
  },
  de: {
    Name: 'Quellensichtbarkeit',
    Tooltip: 'Quellensichtbarkeit'
  },
  en: {
    Name: 'Source Visibility',
    Tooltip: 'Source Visibility'
  },
  es: {
    Name: 'Visibilidad de fuente',
    Tooltip: 'Visibilidad de fuente'
  },
  fr: {
    Name: 'Visibilité de la source',
    Tooltip: 'Visibilité de la source'
  },
  it: {
    Name: 'Visibilità sorgente',
    Tooltip: 'Visibilità sorgente'
  },
  ja: {
    Name: 'ソース可視性',
    Tooltip: 'ソース可視性'
  },
  ko: {
    Name: '소스 가시성',
    Tooltip: '소스 가시성'
  },
  pl: {
    Name: 'Widoczność źródła',
    Tooltip: 'Widoczność źródła'
  },
  pt: {
    Name: 'Visibilidade da fonte',
    Tooltip: 'Visibilidade da fonte'
  },
  ru: {
    Name: 'Видимость источника',
    Tooltip: 'Видимость источника'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-22.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-22-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      scene: "",
      source: "",
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'studiomodetoggle',
    Icon: 'images/OBS/0-23.jpg',
    i18n: {
  zh_CN: {
    Name: '工作室模式切换',
    Tooltip: '工作室模式切换'
  },
  de: {
    Name: 'Studio-Modus umschalten',
    Tooltip: 'Studio-Modus umschalten'
  },
  en: {
    Name: 'Studio Mode Toggle',
    Tooltip: 'Studio Mode Toggle'
  },
  es: {
    Name: 'Alternar modo estudio',
    Tooltip: 'Alternar modo estudio'
  },
  fr: {
    Name: 'Basculer mode studio',
    Tooltip: 'Basculer mode studio'
  },
  it: {
    Name: 'Attiva/disattiva modalità studio',
    Tooltip: 'Attiva/disattiva modalità studio'
  },
  ja: {
    Name: 'スタジオモード切り替え',
    Tooltip: 'スタジオモード切り替え'
  },
  ko: {
    Name: '스튜디오 모드 전환',
    Tooltip: '스튜디오 모드 전환'
  },
  pl: {
    Name: 'Przełącz tryb studyjny',
    Tooltip: 'Przełącz tryb studyjny'
  },
  pt: {
    Name: 'Alternar modo estúdio',
    Tooltip: 'Alternar modo estúdio'
  },
  ru: {
    Name: 'Переключение студийного режима',
    Tooltip: 'Переключение студийного режима'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-23.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-23-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      Enabled: "🔴",
      Disabled: "⏹️"
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'videoplayer',
    Icon: 'images/OBS/0-24.jpg',
    i18n: {
  zh_CN: {
    Name: '视频播放',
    Tooltip: '视频播放'
  },
  de: {
    Name: 'Videowiedergabe',
    Tooltip: 'Videowiedergabe'
  },
  en: {
    Name: 'Video Playback',
    Tooltip: 'Video Playback'
  },
  es: {
    Name: 'Reproducción de video',
    Tooltip: 'Reproducción de video'
  },
  fr: {
    Name: 'Lecture vidéo',
    Tooltip: 'Lecture vidéo'
  },
  it: {
    Name: 'Riproduzione video',
    Tooltip: 'Riproduzione video'
  },
  ja: {
    Name: '動画再生',
    Tooltip: '動画再生'
  },
  ko: {
    Name: '비디오 재생',
    Tooltip: '비디오 재생'
  },
  pl: {
    Name: 'Odtwarzanie wideo',
    Tooltip: 'Odtwarzanie wideo'
  },
  pt: {
    Name: 'Reprodução de vídeo',
    Tooltip: 'Reprodução de vídeo'
  },
  ru: {
    Name: 'Воспроизведение видео',
    Tooltip: 'Воспроизведение видео'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-24.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-24-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {
      scene: "",
      source: "",
      filePath: "",
      isMute: false,
      autoHide: 20,
      speed: 100
    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
  {
    UUID: 'vitualcamera',
    Icon: 'images/OBS/0-25.jpg',
    i18n: {
  zh_CN: {
    Name: '虚拟摄像头',
    Tooltip: '虚拟摄像头'
  },
  de: {
    Name: 'Virtuelle Kamera',
    Tooltip: 'Virtuelle Kamera'
  },
  en: {
    Name: 'Virtual Camera',
    Tooltip: 'Virtual Camera'
  },
  es: {
    Name: 'Cámara virtual',
    Tooltip: 'Cámara virtual'
  },
  fr: {
    Name: 'Caméra virtuelle',
    Tooltip: 'Caméra virtuelle'
  },
  it: {
    Name: 'Telecamera virtuale',
    Tooltip: 'Telecamera virtuale'
  },
  ja: {
    Name: '仮想カメラ',
    Tooltip: '仮想カメラ'
  },
  ko: {
    Name: '가상 카메라',
    Tooltip: '가상 카메라'
  },
  pl: {
    Name: 'Wirtualna kamera',
    Tooltip: 'Wirtualna kamera'
  },
  pt: {
    Name: 'Câmera virtual',
    Tooltip: 'Câmera virtual'
  },
  ru: {
    Name: 'Виртуальная камера',
    Tooltip: 'Виртуальная камера'
  }
    },
    state: 0,
    States: [
      {
        Image: 'images/OBS/0-25.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      },
      {
        Image: 'images/OBS/0-25-active.jpg',
        TitleAlignment: 'center',
        FontSize: 14,
      }
    ],
    Settings: {

    },
    UserTitleEnabled: true,
    SupportedInMultiActions: true,
    Controllers: ['Keypad', 'Information', 'Knob']
  },
];

// !! 请勿修改 !!
module.exports = { PUUID: Plugin.UUID, ApplicationsToMonitor: Plugin.ApplicationsToMonitor, Software: Plugin.Software, Version: Plugin.version, APIVersion: Plugin.APIVersion, CategoryIcon: Plugin.Icon, i18n: Plugin.i18n, Actions };
