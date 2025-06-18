/**
 * 定义单个属性的变换配置
 */
interface PropertyConfig {
    startValue: number;
    endValue: number;
}

/**
 * 定义单个变换阶段的配置
 */
interface TransformStage {
    duration: number; // 毫秒
    steps: number;    // 总步数
    properties: {
        [key: string]: PropertyConfig; // 键为属性名，值为 PropertyConfig
    };
}

/**
 * onUpdate 回调函数的类型定义
 * @param context - 动画插件标识
 * @param propertyName - 当前正在处理的属性名称
 * @param startValue - 属性的起始值
 * @param endValue - 属性的结束值
 * @param currentStep - 当前的步数 (从 0 到 totalSteps)
 * @param totalSteps - 当前阶段的总步数
 * @param stageIndex - 当前阶段的索引 (从 0 开始)
 * @returns 计算出的当前属性值
 */
type OnUpdateCallback = (
    context: string,
    propertyName: string,
    startValue: number,
    endValue: number,
    currentStep: number,
    totalSteps: number,
    stageIndex: number
) => number;
/**
 * OnUpdateOneStepCallback 一步的变换的类型定义
 * @param context - 动画插件标识
 * @param transform - 一步的变换值
 */
type OnUpdateOneStepCallback = (
    context: string,
    transform: any
) => void

/**
 * onStageComplete 回调函数的类型定义
 * @param context - 动画插件标识
 * @param stageIndex - 完成的阶段索引
 */
type OnStageBeforeCallback = (context: string, stageIndex: number) => void;

/**
 * onStageComplete 回调函数的类型定义
 * @param context - 动画插件标识
 * @param stageIndex - 完成的阶段索引
 */
type OnStageCompleteCallback = (context: string, stageIndex: number) => void;

/**
 * onAllStagesComplete 回调函数的类型定义
 */
type OnAllStagesCompleteCallback = (context: string) => void;

export {
    PropertyConfig,
    TransformStage,
    OnUpdateCallback,
    OnUpdateOneStepCallback,
    OnStageBeforeCallback,
    OnStageCompleteCallback,
    OnAllStagesCompleteCallback
};