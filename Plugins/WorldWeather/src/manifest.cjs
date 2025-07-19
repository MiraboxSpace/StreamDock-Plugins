/**
 * StreamDock Plugin Template V1.2.1 说明文件 =>
 *
 *      1 => 开发环境支持热更新 => 修改代码无需重启服务器和软件 ( 修改图片/配置文件时需要重启 ) !
 *      2 => 自动打包到插件目录 => 使用 pnpm dev/build 即可自动打包到插件目录，无需手动复制删除。
 *      3 => 数据持久化驱动视图 => 通过 v-model 绑定 settings 的值即可实现双向绑定持久化数据回显啦 !
 *      4 => 完美集成 Navie UI 组件库 => 主题可调，无需穿透样式，有超过 90 个组件，希望能帮你少写点代码。
 *
 *      !! 注意事项 !! => 自动化含有许多约定配置 => 以下内容请务必认真填写 => 祝你开发愉快 _> </>
 *
 * =========== Kriac =================================================================================== 于 2024.03.30 更新 ===========>
 */

const Plugin = {
  UUID: 'worldWeather',
  version: '1.0.2',
  APIVersion: '1.0',
  Icon: 'images/icon.svg',
  i18n: {
    en: {
      Name: 'World Weather',
      Description: 'World Weather'
    },
    zh_CN: {
      Name: '世界天气',
      Description: '世界天气'
    },
    es: {
      Name: 'Tiempo Mundial',
      Description: 'Tiempo Mundial'
    },
    it: {
      Name: 'Meteo Mondiale',
      Description: 'Meteo Mondiale'
    },
    pt: {
      Name: 'Clima Mundial',
      Description: 'Clima Mundial'
    },
    fr: {
      Name: 'Météo Mondiale',
      Description: 'Météo Mondiale'
    },
    de: {
      Name: 'Weltwetter',
      Description: 'Weltwetter'
    },
    ko: {
      Name: '세계 날씨',
      Description: '세계 날씨'
    },
    ja: {
      Name: '世界の天気',
      Description: '世界の天気'
    },
    ru: {
      Name: 'Мировая погода',
      Description: 'Мировая погода'
    },
    pl: {
      Name: 'Pogoda na świecie',
      Description: 'Pogoda na świecie'
    },
    ar: {
      Name: 'طقس العالم',
      Description: 'طقس العالم'
    }
  }
};

// 操作数组
const Actions = [
  {
    UUID: 'action1',
    Icon: 'images/icon.svg',
    i18n: {
      en: {
        Name: 'Weather',
        Tooltip: 'Weather'
      },
      zh_CN: {
        Name: '天气',
        Tooltip: '天气'
      },
      es: {
        Name: 'Tiempo',
        Tooltip: 'Tiempo'
      },
      it: {
        Name: 'Meteo',
        Tooltip: 'Meteo'
      },
      pt: {
        Name: 'Clima',
        Tooltip: 'Clima'
      },
      fr: {
        Name: 'Météo',
        Tooltip: 'Météo'
      },
      de: {
        Name: 'Wetter',
        Tooltip: 'Wetter'
      },
      ko: {
        Name: '날씨',
        Tooltip: '날씨'
      },
      ja: {
        Name: '天気',
        Tooltip: '天気'
      },
      ru: {
        Name: 'Погода',
        Tooltip: 'Погода'
      },
      pl: {
        Name: 'Pogoda',
        Tooltip: 'Pogoda'
      },
      ar: {
        Name: 'الطقس',
        Tooltip: 'الطقس'
      }
    },
    state: 0,
    States: [
      {
        FontSize: '10',
        TitleAlignment: 'bottom',
        Image: 'images/icon.svg'
      }
    ],
    Settings: {
      mode: "icon",
      customName: "",
      custom: false,
      refresh: 30 * 60 * 1000,
      tempList: "℃"
    },
    UserTitleEnabled: false,
    SupportedInMultiActions: false,
    Controllers: ['Keypad', 'Information']
  }
];

// !! 请勿修改 !!
module.exports = { PUUID: Plugin.UUID, Version: Plugin.version, APIVersion: Plugin.APIVersion, CategoryIcon: Plugin.Icon, i18n: Plugin.i18n, Actions };
