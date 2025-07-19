export default function(plugin, vmInstance, addListener, log, timers) {
  return {
    default: {
        longPressThreshold: 1000, // 长按阈值，单位毫秒
        longPressTimers: {}, // 用于存储每个实例的长按定时器
        async handleShortPress(data) {
            // log.info(`Instance ${data.context} - 短按事件:`, data);
            const context = data.context;
            const settings = data.payload.settings;
        },
        handleLongPress(data) {
            // log.info(`Instance ${data.context} - 长按事件 (triggered on KeyDown):`, data);
            const context = data.context;
            const settings = data.payload.settings;
        },
        observers: [],
        observerFn: function (context, settings) {
            if (this.observers?.[context] && this.observers[context] instanceof Function) {
                this.observers[context]();
            }
            const {
              strip_num,
              setting,
              step_size,
              title,
            } = settings;
            let strCommand = "";
            strCommand = `${'Strip'}[${strip_num}].${setting}`;
            // log.info(context, settings, strCommand);
            this.observers[context] = addListener(strCommand, (value) => {
                this.init(context, settings);
            })
        },
        init: function (context, settings) {
            const {
              strip_num,
              setting,
              step_size,
              title,
            } = settings;
            let strCommand = "";
            strCommand = `${'Strip'}[${strip_num}].${setting}`;
            let str = vmInstance.getOption(strCommand);
            plugin.setTitle(context, title + str);
        },
        setSettingAdjust: function (data) {
          const context = data.context;
          const settings = data.payload.settings;
          const {
            strip_num,
            setting,
            step_size,
            title,
          } = settings;
          let strCommand = "";
          strCommand = `${'Strip'}[${strip_num}].${setting}`;
          if(step_size === "") {
            plugin.showAlert(context);
            return
          };
          let str = vmInstance.getOption(strCommand);
          if(data.payload.ticks > 0) {
            let setting = parseFloat(str) + parseFloat(step_size);
            strCommand += `=${setting > 10? 10: setting}`
            // log.info(strCommand);
            vmInstance.setOption(strCommand)
          }else {
            let setting = parseFloat(str) - parseFloat(step_size);
            strCommand += `=${setting < 0? 0: setting}`
            // log.info(strCommand);
            vmInstance.setOption(strCommand)
          }
        }
    },
    async _willAppear(data) {
        // // log.info("demo: ", context);
        // let n = 0;
        // timers[context] = setInterval(async () => {
        //     const svg = createSvg(++n);
        //     plugin.setImage(context, `data:image/svg+xml;charset=utf8,${svg}`);
        // }, 1000);
        const context = data.context;
        const settings = data.payload.settings;
        try {
            this.default.init(context, settings);
            this.default.observerFn(context, settings);
        } catch (error) {
            setTimeout(() => {
                this._willAppear(data)
            }, 500)
        }

    },
    _willDisappear({ context }) {
        // // log.info('willDisAppear', context)
        timers[context] && clearInterval(timers[context]);
        if (this.observers?.[context] && this.observers[context] instanceof Function) {
            this.observers[context]();
        }
    },
    _propertyInspectorDidAppear({ context }) {
    },
    _didReceiveSettings(data) {
        const context = data.context;
        const settings = data.payload.settings;
        try {
            this.default.init(context, settings);
            this.default.observerFn(context, settings);
        } catch (error) {
            setTimeout(() => {
                this._didReceiveSettings(data)
            }, 500)
        }
    },
    sendToPlugin({ payload, context }) {
    },
    keyDown(data) {
        // log.info(`KeyDown on instance ${data.context}:`);
        return
        const context = data.context;

        // 如果该实例已经有定时器在运行，先清除之前的（防止重复触发）
        if (this.default.longPressTimers[context]) {
            clearTimeout(this.default.longPressTimers[context]);
            delete this.default.longPressTimers[context];
        }

        // 设置一个定时器，在达到阈值后执行长按逻辑
        this.default.longPressTimers[context] = setTimeout(() => {
            this.default.handleLongPress(data);
            delete this.default.longPressTimers[context]; // 长按触发后清除定时器
        }, this.default.longPressThreshold);
    },
    keyUp(data) {
        // log.info(`KeyUp on instance ${data.context}:`);
        return
        const context = data.context;

        // 如果该实例有定时器在运行，说明在阈值时间内抬起了按键，是短按
        if (this.default.longPressTimers[context]) {
            clearTimeout(this.default.longPressTimers[context]);
            delete this.default.longPressTimers[context];
            this.default.handleShortPress(data);
        }
        // 如果没有定时器在运行，说明长按事件已经触发或者之前没有 keyDown 事件
        // 对于长按已经触发的情况，这里可以根据需要添加一些清理逻辑，如果 handleLongPress 中没有处理的话
    },
    dialDown({ context, payload }) { },
    dialRotate({ context, payload }) { 
      // log.info(payload)
      this.default.setSettingAdjust({context, payload})
    }
  }
}