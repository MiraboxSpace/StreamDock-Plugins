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
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    },
    async keyUp({ payload, context }) {
      const settings = payload.settings;
      const { sceneItems } = await plugin.obs.call('GetSceneItemList', {
        sceneUuid: settings.scene
      });
      const activeWindow = await plugin.obs.call("GetInputList");
      console.log("可用窗口列表:", activeWindow.inputs.map(i => i.inputName));
      const item = sceneItems.find(item => item.sourceUuid === settings.source);
      if (item) {
        // 更新现有源
        await plugin.obs.call("SetInputSettings", {
            inputUuid: item.sourceUuid,
            inputSettings: { window: "[active]", method: "WC" }
        });
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

              if (inputKind === 'window_capture') {
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
