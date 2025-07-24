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
        // const { sceneName } = await plugin.obs.call('GetCurrentProgramScene');
        const sceneName = await getNextSceneName();
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
    let { scenes } = await plugin.obs.call('GetSceneList');
    scenes = scenes.reverse(); // 反转数组顺序
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
async function getNextSceneName() {
  try {
    // 获取当前场景和场景列表
    const [{ currentProgramSceneName }, { scenes }] = await Promise.all([
      plugin.obs.call('GetCurrentProgramScene'),
      plugin.obs.call('GetSceneList')
    ]);
    
    // 确保场景列表顺序与UI一致（可能需要反转）
    const orderedScenes = scenes.reverse(); // 或使用其他排序方法
    
    // 查找当前场景索引
    const currentIndex = orderedScenes.findIndex(s => s.sceneName === currentProgramSceneName);
    
    if (currentIndex === -1) {
      console.error('当前场景不在场景列表中');
      return null;
    }
    
    // 计算下一个场景索引（循环到开头）
    const nextIndex = (currentIndex + 1) % orderedScenes.length;
    
    return orderedScenes[nextIndex].sceneName;
  } catch (error) {
    console.error('获取下一个场景失败:', error);
    return null;
  }
}
}