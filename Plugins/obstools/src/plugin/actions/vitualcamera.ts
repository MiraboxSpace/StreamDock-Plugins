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
      console.log('创建:', context);
      try {
        let state = await getVirtualCameraStatus();
        if(state) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        }
      } catch (error) {
        setTimeout(() => {
          this.willAppear(data);
        }, 500)
      }

      plugin.Interval(context, 2000, async () => {
        let state = await getVirtualCameraStatus();
        if(state) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        }
      })

      try {
        // 无法监听
        listen = watchVirtualCamera((studioModeEnabled) => {
          if (studioModeEnabled) {
            plugin.getAction(context).setState(1);
          } else {
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
      if (listen && listen instanceof Function) listen();
    },
    async keyUp({ payload, context }) {
      await toggleVirtualCamera();
    },
    propertyInspectorDidAppear(data) {
    },
    async sendToPlugin({ payload, context }) {
    },
    didReceiveSettings({ payload }) {
    }
  });
/**
 * 切换虚拟摄像机状态
 * @param {boolean} [enable] - 可选，明确指定开启或关闭
 * @returns {Promise<boolean>} 虚拟摄像机最终状态
 */
async function toggleVirtualCamera(enable?: boolean) {
  try {
    const currentStatus = await plugin.obs.call('GetVirtualCamStatus');
    
    // 如果没有指定状态，则切换当前状态
    const shouldEnable = typeof enable === 'boolean' ? enable : !currentStatus.outputActive;
    if (shouldEnable) {
      await plugin.obs.call('StartVirtualCam');
    } else {
      await plugin.obs.call('StopVirtualCam');
    }
    
    return shouldEnable;
  } catch (error) {
    console.error('切换虚拟摄像机失败:', error);
    throw error;
  }
}

/**
 * 获取虚拟摄像机当前状态
 * @returns {Promise<{active: boolean, timecode: string}>}
 */
async function getVirtualCameraStatus() {
  try {
    const response = await plugin.obs.call('GetVirtualCamStatus');
    return response.outputActive
  } catch (error) {
    console.error('获取虚拟摄像机状态失败:', error);
    throw error;
  }
}

/**
 * 监听虚拟摄像机状态变化
 * @param {(active: boolean) => void} callback 
 * @returns {() => void} 取消监听函数
 */
function watchVirtualCamera(callback) {
  console.log('watch')
  const handler = (data) => {
  console.log(data,'watch-----')
    callback(data.outputActive);
  };
  
  plugin.obs.on('VirtualCamStateChanged', (data) => console.log(data));
  
  return () => {
    plugin.obs.off('VirtualCamStateChanged', handler);
  };
}
}