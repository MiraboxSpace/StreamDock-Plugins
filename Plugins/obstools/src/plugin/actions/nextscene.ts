import { usePluginStore, useWatchEvent } from '@/hooks/plugin';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();
  const timer = {};
  useWatchEvent('action', {
    ActionID,
    willAppear({ context }) {
      console.log('创建:', context);
      plugin.Interval(context, 1000, async () => {
        const { sceneName } = await plugin.obs.call('GetCurrentProgramScene');
        plugin.getAction(context).setTitle(sceneName);
      })
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    },
    async keyUp({ payload, context }) {
      await nextScene();
    },
    propertyInspectorDidAppear(data) {
    },
    async sendToPlugin({ payload, context }) {
    },
    didReceiveSettings({ payload }) {
    }
  });
  /**
 * 切换到下一个场景
 */
async function nextScene() {
  try {
    // 获取当前场景
    const currentScene = await plugin.obs.call('GetCurrentProgramScene');
    
    // 获取场景列表
    const { scenes } = await plugin.obs.call('GetSceneList');
    
    // 查找当前场景索引
    const currentIndex = scenes.findIndex(s => s.sceneName === currentScene.sceneName);
    
    if (currentIndex === -1) {
      throw new Error('当前场景不在场景列表中');
    }
    
    // 计算下一个场景索引
    const nextIndex = (currentIndex + 1) % scenes.length;
    
    // 切换场景
    await plugin.obs.call('SetCurrentProgramScene', {
      sceneName: scenes[nextIndex].sceneName
    });
    
    return {
      success: true,
      sceneName: scenes[nextIndex].sceneName
    };
    
  } catch (error) {
    console.error('切换到下一个场景失败:', error);
    throw error;
  }
}
}