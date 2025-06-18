import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { log } from 'node:console';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();
  let listen = null;
  const timer = {};
  useWatchEvent('action', {
    ActionID,
    async willAppear(data) {
      console.log('创建:源可见性', data);
      const context = data.context;
      const settings = data.payload.settings as any;
      try {
        let visibility = await getSourceVisibility(settings.source);
        if(visibility) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        } 
      } catch (error) {
        setTimeout(() => {
          this.willAppear(data);
        }, 500)
      }
      try {
        listen = watchSourceVisibility((data) => {
          const settings = plugin.getAction(context).settings as any;
          console.log(data, settings.scene);
          if(data.sceneUuid === settings.scene && data.sceneItemEnabled) {
            plugin.getAction(context).setState(1);
          }else {
            plugin.getAction(context).setState(0);
          } 
        })
      } catch (error) {
        setTimeout(() => {
          this.willAppear(data);
        }, 500)
      }

    },
    willDisappear({ context }) {
      plugin.Unterval(context);
      if(listen && listen instanceof Function) listen();
    },
    async keyUp({ payload, context }) {
      const settings = payload.settings;
      toggleSourceVisibility(payload.settings.source)
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
              scene.sources.push(item)
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
    async didReceiveSettings(data) {
      const context = data.context;
      const settings = data.payload.settings as any;
      try {
        let visibility = await getSourceVisibility(settings.source);
        console.log(visibility);
        if(visibility) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        } 
      } catch (error) {
        setTimeout(() => {
          this.didReceiveSettings(data);
        }, 500)
      }
    }
  });
  /**
   * 切换源的可见性
   * @param {string} sourceUuid - 源的UUID
   * @returns {Promise<boolean>} 切换后的可见状态
   */
  async function toggleSourceVisibility(sourceUuid) {
    const currentState = await getSourceVisibility(sourceUuid);
    await setSourceVisibility(sourceUuid, !currentState);
    return !currentState;
  }
  /**
   * 获取源的可见性
   * @param {string} sourceUuid - 源的UUID
   * @returns {Promise<boolean>} 当前可见状态
   */
  async function getSourceVisibility(sourceUuid) {
    const currentScene = await plugin.obs.call('GetCurrentProgramScene');
    const sceneItems = await plugin.obs.call('GetSceneItemList', {
      sceneName: currentScene.sceneName
    });

    const source = sceneItems.sceneItems.find(item => item.sourceUuid === sourceUuid);
    if (!source) {
      return false;
      // throw new Error(`未找到UUID为 ${sourceUuid} 的源`);
    }

    return source.sceneItemEnabled;
  }
  /**
   * 设置源的可见性
   * @param {string} sourceUuid - 源的UUID
   * @param {boolean} visible - 是否可见
   * @returns {Promise<boolean>} 是否设置成功
   */
  async function setSourceVisibility(sourceUuid, visible) {
    const currentScene = await plugin.obs.call('GetCurrentProgramScene');
    const sceneItems = await plugin.obs.call('GetSceneItemList', {
      sceneName: currentScene.sceneName
    });

    const source = sceneItems.sceneItems.find(item => item.sourceUuid === sourceUuid);
    if (!source) throw new Error(`未找到UUID为 ${sourceUuid} 的源`);

    await plugin.obs.call('SetSceneItemEnabled', {
      sceneName: currentScene.sceneName,
      sceneItemId: source.sceneItemId,
      sceneItemEnabled: visible
    });

    return true;
  }

  /**
   * 监听源可见性变化
   * @param {string} sourceUuid - 源的UUID
   * @param {(visible: boolean) => void} callback - 回调函数
   * @returns {() => void} 取消监听的函数
   */
  function watchSourceVisibility(handler) {
    plugin.obs.on('SceneItemEnableStateChanged', handler);

    return () => plugin.obs.off('SceneItemEnableStateChanged', handler);
  }
}
