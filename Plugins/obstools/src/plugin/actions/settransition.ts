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
      if('transition' in settings) {
        plugin.getAction(context).setTitle(settings.transition);
        const { name } = await getCurrentSceneTransition();
        if(settings.transition === name) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        }
      }
      plugin.obs.on('CurrentSceneTransitionChanged', (data) => {
        const settings = plugin.getAction(context).settings as any;
        if(settings.transition === data.transitionName) {
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
      setSceneTransition(settings.transition, settings.duration);
    },
    async propertyInspectorDidAppear(data) {
      const { context } = data;
      const arr = []
      // 获取场景信息
      // console.log(plugin.obs);
      if (plugin.obs) {
        try{
          let transitions = await getTransitionList();
          console.log(transitions)
          transitions = transitions.map(p => ({key: p.transitionName, value: p.transitionName}));
          plugin.getAction(context).sendToPropertyInspector({ transitionList: transitions })
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
      if('transition' in settings) {
        plugin.getAction(context).setTitle(settings.transition);
        const { name } = await getCurrentSceneTransition();
        if(settings.transition === name) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        }
      }
    }
  });
/**
 * 获取所有转场列表
 * @returns {Promise<Array<{name: string, kind: string}>>}
 */
async function getTransitionList() {
  try {
    const result = await plugin.obs.call('GetSceneTransitionList');
    return result.transitions;
  } catch (error) {
    console.error('获取转场列表失败:', error);
    throw error;
  }
}
/**
 * 获取当前场景转场设置
 * @returns {Promise<{name: string, duration: number}>}
 */
async function getCurrentSceneTransition() {
  try {
    const result = await plugin.obs.call('GetCurrentSceneTransition');
    return {
      id: result.transitionUuid,
      name: result.transitionName,
      duration: result.transitionDuration
    };
  } catch (error) {
    console.error('获取当前转场失败:', error);
    throw error;
  }
}

/**
 * 设置场景转场
 * @param {string} transition - 转场名称
 * @param {number} [duration=300] - 转场时长(毫秒)
 * @returns {Promise<boolean>}
 */
async function setSceneTransition(transitionName, duration = 300) {
  try {
    // 验证转场是否存在
    const transitions = await getTransitionList();
    const transitionExists = transitions.some(t => t.transitionName === transitionName);
    
    if (!transitionExists) {
      throw new Error(`转场 "${transitionName}" 不存在`);
    }

    await plugin.obs.call('SetCurrentSceneTransition', {
      transitionName: transitionName
    });
    
    await plugin.obs.call('SetCurrentSceneTransitionDuration', {
      transitionDuration: duration
    });
    
    // 验证设置是否成功
    const current = await getCurrentSceneTransition();
    return current.name === transitionName && current.duration === duration;
    
  } catch (error) {
    console.error('设置转场失败:', error);
    throw error;
  }
}
}
