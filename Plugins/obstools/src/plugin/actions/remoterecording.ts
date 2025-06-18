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
      console.log('创建:远程录制', data);
      const context = data.context;
      const settings = plugin.getAction(context).settings as any;
      try {
        const status = await plugin.obs.call('GetRecordStatus');
        setStateTitle(context, status);
      } catch (error) {
        setTimeout(async () => {
          this.willAppear(data);
        }, 500);
      }
      try {
        setupRecordingStatusListener(data);
      } catch (error) {
        setTimeout(() => {
          this.willAppear(data);
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
      }, Number.parseInt(settings.longKeypressTime));
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

    if (settings.shortPress == "Start/Stop") {
      await controlRecording();
    } else {
      await toggleRecordingPause();
    }
  }
  async function handleLongPress(data: any) {
    const context = data.context;

    const settings = data.payload.settings as any;

    if (settings.longPress == "Start/Stop") {
      await controlRecording();
    } else {
      await toggleRecordingPause();
    }
  }
  /**
   * 控制录制状态（开始/停止）
   * @param {'start'|'stop'|'toggle'} action - 执行的操作
   * @returns {Promise<{success: boolean, message: string, recording: boolean}>}
   */
  async function controlRecording(action: string = 'toggle') {
    try {
      // 获取当前录制状态
      const { outputActive } = await plugin.obs.call('GetRecordStatus');

      // 确定要执行的操作
      let shouldRecord: boolean;
      switch (action.toLowerCase()) {
        case 'start':
          shouldRecord = true;
          break;
        case 'stop':
          shouldRecord = false;
          break;
        case 'toggle':
          shouldRecord = !outputActive;
          break;
        default:
          throw new Error(`无效的操作类型: ${action}`);
      }

      // 执行操作
      if (shouldRecord && !outputActive) {
        await plugin.obs.call('StartRecord');
        return {
          success: true,
          message: '录制已开始',
          recording: true
        };
      }

      if (!shouldRecord && outputActive) {
        await plugin.obs.call('StopRecord');
        return {
          success: true,
          message: '录制已停止',
          recording: false
        };
      }

      // 状态未改变
      return {
        success: true,
        message: `录制已${outputActive ? '在进行中' : '停止'}`,
        recording: outputActive
      };

    } catch (error) {
      console.error('控制录制失败:', error);
      return {
        success: false,
        message: `控制录制失败: ${error.message}`,
        recording: await plugin.obs.call('GetRecordStatus').then(s => s.outputActive)
      };
    }
  }
  async function toggleRecordingPause() {
    try {
      const status = await plugin.obs.call('GetRecordStatus');

      if (!status.outputActive) {
        return { success: false, message: '没有正在进行的录制' };
      }

      if (status.outputPaused) {
        await plugin.obs.call('ResumeRecord');
        return { success: true, message: '录制已恢复' };
      } else {
        await plugin.obs.call('PauseRecord');
        return { success: true, message: '录制已暂停' };
      }

    } catch (error) {
      console.error('切换录制暂停状态失败:', error);
      throw error;
    }
  }
  async function getRecordingStatus() {
    try {
      const status = await plugin.obs.call('GetRecordStatus');

      return {
        isActive: status.outputActive,
        isPaused: status.outputPaused,
        timecode: status.outputTimecode,
        duration: status.outputDuration,
        state: status.outputState
      };

    } catch (error) {
      console.error('获取录制状态失败:', error);
      throw error;
    }
  }
  // 设置监听器
  function setupRecordingStatusListener(actionData) {
    plugin.obs.on('RecordStateChanged', (data) => {
      console.log('录制状态变化:', {
        state: data.outputState
      });
      const context = actionData.context;
      setStateTitle(context, data);
      
    });
  }
  function setStateTitle(context, data) {
      let setttings = plugin.getAction(context).settings as any;
    // 根据状态执行不同操作
      switch (data.outputState) {
        case 'OBS_WEBSOCKET_OUTPUT_STARTED':
          console.log('录制开始');
          plugin.getAction(context).setTitle(setttings.startIcon);
          break;
        case 'OBS_WEBSOCKET_OUTPUT_STOPPED':
          console.log('录制停止');
          plugin.getAction(context).setTitle(setttings.stoppedIcon);
          break;
        case 'OBS_WEBSOCKET_OUTPUT_PAUSED':
          console.log('录制暂停');
          plugin.getAction(context).setTitle(setttings.pausedIcon);
          break;
        case 'OBS_WEBSOCKET_OUTPUT_RESUMED':
          console.log('录制恢复');
          plugin.getAction(context).setTitle(setttings.startIcon);
          break;
      }
  }
}