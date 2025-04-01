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
  UUID: 'DeepSeek',
  version: '0.0.1',
  Icon: 'images/deepseek/deepseek-copy.png',
  i18n: {
    en: {
      Name: 'DeepSeek',
      Description: 'DeepSeek'
    },
    zh_CN: {
      Name: 'DeepSeek',
      Description: 'DeepSeek'
    }
  }
};

// 操作数组
const Actions = [
  {
    UUID: 'deepseek-chat',
    Icon: 'images/deepseek/deepseek-copy.png',
    i18n: {
      en: {
        Name: 'deepseek-chat',
        Tooltip: 'deepseek-chat'
      },
      zh_CN: {
        Name: '对话弹窗',
        Tooltip: '对话弹窗'
      }
    },
    state: 0,
    States: [
      {
        FontSize: '10',
        TitleAlignment: 'bottom',
        Image: 'images/deepseek/deepseek-copy.png'
      }
    ],
    Settings: {},
    UserTitleEnabled: false,
    SupportedInMultiActions: false,
    Controllers: ['Keypad', 'Information']
  },
  // {
  //   UUID: 'deepseekVoiceInput',
  //   Icon: 'images/icon.png',
  //   i18n: {
  //     en: {
  //       Name: 'deepseekVoiceInput',
  //       Tooltip: 'deepseekVoiceInput'
  //     },
  //     zh_CN: {
  //       Name: 'deepseekVoiceInput',
  //       Tooltip: 'deepseekVoiceInput'
  //     }
  //   },
  //   state: 0,
  //   States: [
  //     {
  //       FontSize: '10',
  //       TitleAlignment: 'bottom',
  //       Image: 'images/deepseek/maikefeng.png'
  //     }
  //   ],
  //   Settings: {},
  //   UserTitleEnabled: false,
  //   SupportedInMultiActions: false,
  //   Controllers: ['Keypad', 'Information']
  // },
  {
    UUID: 'hexagrams',
    Icon: 'images/hexagrams/ai.png',
    i18n: {
      en: {
        Name: 'hexagrams',
        Tooltip: 'hexagrams'
      },
      zh_CN: {
        Name: '今日运势',
        Tooltip: '今日运势'
      }
    },
    state: 0,
    States: [
      {
        FontSize: '10',
        TitleAlignment: 'bottom',
        Image: 'images/hexagrams/ai.png'
      }
    ],
    Settings: {},
    UserTitleEnabled: false,
    SupportedInMultiActions: false,
    Controllers: ['Keypad', 'Information']
  }
];

// !! 请勿修改 !!
module.exports = { PUUID: Plugin.UUID, Version: Plugin.version, CategoryIcon: Plugin.Icon, i18n: Plugin.i18n, Actions };
