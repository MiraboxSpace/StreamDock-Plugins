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
          let [state, result] = await getInputVolume(settings.inputUuid);
          if(state) {
            settings.inputVolumeDb = result.inputVolumeDb;
          }else {
            settings.inputVolumeDb = 0;
          }
          plugin.getAction(context).setSettings(settings);

        } catch (error) {
          console.error(error);
        }
      plugin.Interval(context, 1000, async () => {
        const settings = plugin.getAction(context).settings as any;
        try {
          let [state, result] = await getInputVolume(settings.inputUuid);
          if(!state) {
            plugin.getAction(context).setTitle(result.inputVolumeDb + ' db');
            settings.inputVolumeDb = result.inputVolumeDb;
            plugin.getAction(context).setSettings(settings);
          }else {
            plugin.getAction(context).setTitle(state);
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
      const settings = payload.settings as any;
      console.log(settings)
      let inputVolumeDb = Number.parseInt(settings.inputVolumeDb)
      let step = Number.parseInt(settings.step);
      let sumInputVolumeDb = inputVolumeDb + step;
      if(sumInputVolumeDb >= 0) {
        sumInputVolumeDb = 0;
      }
      if(sumInputVolumeDb <= -100) {
        sumInputVolumeDb = -100;
      }
      setInputVolume({inputUuid: settings.inputUuid, inputVolumeDb: sumInputVolumeDb });
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
// 定义类型
type VolumeParams = {
  inputUuid: string;
  inputVolumeDb?: number; // 音量分贝值（-100 到 26）
  inputVolumeMul?: number; // 音量乘数（0 到 1）
};

type VolumeResponse = {
  inputVolumeDb: number;
  inputVolumeMul: number;
};

/**
 * 设置输入源的音量（通过 inputUuid）
 * @param params - 包含 inputUuid 和音量参数（inputVolumeMul 或 inputVolumeMul）
 * @returns Promise<boolean> - 操作是否成功
 */
async function setInputVolume(params: VolumeParams): Promise<boolean> {
  try {
    await plugin.obs.call('SetInputVolume', {
      inputUuid: params.inputUuid,
      inputVolumeDb: params.inputVolumeDb,
      inputVolumeMul: params.inputVolumeMul,
    });
    console.log(
      `✅ 已设置 UUID=${params.inputUuid} 音量: ${params.inputVolumeDb !== undefined ? `${params.inputVolumeMul} dB` : `${params.volumeMul! * 100}%`}`
    );
    return true;
  } catch (error) {
    console.error(`❌ 设置音量失败 (UUID=${params.inputUuid}):`, error);
    return false;
  }
}

/**
 * 获取输入源的当前音量（通过 inputUuid）
 * @param inputUuid - 输入源的唯一标识符
 * @returns Promise<VolumeResponse> - 包含音量分贝值和乘数
 */
async function getInputVolume(inputUuid: string): Promise<[any, any]> {
  try {
    const response = await plugin.obs.call('GetInputVolume', { inputUuid });
    console.log(
      `🔊 UUID=${inputUuid} 当前音量: ${response.inputVolumeDb} dB (${response.inputVolumeMul * 100}%)`
    );
    return [null ,{
      inputVolumeDb: response.inputVolumeDb,
      inputVolumeMul: response.inputVolumeMul,
    }]
  } catch (error) {
    console.error(`❌ 获取音量失败 (UUID=${inputUuid}):`, error);
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
