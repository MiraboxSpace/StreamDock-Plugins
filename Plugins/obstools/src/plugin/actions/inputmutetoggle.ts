import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { log } from 'node:console';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();

  const timer = {};
  useWatchEvent('action', {
    ActionID,
    async willAppear({context}) {
      // console.log('创建:', data);
      const settings = plugin.getAction(context).settings as any;
        try {
          let [state, result] = await getInputMuteByUuid(settings.inputUuid);
          if(state) {
            settings.muted = result;
          }else {
            settings.muted = false;
          }
          plugin.getAction(context).setSettings(settings);

        } catch (error) {
          console.error(error);
        }
      plugin.Interval(context, 1000, async () => {
        const settings = plugin.getAction(context).settings as any;
        try {
          let [state, result] = await getInputMuteByUuid(settings.inputUuid);
          if(result) {
            plugin.getAction(context).setState(1);
          }else {
            plugin.getAction(context).setState(0);
          }

        } catch (error) {
          console.error(error);
        }
        
      })
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    },
    async keyUp({ payload, context }) {
      const settings = payload.settings;
      console.log(settings)
      setInputMuteByUuid(settings.inputUuid);
    },
    async propertyInspectorDidAppear(data) {
      const { context } = data;
      const arr = []
      // 获取场景信息
      // console.log(plugin.obs);
      if (plugin.obs) {
        try {
          const supportAudio = await filterAudioMonitoringSources()
          plugin.getAction(context).sendToPropertyInspector({ sources: supportAudio })
        } catch (error) {
          setTimeout(() => {
          this.propertyInspectorDidAppear(data)
        }, 500);
        }
      }

    },
    async sendToPlugin({ payload, context }) {
    },
    didReceiveSettings({ payload }) {
      
    }
  });
/**
 * 设置音频输入的静音状态（通过 inputUuid）
 * @param {string} inputUuid - 音频源的唯一标识符（如 "a1b2c3d4-e5f6-7890"）
 * @returns {Promise<boolean>} - 操作是否成功
 */
async function setInputMuteByUuid(inputUuid: string): Promise<boolean> {
  try {
    const response = await plugin.obs.call('ToggleInputMute', {
      inputUuid
    });
    console.log(`✅ 已设置 UUID=${inputUuid} 静音状态: ${response.inputMuted ? '静音' : '取消静音'}`);
    return true;
  } catch (error) {
    console.error(`❌ 设置静音状态失败 (UUID=${inputUuid}):`, error);
    return false;
  }
}

/**
 * 获取音频输入的当前静音状态（通过 inputUuid）
 * @param {string} inputUuid - 音频源的唯一标识符
 * @returns {Promise<boolean>} - true=静音, false=未静音
 */
async function getInputMuteByUuid(inputUuid: string): Promise<[any, any]> {
  try {
    const response = await plugin.obs.call('GetInputMute', { inputUuid });
    // console.log(`🎤 UUID=${inputUuid} 当前状态: ${response.inputMuted ? '静音' : '未静音'}`);
    return [null, response.inputMuted];
  } catch (error) {
    console.error(`❌ 获取静音状态失败 (UUID=${inputUuid}):`, error);
    return [error, null]
  }
}
  // 检查单个源是否支持音频监听
async function isMonitoringSupported(inputName: string, sourceUuid: string) {
  try {
    // 直接查询监听类型
    const { monitorType } = await plugin.obs.call('GetInputAudioMonitorType', {
      inputUuid: sourceUuid,
    });
    // 只要不报错，就说明支持
    return [true, monitorType];
  } catch (error) {
    console.error(`❌ ${inputName} 不支持音频监听:`, error.message);
    return [false, error.message];
  }
}

// 过滤出支持 SetInputAudioMonitorType 的源
async function filterAudioMonitoringSources() {
  try {
    // 1. 获取所有输入源
    const { inputs } = await plugin.obs.call('GetInputList');
    console.log('🔍 所有输入源:', inputs.map(i => i.inputName));

    // 2. 并行检查每个源是否支持
    const results = await Promise.all(
      inputs.map(async (source) => ({
        ...source,
        supported: (await isMonitoringSupported(source.inputName, source.inputUuid))[0],
      }))
    );

    // 3. 过滤出支持的源
    const supportedSources = results.filter((source) => source.supported);
    console.log('✅ 支持音频监听的源:', supportedSources);

    return supportedSources;
  } catch (error) {
    console.error('❌ 过滤失败:', error);
  } finally {
    
  }
}

}
