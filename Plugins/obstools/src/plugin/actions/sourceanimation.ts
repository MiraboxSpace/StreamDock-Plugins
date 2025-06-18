import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
// import { log } from 'node:console';
import {
  PropertyConfig,
  TransformStage,
  OnUpdateCallback,
  OnUpdateOneStepCallback,
  OnStageBeforeCallback,
  OnStageCompleteCallback,
  OnAllStagesCompleteCallback
} from '@/types/transformDriver';
import TransformDriver from '@/utils/TransformDriver';
export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();
  const timer = {};
  useWatchEvent('action', {
    ActionID,
    willAppear(data) {
      // console.log('创建:', data);

    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    },
    async keyUp({ payload, context }) {
      const settings = payload.settings;
      console.log(settings);
      changeDataFormat(context, settings);
    },
    propertyInspectorDidAppear(data) {
      const { context } = data;
      const arr = []
      // 获取场景信息
      // console.log(plugin.obs);
      if (plugin.obs) {
        plugin.obs?.call('GetSceneList').then(async (data) => {
          // console.log(data);
          let tempScenes = data.scenes.map((_: any) => {
            return {
              "sourceName": _.sceneName,
              "sourceUuid": _.sceneUuid
            }
          })
          arr.push(...tempScenes)
          for (const scene of data.scenes) {
            const sceneItems = await plugin.obs.call('GetSceneItemList', {
              sceneName: scene.sceneName
            });
            console.log(sceneItems);
            let tempSceneItems = sceneItems.sceneItems.map((_: any) => {
              return {
                "sourceName": _.sourceName,
                "sourceUuid": _.sourceUuid
              }
            })
            arr.push(...tempSceneItems)
          }
          plugin.getAction(context).sendToPropertyInspector({ sourceList: arr.reverse() })
        }).catch(err => {
          console.log(err);
          setTimeout(() => {
            this.propertyInspectorDidAppear(data)
          }, 500);
        });
      } else {
        setTimeout(() => {
          this.propertyInspectorDidAppear(data)
        }, 500);
      }

    },
    async sendToPlugin({ payload, context }) {
      const settings = (plugin.getAction(context).settings as any);
      if("record" in payload) {
        if(!settings.recordState) {
          // 未录制 开始录制
          settings.recordState = true;
          let result = await findSceneContainingSource(settings.source);
          settings.recordStart = filterTransformField(result);
          plugin.getAction(context).setSettings(settings);
        }else {
          // 录制中 结束录制
          settings.recordState = false;
          let result = await findSceneContainingSource(settings.source);
          settings.recordEnd = filterTransformField(result);
          plugin.getAction(context).setSettings(settings);
          const animations = (recordStart, recordEnd) => {

            return Object.keys(recordEnd).map(key => {
              return {
                type: key,
                startValue: recordStart[key],
                endValue: recordEnd[key]
              }
            })
          }
          console.log(settings.recordStart, settings.recordEnd)
          plugin.getAction(context).sendToPropertyInspector({
            recordComplete:'recordComplete', 
            animations: animations(settings.recordStart, settings.recordEnd)
          })
        }
      }
      function filterTransformField(params) {
        return {
          positionX: params?.positionX,      // X Position
          positionY: params?.positionY,      // Y Position
          rotation: params?.rotation,       // Rotation
          width: params?.width, // Width (转换为比例)
          height: params?.height,// Height (转换为比例)
          // alignment: params?.alignment,  // Alignment 对齐
          // cropLeft: params?.cropLeft, // 裁剪
          // cropRight: params?.cropRight,
          // cropTop: params?.cropTop,
          // cropBottom: params?.cropBottom,
        }
      }
    },
    async didReceiveSettings({ context, payload }) {
      const settings = (payload.settings as any);
      console.log(settings);
      if ("source" in settings) {
      
      }
    }
  });
  let cache = null;
  let tempTransformStages: TransformStage[] = [];
  let driver = null;
  // 变换数据格式
  const changeDataFormat = async (context, settings: any) => {
    // {
    //       duration: 2000, // 2秒
    //       steps: 20,      // 分为20步
    //       properties: {
    //           x: { startValue: 100, endValue: 500 },
    //           y: { startValue: 100, endValue: 300 },
    //           scale: { startValue: 1, endValue: 2 }
    //       }
    //   },
    cache = await findSceneContainingSource(settings.source);
        console.log(cache, '-------------');

    cache.repeatAnimationCount = settings.repeatAnimationCount;
    cache.count = 0;
    tempTransformStages = settings.phases.map(phase => {
      let duration = phase.aproxTime;
      let steps = phase.steps;
      let properties = {};
      let tempAnimationsType = [...new Set(phase.animations.map(action => action.type))];
      let tempAnimations = tempAnimationsType.map(type => phase.animations.find(action => action.type === type));
      properties = tempAnimations.reduce((acc, item) => {
        acc[item.type] = {
          startValue: item.startValue,
          endValue: item.endValue,
        }
        return acc;
      }, {})
      return {
        duration,
        steps,
        properties
      }
    })
    // 创建变换驱动器实例
    driver = new TransformDriver(context, tempTransformStages, myCustomOnUpdate, myCustomOnUpdateOneStep, onStageBefore, onStageComplete, onAllStagesComplete);
    // 启动变换
    console.log("Starting transformation with TypeScript support...");
    driver.start();
  }
  // 定义一个线性插值函数
  const linearInterpolation: OnUpdateCallback = (context, propertyName, startValue, endValue, currentStep, totalSteps) => {
    const progress = currentStep / totalSteps;
    return startValue + (endValue - startValue) * progress;
  };

  // 定义一个简单的缓入缓出插值函数
  const easeInOutInterpolation: OnUpdateCallback = (context, propertyName, startValue, endValue, currentStep, totalSteps) => {
    const progress = currentStep / totalSteps;
    // 使用一个简单的缓入缓出函数（例如，基于 Math.cos 函数）
    const easedProgress = 0.5 - 0.5 * Math.cos(Math.PI * progress);
    return startValue + (endValue - startValue) * easedProgress;
  };

  // 定义变换阶段
  const transformStages: TransformStage[] = [
    {
      duration: 2000, // 2秒
      steps: 20,      // 分为20步
      properties: {
        x: { startValue: 100, endValue: 500 },
        y: { startValue: 100, endValue: 300 },
        scale: { startValue: 1, endValue: 2 }
      }
    },
    {
      duration: 1500, // 1.5秒
      steps: 15,
      properties: {
        x: { startValue: 500, endValue: 200 },
        y: { startValue: 300, endValue: 100 },
        scale: { startValue: 2, endValue: 0.5 },
        opacity: { startValue: 1, endValue: 0.5 }
      }
    },
    {
      duration: 1000, // 1秒
      steps: 10,
      properties: {
        x: { startValue: 200, endValue: 400 },
        y: { startValue: 100, endValue: 500 },
        scale: { startValue: 0.5, endValue: 1 },
        opacity: { startValue: 0.5, endValue: 1 }
      }
    }
  ];

  // 实现 onUpdate 回调函数
  const myCustomOnUpdate: OnUpdateCallback = (context, propertyName, startValue, endValue, currentStep, totalSteps, stageIndex) => {
    // console.log(transformStages[stageIndex], currentStep)
    // 你可以在这里根据 propName 或 stageIndex 使用不同的计算逻辑
    // if (propertyName === 'x' || propertyName === 'y') {
    //     return linearInterpolation(propertyName, startValue, endValue, currentStep, totalSteps, stageIndex);
    // } else if (propertyName === 'scale') {
    //     return easeInOutInterpolation(propertyName, startValue, endValue, currentStep, totalSteps, stageIndex);
    // } else if (propertyName === 'opacity') {
    //     return linearInterpolation(propertyName, startValue, endValue, currentStep, totalSteps, stageIndex);
    // }
    // // 默认回退到线性插值
    // return linearInterpolation(propertyName, startValue, endValue, currentStep, totalSteps, stageIndex);
    if (propertyName === "alignment") {
      return endValue;
    }
    return linearInterpolation(context, propertyName, startValue, endValue, currentStep, totalSteps, stageIndex);
  };

  const myCustomOnUpdateOneStep: OnUpdateOneStepCallback = (context, transfrom) => {
    // console.log(transfrom);
    setGeometricTransforms(cache.sceneName, cache.sceneItemId, transfrom);
    setColorFilter(cache.sourceUuid, transfrom);
  }

    // 每个阶段开始的回调
  const onStageBefore: OnStageBeforeCallback = (context, stageIndex) => {
    console.log(`Stage ${stageIndex + 1} started!`);
    // 可以在这里执行 OBS 相关的操作，例如记录日志、显示下一个提示等
    const settings = plugin.getAction(context).settings as any;
    console.log(settings.phases[stageIndex]);
    setSourceVisibilityByUuid(settings.source, !settings.phases[stageIndex].startBehaviourHide);
  };

  // 每个阶段完成时的回调
  const onStageComplete: OnStageCompleteCallback = (context, stageIndex) => {
    console.log(`Stage ${stageIndex + 1} completed!`);
    // 可以在这里执行 OBS 相关的操作，例如记录日志、显示下一个提示等
    const settings = plugin.getAction(context).settings as any;
    console.log(settings.phases[stageIndex]);
    setSourceVisibilityByUuid(settings.source, !settings.phases[stageIndex].endBehaviourHide);
    if(settings.phases[stageIndex].endBehaviourRemove) {
      removeFilter(settings.source, 'OBSTOOLS_colorCorrection');
    }
  };

  // 所有阶段完成时的回调
  const onAllStagesComplete: OnAllStagesCompleteCallback = (context) => {
    console.log("All transformation stages have been completed!");
    // 可以在这里执行最终的清理或通知操作
    if(cache.count < cache.repeatAnimationCount) {
      cache.count++;
      driver.start();
    }else {
      cache = null;
      tempTransformStages = [];
      driver = null;
    }
  };
  // 辅助函数：查找包含指定源的所有场景
  async function findSceneContainingSource(sourceUuid) {
    const { scenes } = await plugin.obs.call('GetSceneList');

    for (const scene of scenes) {
      const { sceneItems } = await plugin.obs.call('GetSceneItemList', {
        sceneName: scene.sceneName
      });

      const item = sceneItems.find(i => i.sourceUuid === sourceUuid);
      if (item) {
        // 获取源原始尺寸
        const sourceSettings = await plugin.obs.call('GetSceneItemTransform', {
          sceneUuid: scene.sceneUuid,
          sceneItemId: item.sceneItemId
        });
        let result = {
          sceneName: scene.sceneName,
          sceneUuid: scene.sceneUuid,
          sceneItemId: item.sceneItemId,
          sourceName: item.sourceName,
          sourceUuid: item.sourceUuid
        };
        return Object.assign(result, sourceSettings.sceneItemTransform);
      }
    }
    return null;
  }
  // 设置变换
  async function setGeometricTransforms(sceneName, sceneItemId, params) {
    const tempParams = {
      positionX: params?.positionX,      // X Position
      positionY: params?.positionY,      // Y Position
      rotation: params?.rotation,       // Rotation
      scaleX: params?.width ? params.width / cache.sourceWidth : undefined,  // Width (转换为比例)
      scaleY: params?.height ? params.height / cache.sourceHeight : undefined, // Height (转换为比例)
      alignment: params?.alignment,  // Alignment 对齐
      cropLeft: params?.cropLeft, // 裁剪
      cropRight: params?.cropRight,
      cropTop: params?.cropTop,
      cropBottom: params?.cropBottom,
    }
    const allUndefined = Object.values(tempParams).every(value => value === undefined);
    if (allUndefined) return
    // console.log(tempParams);
    await plugin.obs.call('SetSceneItemTransform', {
      sceneName,
      sceneItemId,
      sceneItemTransform: tempParams
    });
  }
  // 辅助函数：设置颜色滤镜
  async function setColorFilter(sourceUuid, color) {

    const tempColor = {
      brightness: color?.brightness,
      contrast: color?.contrast,
      gamma: color?.gamma,
      hue_shift: color?.hue,
      saturation: color?.saturation,
      opacity: color?.opacity
    }
    const allUndefined = Object.values(tempColor).every(value => value === undefined);
    if (allUndefined) return
    try {
      await plugin.obs.call('SetSourceFilterSettings', {
        sourceUuid,
        filterName: 'OBSTOOLS_colorCorrection',
        filterSettings: tempColor
      });
    } catch (error) {
      // 如果滤镜不存在则创建
      if (error.message.includes('No filter')) {
        await plugin.obs.call('CreateSourceFilter', {
          sourceUuid,
          filterName: 'OBSTOOLS_colorCorrection',
          filterKind: 'color_filter',
          filterSettings: tempColor
        });
      } else {
        throw error;
      }
    }
  }

/**
 * 设置源的可见性
 * @param {string} sceneName - 场景名称
 * @param {number} sceneItemId - 场景项ID
 * @param {boolean} visible - 是否可见
 */
async function setSourceVisibility(sceneName, sceneItemId, visible) {
  await plugin.obs.call('SetSceneItemEnabled', {
    sceneName,
    sceneItemId,
    sceneItemEnabled: visible
  });
}
  /**
 * 通过源UUID设置可见性
 * @param {string} sourceUuid - 源UUID
 * @param {boolean} visible - 是否可见
 */
async function setSourceVisibilityByUuid(sourceUuid, visible) {
  // 查找包含该源的所有场景
  const { scenes } = await plugin.obs.call('GetSceneList');
  
  for (const scene of scenes) {
    const { sceneItems } = await plugin.obs.call('GetSceneItemList', { 
      sceneName: scene.sceneName 
    });
    
    const item = sceneItems.find(i => i.sourceUuid === sourceUuid);
    if (item) {
      await setSourceVisibility(scene.sceneName, item.sceneItemId, visible);
      return; // 找到后立即返回
    }
  }
  
  throw new Error(`未找到UUID为 ${sourceUuid} 的源`);
}
/**
 * 从源移除指定滤镜
 * @param {string} sourceUuid - 源名称
 * @param {string} filterName - 要移除的滤镜名称
 */
async function removeFilter(sourceUuid, filterName) {
  try {
    await plugin.obs.call('RemoveSourceFilter', {
      sourceUuid,
      filterName
    });
    console.log(`已成功从源 ${sourceUuid} 移除滤镜 ${filterName}`);
  } catch (error) {
    console.error(`移除滤镜失败: ${error.message}`);
    throw error;
  }
}
}
