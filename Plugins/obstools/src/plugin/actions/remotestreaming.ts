import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { log } from 'node:console';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();
  let longPressThreshold = 1000 // 长按阈值，单位毫秒
  let longPressTimers = {}  // 用于存储每个实例的长按定时器
  const timer = {};
  useWatchEvent('action', {
    ActionID,
    async willAppear(data) {
      // console.log('创建:', data);
      const context = data.context;
      const settings = plugin.getAction(context).settings as any;
      try {
        const state = await getStreamStatus();
        setStateTitle(context, state.streaming);
      } catch (error) {
        setTimeout(async () => {
          const state = await getStreamStatus();
          setStateTitle(context, state.streaming);
        }, 500);
      }
      try {
        plugin.obs.on('StreamStateChanged', (data) => {
          setStateTitle(context, data.outputActive)
        });
      } catch (error) {
        setTimeout(() => {
          plugin.obs.on('StreamStateChanged', (data) => {
            setStateTitle(context, data.outputActive)
          });
        }, 500);
      }
      // plugin.Interval(context, 1000, async () => {
      //   const settings = plugin.getAction(context).settings as any;
      // })
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
      const settings = data.payload.settings as any;
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
    async propertyInspectorDidAppear(data) {
      const { context } = data;

    },
    async sendToPlugin({ payload, context }) {
    },
    didReceiveSettings({ payload }) {

    }
  });
  async function handleShortPress(data: any) {
    const context = data.context;

    const settings = data.payload.settings as any;

    controlStreaming();
  }
  async function handleLongPress(data: any) {

  }
  /**
 * 控制推流状态（开始/停止/切换）
 * @param {'start'|'stop'|'toggle'} action - 执行的操作
 * @returns {Promise<{success: boolean, streaming: boolean, message: string}>}
 */
async function controlStreaming(action = 'toggle') {
  try {
    // 获取当前状态
    const { outputActive } = await plugin.obs.call('GetStreamStatus');
    
    // 确定目标状态
    let shouldStream;
    switch (action.toLowerCase()) {
      case 'start':
        shouldStream = true;
        break;
      case 'stop':
        shouldStream = false;
        break;
      case 'toggle':
        shouldStream = !outputActive;
        break;
      default:
        throw new Error(`无效的操作类型: ${action}`);
    }
    
    // 执行操作
    if (shouldStream && !outputActive) {
      await plugin.obs.call('StartStream');
      return {
        success: true,
        streaming: true,
        message: '推流已开始'
      };
    }
    
    if (!shouldStream && outputActive) {
      await plugin.obs.call('StopStream');
      return {
        success: true,
        streaming: false,
        message: '推流已停止'
      };
    }
    
    // 状态未改变
    return {
      success: true,
      streaming: outputActive,
      message: `推流已${outputActive ? '在进行中' : '停止'}`
    };
    
  } catch (error) {
    console.error('控制推流失败:', error);
    const currentStatus = await plugin.obs.call('GetStreamStatus');
    return {
      success: false,
      streaming: currentStatus.outputActive,
      message: `控制推流失败: ${error.message}`
    };
  }
}
/**
 * 获取当前推流状态
 * @returns {Promise<{streaming: boolean, status: string, timecode?: string}>}
 */
async function getStreamStatus() {
  try {
    const status = await plugin.obs.call('GetStreamStatus');
    
    return {
      streaming: status.outputActive
    };
    
  } catch (error) {
    console.error('获取推流状态失败:', error);
    throw error;
  }
}
function setStateTitle(context, state) {
      let setttings = plugin.getAction(context).settings as any;
    // 根据状态执行不同操作
      if(state) {
        plugin.getAction(context).setTitle(setttings.streamingIcon);
      }else {
        plugin.getAction(context).setTitle(setttings.stoppedIcon);
      }
  }

}