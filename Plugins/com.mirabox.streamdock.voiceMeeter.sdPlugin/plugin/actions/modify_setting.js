export default function(plugin, vmInstance, addListener, log, timers) {
  return {
    default: {
        longPressThreshold: 1000, // 长按阈值，单位毫秒
        longPressTimers: {}, // 用于存储每个实例的长按定时器
        async handleShortPress(data) {
            // log.info(`Instance ${data.context} - 短按事件:`, data);
            const context = data.context;
            const settings = data.payload.settings;
            const {
                param,
                strip_bus,
                strip_bus_num,
                strip_layer,
                value,
                long_press_value
            } = settings;
            let strCommand = "";
            if (strip_bus === "StripLayer") {
                // strCommand = `Strip[5].GainLayer[1]=-20`
                strCommand = `Strip[${strip_bus_num}].GainLayer[${strip_layer}]=${value}`;
            } else {
                strCommand = `${strip_bus}[${strip_bus_num}].${param}=${value}`;
            }
            // log.info(strCommand);
            vmInstance.setOption(strCommand);
        },
        handleLongPress(data) {
            // log.info(`Instance ${data.context} - 长按事件 (triggered on KeyDown):`, data);
            const context = data.context;
            const settings = data.payload.settings;
            const {
                param,
                strip_bus,
                strip_bus_num,
                strip_layer,
                value,
                long_press_value
            } = settings;
            let strCommand = "";
            if (strip_bus === "StripLayer") {
                // strCommand = `Strip[5].GainLayer[1]=-20`
                strCommand = `Strip[${strip_bus_num}].GainLayer[${strip_layer}]=${long_press_value}`;
            } else {
                strCommand = `${strip_bus}[${strip_bus_num}].${param}=${long_press_value}`;
            }
            // log.info('ll+', strCommand);
            vmInstance.setOption(strCommand);
        },
        observers: [],
        observerFn: function (context, settings) {
            if (this.observers?.[context] && this.observers[context] instanceof Function) {
                this.observers[context]();
            }
            const {
                param,
                strip_bus,
                strip_bus_num,
                strip_layer,
                value,
                long_press_value,
                title,
                title_prefix
            } = settings;
            let strCommand = "";
            if (strip_bus === "StripLayer") {
                // strCommand = `Strip[5].GainLayer[1]=-20`
                strCommand = `Strip[${strip_bus_num}].GainLayer[${strip_layer}]`;
            } else {
                strCommand = `${strip_bus}[${strip_bus_num}].${param}`;
            }
            // log.info(context, settings, strCommand);
            this.observers[context] = addListener(strCommand, (value) => {
                // log.info("变化:", value);
                if (title === "current_value") {
                    plugin.setTitle(context, title_prefix.replace(/\\n/g, '\n') + parseFloat(value).toFixed(2));
                } else if (title === "title_prefix") {
                    plugin.setTitle(context, title_prefix.replace(/\\n/g, '\n'));
                } else {
                    plugin.setTitle(context, '');
                }
            })
        },
        init: function (context, settings) {
            const {
                param,
                strip_bus,
                strip_bus_num,
                strip_layer,
                value,
                long_press_value,
                title,
                title_prefix
            } = settings;
            let strCommand = "";
            if (strip_bus === "StripLayer") {
                // strCommand = `Strip[5].GainLayer[1]=-20`
                strCommand = `Strip[${strip_bus_num}].GainLayer[${strip_layer}]`;
            } else {
                strCommand = `${strip_bus}[${strip_bus_num}].${param}`;
            }
            let temp = vmInstance.getOption(strCommand);
            if (title === "current_value") {
                plugin.setTitle(context, title_prefix.replace(/\\n/g, '\n') + parseFloat(temp).toFixed(2));
            } else if (title === "title_prefix") {
                plugin.setTitle(context, title_prefix.replace(/\\n/g, '\n'));
            } else {
                plugin.setTitle(context, '');
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
    dialRotate({ context, payload }) { }
  }
}