import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { log } from 'node:console';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();

  const timer = {};
  useWatchEvent('action', {
    ActionID,
    willAppear(data) {
      // console.log('创建:', data);
      plugin.Interval(data.context, 1000, async () => {
        const settings = plugin.getAction(data.context).settings as any;
        const { sceneItems } = await plugin.obs.call('GetSceneItemList', {
          sceneUuid: settings.scene
        });

        const item = sceneItems.find(item => item.sourceUuid === settings.source);
        // console.log(item);
        if (item && item.sceneItemEnabled) {
          plugin.getAction(data.context).setState(1);
        } else {
          plugin.getAction(data.context).setState(0);
        }
      })
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    },
    async keyUp({ payload, context }) {
      const settings = payload.settings;
      const { sceneItems } = await plugin.obs.call('GetSceneItemList', {
        sceneUuid: settings.scene
      });

      const item = sceneItems.find(item => item.sourceUuid === settings.source);
      if (item) {
        await plugin.obs.call('SetSceneItemEnabled', {
          sceneUuid: settings.scene,
          sceneItemId: item.sceneItemId,
          sceneItemEnabled: true
        });
      }

      timer[context] && clearTimeout(timer[context]);
      // 设置浏览器源的 URL
      if (settings.file) {
        plugin.obs?.call('SetInputSettings', {
          inputUuid: settings.source,
          inputSettings: {
            local_file: settings.localFile,
            is_local_file: true
          }
        });
      } else {
        // Set URL
        plugin.obs?.call('SetInputSettings', {
          inputUuid: settings.source,
          inputSettings: {
            url: settings.url ? settings.url : 'https://mirabox.key123.vip/home',
            is_local_file: false
          }
        });
      }

      //设置静音
      // plugin.obs?.call('SetInputMute', {
      //   inputUuid: settings.source,
      //   inputMuted: settings.mute
      // });

      if (settings.autoHide > 0 && settings.autoHide != "") {
        timer[context] = setTimeout(async () => {
          console.log("自动隐藏");
          if (item) {
            await plugin.obs.call('SetSceneItemEnabled', {
              sceneUuid: settings.scene,
              sceneItemId: item.sceneItemId,
              sceneItemEnabled: false
            });
          }
        }, settings.autoHide * 1000);
      }
    },
    propertyInspectorDidAppear(data) {
      const { context } = data;
      const arr = []
      // 获取场景信息
      // console.log(plugin.obs);
      if (plugin.obs) {
        plugin.obs?.call('GetSceneList').then(async (data) => {
          // console.log(data);
          for (const scene of data.scenes) {
            const sceneItems = await plugin.obs.call('GetSceneItemList', {
              sceneName: scene.sceneName
            });
            // console.log(sceneItems);
            scene.sources = []
            for (const item of sceneItems.sceneItems) {
              // 每个 item 对应一个 source（来源），我们现在获取 inputKind 来判断它是否是 browser_source
              const { inputKind, inputSettings } = await plugin.obs.call('GetInputSettings', {
                inputName: item.sourceName
              });

              if (inputKind === 'browser_source') {
                scene.sources.push(item)
              }
            }
            scene.sources.reverse()
            arr.push(scene)
          }
          // console.log(arr);
          plugin.getAction(context).sendToPropertyInspector({ scenes: arr.reverse() })
        }).catch(err => {
          console.log(err);
          setTimeout(() => {
            this.propertyInspectorDidAppear(data)
          }, 500);
        });
      } else {
        setTimeout(() => {
          this.propertyInspectorDidAppear(data)
        }, 500);
      }

    },
    async sendToPlugin({ payload, context }) {
    },
    didReceiveSettings({ payload }) {
    }
  });
}
