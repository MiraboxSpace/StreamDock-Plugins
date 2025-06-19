// 定时器线程
  const Timer = new Worker('interval.js');
  const TimerSubscribe: { uuid: string; fn: () => void }[] = [];
  Timer.addEventListener('message', ({ data: { event, uuid } }: { data: { event: string; uuid: string } }) => {
    const subIndex = TimerSubscribe.findIndex((item) => item.uuid === uuid);
    subIndex !== -1 && event === 'setInterval' && TimerSubscribe[subIndex].fn();
  });

  // 创建定时器
  const Interval = (uuid: string, delay: number, fn: () => void) => {
    TimerSubscribe.findIndex((item) => item.uuid === uuid) === -1 && TimerSubscribe.push({ uuid, fn });
    Timer.postMessage({ event: 'setInterval', uuid, delay });
  };

  // 销毁定时器
  const Unterval = (uuid: string) => {
    const subIndex = TimerSubscribe.findIndex((item) => item.uuid === uuid);
    subIndex !== -1 && TimerSubscribe.splice(subIndex, 1);
    Timer.postMessage({ event: 'clearInterval', uuid });
  };
import {
    PropertyConfig,
    TransformStage,
    OnUpdateCallback,
    OnUpdateOneStepCallback,
    OnStageBeforeCallback,
    OnStageCompleteCallback,
    OnAllStagesCompleteCallback
} from '@/types/transformDriver';
class TransformDriver {
    private context: string;
    private stages: TransformStage[];
    private onUpdate: OnUpdateCallback;
    private onUpdateOneStep: OnUpdateOneStepCallback;
    private onStageBefore: OnStageBeforeCallback | null;
    private onStageComplete: OnStageCompleteCallback | null;
    private onAllStagesComplete: OnAllStagesCompleteCallback | null;
    private currentStageIndex: number;
    private isStopped: boolean;
    private currentTimeout: number | null = null; // 用于存储 setTimeout 的 ID，以便停止

    /**
     * 构造函数
     * @param stages - 变换阶段的数组。
     * @param onUpdate - 属性更新时的回调函数，负责计算当前属性值。
     * @param onUpdateOneStep - 阶段属性一步计算完成后回调。
     * @param onStageBefore - (可选) 每个阶段开始前的回调函数。
     * @param onStageComplete - (可选) 每个阶段完成时的回调函数。
     * @param onAllStagesComplete - (可选) 所有阶段完成时的回调函数。
     */
    constructor(
        context: string,
        stages: TransformStage[],
        onUpdate: OnUpdateCallback,
        onUpdateOneStep: OnUpdateOneStepCallback,
        onStageBefore: OnStageBeforeCallback | null = null,
        onStageComplete: OnStageCompleteCallback | null = null,
        onAllStagesComplete: OnAllStagesCompleteCallback | null = null
    ) {
        if (!Array.isArray(stages) || stages.length === 0) {
            throw new Error("Stages must be a non-empty array.");
        }
        if (typeof onUpdate !== 'function') {
            throw new Error("onUpdate callback must be a function.");
        }
        if (onStageComplete && typeof onStageComplete !== 'function') {
            throw new Error("onStageComplete callback must be a function if provided.");
        }
        if (onAllStagesComplete && typeof onAllStagesComplete !== 'function') {
            throw new Error("onAllStagesComplete callback must be a function if provided.");
        }
        this.context = context;
        this.stages = stages;
        this.onUpdate = onUpdate;
        this.onUpdateOneStep = onUpdateOneStep;
        this.onStageBefore = onStageBefore;
        this.onStageComplete = onStageComplete;
        this.onAllStagesComplete = onAllStagesComplete;
        this.currentStageIndex = 0;
        this.isStopped = false;
    }

    /**
     * 启动变换驱动器
     */
    start(): void {
        this.isStopped = false;
        this.currentStageIndex = 0;
        this._runNextStage();
    }

    /**
     * 停止变换驱动器
     */
    stop(): void {
        this.isStopped = true;
        if (this.currentTimeout !== null) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
        console.log("TransformDriver stopped.");
    }

    /**
     * 运行下一个阶段
     * @private
     */
    private _runNextStage(): void {
        if (this.isStopped) {
            return;
        }

        if (this.currentStageIndex < this.stages.length) {
            const currentStage = this.stages[this.currentStageIndex];
            console.log(`Starting stage ${this.currentStageIndex + 1}/${this.stages.length}`);
            this.onStageBefore(this.context, this.currentStageIndex)
            this._executeStage(currentStage, this.currentStageIndex)
                .then(() => {
                    if (!this.isStopped && this.onStageComplete) {
                        this.onStageComplete(this.context, this.currentStageIndex);
                    }
                    this.currentStageIndex++;
                    this._runNextStage();
                })
                .catch(error => {
                    console.error("Error during stage execution:", error);
                });
        } else {
            console.log("All stages completed.");
            if (this.onAllStagesComplete) {
                this.onAllStagesComplete(this.context);
            }
        }
    }

    /**
     * 执行单个阶段的变换
     * @param stage - 当前阶段的配置
     * @param stageIndex - 当前阶段的索引
     * @returns 当阶段完成时解决的 Promise
     * @private
     */
    private _executeStage(stage: TransformStage, stageIndex: number): Promise<void> {
        return new Promise(resolve => {
            const { duration, steps, properties } = stage;
            const interval = duration / steps; // 每一步的间隔时间

            let currentStep = 0;
            const animateStep = () => {
                if (this.isStopped || currentStep > steps || Object.keys(properties).length === 0) {
                    resolve();
                    return;
                }

                const valuesToSend: { [key: string]: number } = {};
                for (const propName in properties) {
                    if (properties.hasOwnProperty(propName)) {
                        const { startValue, endValue } = properties[propName];
                        // 调用外部回调来计算当前属性值
                        const currentValue = this.onUpdate(this.context, propName, startValue, endValue, currentStep, steps, stageIndex);
                        valuesToSend[propName] = currentValue;
                    }
                }

                // 实际 OBS 更新逻辑会在这里，例如 mockOBS.setSceneItemProperties(valuesToSend);
                // console.log(`Stage ${stageIndex + 1}, Step ${currentStep}/${steps}:`, valuesToSend);
                this.onUpdateOneStep(this.context, valuesToSend);

                currentStep++;
                if (currentStep <= steps) {
                    this.currentTimeout = (setTimeout(animateStep, interval) as unknown as number);
                    // this.currentTimeout = new Date().getTime();
                    // Interval("driver" + this.currentTimeout, interval, animateStep);
                } else {
                    // Unterval("driver" + this.currentTimeout);
                    this.currentTimeout = null; // 阶段完成，清除定时器ID
                    resolve();
                }
            };

            animateStep(); // 开始执行第一步
        });
    }
}

export default TransformDriver;