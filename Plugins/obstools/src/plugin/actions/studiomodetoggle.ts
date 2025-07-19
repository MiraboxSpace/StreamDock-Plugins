import { usePluginStore, useWatchEvent } from '@/hooks/plugin';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();
  const timer = {};
  let listen = null;
  useWatchEvent('action', {
    ActionID,
    async willAppear(data) {
      const context = data.context;
      const settings = data.payload.settings as any;
      console.log('创建:', context);

      try {
        let currentStatus = await getStudioModeStatus();
        if (currentStatus) {
          plugin.getAction(context).setState(1);
            plugin.getAction(context).setTitle(settings.Enabled)
          } else {
            plugin.getAction(context).setState(0);
            plugin.getAction(context).setTitle(settings.Disabled)

          }
      } catch (error) {
        setTimeout(() => {
          this.willAppear(data);
        }, 500)
      }

      try {
        listen = watchStudioMode((studioModeEnabled) => {
          if (studioModeEnabled) {
            plugin.getAction(context).setState(1);
            plugin.getAction(context).setTitle(settings.Enabled)
          } else {
            plugin.getAction(context).setState(0);
            plugin.getAction(context).setTitle(settings.Disabled)

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
      if (listen && listen instanceof Function) listen();
    },
    async keyUp({ payload, context }) {
      await toggleStudioMode();
    },
    propertyInspectorDidAppear(data) {
    },
    async sendToPlugin({ payload, context }) {
    },
    didReceiveSettings({ payload }) {
    }
  });
  /**
 * 获取当前工作室模式状态
 * @returns {Promise<boolean>} 是否处于工作室模式
 */
  async function getStudioModeStatus() {
    try {
      const currentStatus = await plugin.obs.call('GetStudioModeEnabled');
      return currentStatus.studioModeEnabled;
    } catch (error) {
      console.error('获取工作室模式状态失败:', error);
      throw error;
    }
  }

  /**
   * 切换工作室模式状态
   * @returns {Promise<boolean>} 切换后的状态
   */
  async function toggleStudioMode() {
    try {
      const currentStatus = await getStudioModeStatus();
      await plugin.obs.call('SetStudioModeEnabled', {
        studioModeEnabled: !currentStatus
      });
      return !currentStatus;
    } catch (error) {
      console.error('切换工作室模式失败:', error);
      throw error;
    }
  }

  /**
   * 监听工作室模式状态变化
   * @param {(enabled: boolean) => void} callback 
   * @returns {() => void} 取消监听函数
   */
  function watchStudioMode(callback) {
    const handler = (data) => {
      callback(data.studioModeEnabled);
    };

    plugin.obs.on('StudioModeStateChanged', handler);

    return () => {
      plugin.obs.off('StudioModeStateChanged', handler);
    };
  }
}