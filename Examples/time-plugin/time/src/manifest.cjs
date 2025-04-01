/**
 * StreamDock Plugin Template V1.0.0 说明文件 =>
 *
 *      1 => 开发环境支持热更新 => 修改代码无需重启服务器和软件 ( 修改图片/配置文件时需要重启 ) !
 *      2 => 自动打包到插件目录 => 使用 pnpm dev/build 即可自动打包到插件目录，无需手动复制删除。
 *      3 => 数据持久化驱动视图 => 通过 v-model 绑定 settings 的值即可实现双向绑定持久化数据回显啦 !
 *      4 => 完美集成 Navie UI 组件库 => 主题可调，无需穿透样式，有超过 90 个组件，希望能帮你少写点代码。
 *
 *      !! 注意事项 !! => 自动化含有许多约定配置 => 以下内容请务必认真填写 => 祝你开发愉快 _> </>
 *
 * =========== Kriac =================================================================================== 于 2024.03.11 更新 ===========>
 */

const Plugin = {
  UUID: 'timeDemo',
  version: '2.0',
  Icon: 'images/cate.png',
  i18n: {
    en: {
      Name: 'Time Options',
      Description: 'Drag in to view time in different time zones and experience the world in different time zones!'
    },
    zh_CN: {
      Name: '时间选项',
      Description: '拖入查看不同时区的时间, 感受不同时区下的世界！'
    },
    es: {
      Name: 'Tiempo',
      Tooltip: 'Tiempo'
    }
  }
};

// 操作数组
const Actions = [
  {
    UUID: 'action1',
    Icon: 'images/world.png',
    i18n: {
      en: {
        Name: 'World Time',
        Tooltip: 'Drag view world time in different time zones'
      },
      zh_CN: {
        Name: '世界时',
        Tooltip: '拖入查看不同时区的时间'
      },
      es: {
        Name: 'Reloj',
        Tooltip: 'Reloj'
      }
    },
    state: 0,
    States: [
      {
        FontSize: '11',
        FontStyle: 'Bold',
        TitleAlignment: 'bottom',
        Image: 'images/index.jpg'
      }
    ],
    Settings: {
      amplify: true,
      zone: 'system',
      theme: 'theme1',
      isBackgroundHidden: false
    },
    UserTitleEnabled: false,
    SupportedInMultiActions: false,
    Controllers: ['Keypad', 'Information']
  }
];

// !! 请勿修改 !!
module.exports = { PUUID: Plugin.UUID, Version: Plugin.version, CategoryIcon: Plugin.Icon, i18n: Plugin.i18n, Actions };
