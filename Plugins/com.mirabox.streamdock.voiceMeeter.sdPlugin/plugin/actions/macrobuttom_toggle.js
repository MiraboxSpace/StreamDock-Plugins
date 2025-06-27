export default function (plugin, vmInstance, addListener, log, timers, hotkeyManager) {
  return {
    default: {
      longPressThreshold: 1000, // 长按阈值，单位毫秒
      longPressTimers: {}, // 用于存储每个实例的长按定时器
      async handleShortPress(data) {
        // log.info(`Instance ${data.context} - 短按事件:`, data);
        // this.stateChange(data, true);
      },
      handleLongPress(data) {
        // log.info(`Instance ${data.context} - 长按事件 (triggered on KeyDown):`, data);
        // this.stateChange(data, false);
      },
      async click_down(data) {
        const context = data.context;
        const settings = data.payload.settings;
        this.stateChange(data, true);

      },
      async click_up(data) {
        const context = data.context;
        const settings = data.payload.settings;
        this.stateChange(data, false);

      },
      observers: [],
      observerFn: async function (context, settings) {
        if (this.observers?.[context] && this.observers[context] instanceof Function) {
          this.observers[context]();
        }
        const {
          logical_id,
          title,
          title_prefix,
          title_value,
          enabled_text,
          disabled_text
        } = settings;
        let strCommand = "";
        strCommand = 'logical_id' + logical_id;
        // log.info(context, settings, strCommand);
        this.observers[context] = addListener(strCommand, (value) => {
          this.init(context, settings)
        })
        // plugin.setTitle(context, title.replace(/\\n/g, '\n'));
      },
      init: function (context, settings) {
        const {
          logical_id,
          title,
          title_prefix,
          title_value,
          enabled_text,
          disabled_text
        } = settings;
        let strCommand = "";
        strCommand = 'logical_id' + logical_id;
        let value = vmInstance.getMacroButtonStatus(parseInt(logical_id), 0);
        settings.title_value = value;
        plugin.setSettings(context, settings);
        let str = value;
        // log.info(parseInt(value))
        if(parseInt(value) === 0){
          plugin.setState(context, 0);
        }else {
          plugin.setState(context, 1);
        }
        // log.info("变化:", value);
        if (title === "current_value") {

          if (parseInt(value) === 0) {
            if (disabled_text !== "") {
              str = disabled_text
            }
          } else {
            if (enabled_text !== "") {
              str = enabled_text
            }
          }

          str = title_prefix + str;
        } else {
          str = title_prefix;
        }
        plugin.setTitle(context, str.replace(/\\n/g, '\n'));

      },
      stateChange: function (data, flag) {
        const context = data.context;
        const settings = data.payload.settings;
        const {
          logical_id,
          mode,
          title_value
        } = settings;
        // let strCommand = "";
        // strCommand = '';
        // log.info(strCommand);
        if(mode === 'toggle_mode') {
          if(flag) vmInstance.setMacroButtonStatus(parseInt(logical_id), title_value === 1? 0: 1);
        }else {
          if (flag) {
            vmInstance.setMacroButtonStatus(parseInt(logical_id), title_value === 1? 0: 1);
          } else {
            vmInstance.setMacroButtonStatus(parseInt(logical_id), title_value === 1? 0: 1);
          }
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
        Object.values(plugin.constructor.globalSettings.hotkeys).forEach(i => {
          if (i.id.includes(context)) {
            hotkeyManager.registerActionHandler(i.id, this.default[i.fn_name])
          }
        })
      } catch (error) {

      }

      try {
        this.default.init(context, settings);
        this.default.observerFn(context, settings);
      } catch (error) {
        log.error(error);
        setTimeout(() => {
          this._willAppear(data)
        }, 500)
      }

    },
    _willDisappear({ context, payload }) {
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
      // log.info(settings)
      try {
        this.default.init(context, settings);
        this.default.observerFn(context, settings);
      } catch (error) {
        setTimeout(() => {
          this._didReceiveSettings(data)
        }, 500)
      }
    },
    async sendToPlugin({ payload, context }) {
      const settings = this.data[context];
    },
    keyDown(data) {
      // log.info(`KeyDown on instance ${data.context}:`);
      this.default.click_down(data)
      return
      // 如果该实例已经有定时器在运行，先清除之前的（防止重复触发）
      const context = data.context;
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
      this.default.click_up(data)
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
    dialRotate({ context, payload }) { }
  }
}