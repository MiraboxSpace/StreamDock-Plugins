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
    async keyUp(data) {
      const settings = data.payload.settings;
      const context = data.context;

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

      setMediaSourcePlayback(settings.source, settings.filePath, settings.speed, settings.isMuted);


      if (settings.autoHide > 0 && settings.autoHide != "") {
        timer[context] = setTimeout(async () => {
          console.log("自动隐藏");
          if (item) {
            await plugin.obs.call('SetSceneItemEnabled', {
              sceneUuid: settings.scene,
              sceneItemId: item.sceneItemId,
              sceneItemEnabled: false
            });
            await plugin.obs.call('TriggerMediaInputAction', {
              inputUuid: settings.source,
              mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP'
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
              // console.log(inputKind, inputSettings);
              if (inputKind === 'ffmpeg_source') {
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
  /**
 * 设置媒体源播放参数（使用inputUuid）
 * @param {string} inputUuid - 媒体源的UUID
 * @param {string} [local_file] - 媒体文件/流的URL
 * @param {number} [speed_percent] - 播放速度1-200
 * @param {boolean} [isMuted] - 是否静音
 * @returns {Promise<void>}
 */
  async function setMediaSourcePlayback(inputUuid: string, local_file: string, speed_percent: number, isMuted: boolean) {
    console.log(inputUuid, local_file, speed_percent, isMuted)
    try {
      // 静音状态通过单独的API设置
      await plugin.obs.call('SetInputMute', {
        inputUuid: inputUuid,
        inputMuted: isMuted ?? false
      });
      await plugin.obs.call('SetInputSettings', {
        inputUuid: inputUuid,  // 替换为你的媒体源
        inputSettings: {
          restart_on_activate: false,
          is_local_file: true,
          local_file: local_file,  // 替换为实际路径
          speed_percent: Number.parseInt(speed_percent.toString())
        }
      });

      // 2. 停止当前播放（确保重置状态）
      await plugin.obs.call('TriggerMediaInputAction', {
        inputUuid: inputUuid,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP'
      });
      // 3. 开始播放
      await plugin.obs.call('TriggerMediaInputAction', {
        inputUuid: inputUuid,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
      });
    } catch (error) {
      console.error('设置媒体源播放失败:', error);
      throw error;
    }
  }
}
