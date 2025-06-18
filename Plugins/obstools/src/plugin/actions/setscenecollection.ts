import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { log, profile } from 'node:console';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();

  const timer = {};
  useWatchEvent('action', {
    ActionID,
    async willAppear(data) {
      // console.log('创建:', data);
      const context = data.context;
      const settings = plugin.getAction(context).settings as any;
      if('profile' in settings) {
        plugin.getAction(context).setTitle(settings.sceneProfile);
        const currentProfile = await getCurrentSceneCollection();
        if(settings.sceneProfile === currentProfile) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        }
      }
      plugin.obs.on('CurrentSceneCollectionChanged', (data) => {
        const settings = plugin.getAction(context).settings as any;
        if(settings.sceneProfile === data.sceneCollectionName) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        }

      });
      
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    },
    async keyUp({ payload, context }) {
      const settings = payload.settings;
      console.log(settings);
      setSceneCollection(settings.sceneProfile);
    },
    async propertyInspectorDidAppear(data) {
      const { context } = data;
      const arr = []
      // 获取场景信息
      // console.log(plugin.obs);
      if (plugin.obs) {
        try{
          let profileList = await getSceneCollectionList();
          profileList = profileList.map(p => ({key: p, value: p}));
          plugin.getAction(context).sendToPropertyInspector({ profileList: profileList })
        } catch (err) {
          console.log(err);
          setTimeout(() => {
            this.propertyInspectorDidAppear(data)
          }, 500);
        }
      } else {
        setTimeout(() => {
          this.propertyInspectorDidAppear(data)
        }, 500);
      }

    },
    async sendToPlugin({ payload, context }) {

    },
    async didReceiveSettings({ context, payload }) {
      const settings = (payload.settings as any);
      console.log(settings);
      if('sceneProfile' in settings) {
        plugin.getAction(context).setTitle(settings.sceneProfile);
        const currentProfile = await getCurrentSceneCollection();
        if(settings.sceneProfile === currentProfile) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        }
      }
    }
  });
/**
 * 获取当前场景集合名称
 * @returns {Promise<string>} 当前场景集合名称
 */
async function getCurrentSceneCollection() {
  try {
    const result = await plugin.obs.call('GetSceneCollectionList');
    return result.currentSceneCollectionName;
  } catch (error) {
    console.error('获取当前场景集合失败:', error);
    throw error;
  }
}
/**
 * 获取所有场景集合列表
 * @returns {Promise<string[]>} 场景集合名称数组
 */
async function getSceneCollectionList() {
  try {
    const result = await plugin.obs.call('GetSceneCollectionList');
    return result.sceneCollections;
  } catch (error) {
    console.error('获取场景集合列表失败:', error);
    throw error;
  }
}
/**
 * 设置当前场景集合
 * @param {string} collectionName - 要设置的场景集合名称
 * @returns {Promise<boolean>} 是否设置成功
 */
async function setSceneCollection(collectionName) {
  try {
    // 先获取所有场景集合验证是否存在
    const collections = await getSceneCollectionList();
    if (!collections.includes(collectionName)) {
      throw new Error(`场景集合 "${collectionName}" 不存在`);
    }
    
    await plugin.obs.call('SetCurrentSceneCollection', {
      'sceneCollectionName': collectionName
    });
    
    // 验证是否设置成功
    const current = await getCurrentSceneCollection();
    return current === collectionName;
    
  } catch (error) {
    console.error('设置场景集合失败:', error);
    throw error;
  }
}
}
