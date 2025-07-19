import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { log } from 'node:console';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();

  const timer = {};
  let longPressThreshold = 1000 // 长按阈值，单位毫秒
  let longPressTimers = {}  // 用于存储每个实例的长按定时器
  useWatchEvent('action', {
    ActionID,

    async willAppear(data) {
      // console.log('创建:', data);
      const context = data.context;
      try {
        const isActive = await checkReplayBufferStatus();
        if(isActive) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        }
      } catch (error) {
        console.log(error)
        setTimeout(() => {
          this.willAppear(data);
        }, 1000);
        return
      }
      try {
        plugin.obs.on('ReplayBufferStateChanged',(data: any) => {
          if(data.outputActive) {
            plugin.getAction(context).setState(1);
          }else {
            plugin.getAction(context).setState(0);
          }
        })
      } catch (error) {
        setTimeout(() => {
          this.willAppear(data);
        }, 1000);
      }
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    },
    keyUp(data: any) {
      const context = data.context;
      console.log(`KeyUp on instance ${data.context}:`, longPressTimers[context]);

      // 如果该实例有定时器在运行，说明在阈值时间内抬起了按键，是短按
      if (longPressTimers[context]) {
        clearTimeout(longPressTimers[context]);
        delete longPressTimers[context];
        handleShortPress(data);
      }
    },
    keyDown(data) {
      const context = data.context;

      console.log(`KeyDown on instance ${data.context}:`, longPressTimers[context]);

      // 如果该实例已经有定时器在运行，先清除之前的（防止重复触发）
      if (longPressTimers[context]) {
        clearTimeout(longPressTimers[context]);
        delete longPressTimers[context];
      }

      // 设置一个定时器，在达到阈值后执行长按逻辑
      longPressTimers[context] = setTimeout(() => {
        handleLongPress(data);
        delete longPressTimers[context]; // 长按触发后清除定时器
      }, longPressThreshold);
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
            scene.sources = []
            for (const item of sceneItems.sceneItems) {
              // 每个 item 对应一个 source（来源），我们现在获取 inputKind 来判断它是否是 "ffmpeg_source"
              const { inputKind, inputSettings } = await plugin.obs.call('GetInputSettings', {
                inputName: item.sourceName
              });
              console.log(inputKind)
              if (inputKind === 'ffmpeg_source') {
                scene.sources.push(item)
              }
            }
            scene.sources.reverse()
            console.log(scene)
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
  async function handleShortPress(data) {
    console.log('handleShortPress')
    const settings = data.payload.settings;
        // 执行保存操作
    await plugin.obs.call('SaveReplayBuffer');
    let latesReplayPath = await getLatestReplayPath()
    let currentScene = await getCurrentSceneUUID()
    if (settings.autoSwitch && settings.scene !== currentScene) {
      switchOBSSceneByUUID(settings.scene)
    }
    // 不自动播放
    if(!settings.autoReplay) {
      return
    }
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
    timer[context + 'delay'] && clearTimeout(timer[context + 'delay']);

    
    timer[context + 'delay'] = setTimeout(() => {
      setMediaSourcePlayback(settings.source, latesReplayPath, settings.speed, settings.isMuted);
    }, settings.delay * 1000)

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
  }
  async function handleLongPress(data) {
    console.log('handleLongPress')
    const isActive = await checkReplayBufferStatus();
    console.log(isActive);
    const res = await toggleReplayBuffer(!isActive);
    console.log(res);
  }
  /**
 * 检查回放缓存状态
 * @returns {Promise<boolean>} 是否处于活动状态
 */
  async function checkReplayBufferStatus() {
    try {
      const status = await plugin.obs.call('GetReplayBufferStatus');
      return status.outputActive;
    } catch (error) {
      console.error('检查回放缓存状态失败:', error);
      throw error;
    }
  }
  /**
   * 切换回放缓存状态
   * @param {boolean} enable - true开启/false关闭
   * @returns {Promise<string>} 返回操作结果信息
   */
  async function toggleReplayBuffer(enable) {
    try {
      // 获取当前状态
      const isActive = await checkReplayBufferStatus();

      if (enable) {
        if (isActive) {
          return '回放缓存已处于开启状态';
        }
        await plugin.obs.call('StartReplayBuffer');
        return '回放缓存已成功开启';
      } else {
        if (!isActive) {
          return '回放缓存已处于关闭状态';
        }
        await plugin.obs.call('StopReplayBuffer');
        return '回放缓存已成功关闭';
      }
    } catch (error) {
      console.error('操作回放缓存失败:', error);
      throw new Error(`无法${enable ? '开启' : '关闭'}回放缓存: ${error.message}`);
    }
  }
  /**
 * 获取OBS基本录制目录
 * @returns {Promise<string>} 录制目录路径
 */
  async function getOBSRecordingDirectory() {
    const { recordDirectory } = await plugin.obs.call('GetRecordDirectory');
    return recordDirectory;
  }
  /**
 * 切换OBS场景（基于场景UUID）
 * @param {string} sceneUUID - 要切换的场景UUID
 * @returns {Promise<void>}
 */
  async function switchOBSSceneByUUID(sceneUUID) {
    try {
      // 直接调用全局的 plugin.obs 实例
      const { scenes } = await plugin.obs.call('GetSceneList');

      // 查找匹配UUID的场景
      const targetScene = scenes.find(scene => scene.sceneUuid === sceneUUID);

      if (!targetScene) {
        throw new Error(`未找到UUID为 ${sceneUUID} 的场景`);
      }

      // 切换场景
      await plugin.obs.call('SetCurrentProgramScene', {
        sceneName: targetScene.sceneName
      });

    } catch (error) {
      console.error('切换场景失败:', error);
      throw error;
    }
  }
  /**
 * 获取OBS最新回放文件路径
 * @returns {Promise<string>} 最新回放文件的完整路径
 */
  async function getLatestReplayPath() {
    try {
      // 3. 获取最新回放文件名
      const { savedReplayPath } = await plugin.obs.call('GetLastReplayBufferReplay');
      return savedReplayPath.replace(/\\/g, '/'); // 统一路径分隔符

    } catch (error) {
      console.error('获取回放路径失败:', error);
      throw error;
    }
  }
  /**
   * 获取当前活动场景的UUID
   * @returns {Promise<string>} 当前场景的UUID
   */
  async function getCurrentSceneUUID() {
    try {
      // 1. 获取当前场景名称
      const { sceneName } = await plugin.obs.call('GetCurrentProgramScene');

      // 2. 获取所有场景列表
      const { scenes } = await plugin.obs.call('GetSceneList');

      // 3. 查找当前场景的UUID
      const currentScene = scenes.find(scene => scene.sceneName === sceneName);

      if (!currentScene) {
        throw new Error('无法找到当前场景的UUID');
      }

      return currentScene.sceneUuid;

    } catch (error) {
      console.error('获取当前场景UUID失败:', error);
      throw error;
    }
  }
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
