const { Plugins, Actions, log } = require('./utils/plugin');
const TimerManager = require('./utils/timer-manager');
const { TIME_STATE_ENUM } = require('./utils/time-state-enum')
const copyPaste = require('copy-paste');
const fs = require('fs').promises;
const path = require('path');
const plugin = new Plugins('stopwacth');
const { showSaveFileDialog } = require('./utils/save-file');

const timerManager = new TimerManager();

// clearFileOnReset: true,
// fileName: '',
// lapMode: false,
// multiline: true,
// resumeOnClick: true,
// sharedId: '122'
// 操作一
plugin.stopwatch = new Actions({
    default: {
        instances: {}, // 实例
        clipboard: {}, // 粘贴板
        sharedIDs: {}, // 共享定时器
        longPressThreshold: 1000, // 长按阈值，单位毫秒
        longPressTimers: {}, // 用于存储每个实例的长按定时器
        async handleShortPress(data) {
            log.info(`Instance ${data.context} - 短按事件:`, data);
            // 在这里处理该实例的短按逻辑
            // 是否共享计时器实例
            let id = data.context;
            let settings = data.payload.settings;
            if (this.sharedIDs[settings.sharedId] != undefined) {
                id = settings.sharedId;
            }
            log.info('--------test---------', await timerManager.getAllTimers())
            // 是否开始
            let timer = await timerManager.getTimer(id)
            // log.info(id, timer.state)
            switch (timer.state) {
                case TIME_STATE_ENUM.STOPPED:
                    timerManager.startTimer(id);
                    break;
                case TIME_STATE_ENUM.PAUSED:
                    if (settings.resumeOnClick) {
                        timerManager.startTimer(id);
                    } else {
                        timerManager.resetTimer(id);
                        timerManager.startTimer(id);
                    }
                    break;
                case TIME_STATE_ENUM.RUNNING:
                    if (settings.lapMode) {
                        this.clipboard[data.context] += timer.elapsedTime + '\n';
                    } else {
                        timerManager.pauseTimer(id);
                    }
                    break;

            }
        },
        handleLongPress(data) {
            log.info(`Instance ${data.context} - 长按事件 (triggered on KeyDown):`, data);
            // 在这里处理该实例的长按逻辑 (在 keyDown 达到阈值时触发)
            // 是否共享计时器实例
            let id = data.context;
            let settings = data.payload.settings;
            if (this.sharedIDs[settings.sharedId] != undefined) {
                id = settings.sharedId;
            }
            timerManager.resetTimer(id);

            if (settings.lapMode) {
                // 写入剪切板
                copyPaste.copy(this.clipboard[data.context], function () {
                    log.info('已复制到剪切板');
                });
            }

            delete this.clipboard[id];
            setTimeout(() => {
                if(data.payload.settings.clearFileOnReset) {
                    this.clearTxt(data.payload.settings.fileName);
                }
            }, 1000);
        },
        asyncInstances(data) {
            log.info(data)
            let context = data.context;
            let id = context;
            let settings = data.payload.settings;
            // 是否使用共享计时器
            if (settings.sharedId.trim() != '') {
                id = settings.sharedId;
                this.sharedIDs[id] = id;
            }
            // 添加或更新回调
            timerManager.addTimer(id, (time) => {
                Object.entries(this.instances).forEach(([key, value]) => {
                    log.info(key, value.payload.settings.sharedId);
                    log.info(id, context);
                    if(id == context && value.payload.settings.sharedId == '') {
                        // 不使用共享计时器
                        this.updateState(context, id);
                        this.updateElapsedTime(context, time, settings)
                    }
                    if (id != context && value.payload.settings.sharedId == id) {
                        // 共享定时器更新所有使用id的实例
                        this.updateState(value.context, id);
                        this.updateElapsedTime(value.context, time, value.payload.settings)
                    }
                })
            })
        },
        updateState(context, id) {
            timerManager.getTimer(id).then(res => {
                switch(res.state) {
                    case TIME_STATE_ENUM.RUNNING:
                        plugin.setState(context, 1);
                        break;
                    case TIME_STATE_ENUM.PAUSED:
                        plugin.setState(context, 0);
                        break;
                    case TIME_STATE_ENUM.STOPPED:
                        plugin.setState(context, 0);
                        break;
                    default: 
                }
            })
        },
        updateElapsedTime(context, time, settings) {
            let tmp = time;
            if (settings.multiline) {
                tmp = time.split(':').join('\n');
            }
            if (settings.fileName) {
                this.writeTxt(settings.fileName, time);
            }
            // log.info(context, settings.multiline, tmp);
            plugin.setTitle(context, tmp);
        },
        /**
         * 写入或追加内容到文本文件
         * @param {string} filePath - 文件路径
         * @param {string} content - 要写入的内容
         * @param {object} [options] - 可选参数
         * @param {boolean} [options.append=false] - 是否追加内容（默认覆盖）
         * @param {string} [options.encoding='utf8'] - 文件编码
         * @returns {Promise<void>}
         */
        async writeTxt(filePath, content, options = {}) {
            try {
                const { append = false, encoding = 'utf8' } = options;
                const dir = path.dirname(filePath);

                // 确保目录存在
                await fs.mkdir(dir, { recursive: true });

                if (append) {
                    await fs.appendFile(filePath, content, { encoding });
                } else {
                    await fs.writeFile(filePath, content, { encoding });
                }

                // log.info(`文件已成功 ${append ? '追加' : '写入'}: ${filePath}`);
            } catch (error) {
                console.error(`写入文件 ${filePath} 时出错:`, error);
                throw error; // 可以选择重新抛出错误或处理它
            }
        },
        /**
         * 清空文本文件内容
         * @param {string} filePath - 文件路径
         * @returns {Promise<void>}
         */
        async clearTxt(filePath) {
            try {
                // 检查文件是否存在
                try {
                    await fs.access(filePath);
                } catch {
                    log.info(`文件不存在，无需清空: ${filePath}`);
                    return;
                }

                // 清空文件内容
                await fs.writeFile(filePath, '', 'utf8');
                // log.info(`文件内容已清空: ${filePath}`);
            } catch (error) {
                console.error(`清空文件 ${filePath} 时出错:`, error);
                throw error;
            }
        }
    },
    _willAppear(data) {
        log.info("操作创建: ", data.context);
        this.default.instances[data.context] = data;
        this.default.clipboard[data.context] = '';
        this.default.asyncInstances(data);
    },
    _willDisappear(data) {
        delete this.default.instances[data.context];
        timerManager.removeTimer(data.context);
    },
    _propertyInspectorDidAppear(data) { },
    didReceiveSettings(data) {
        if(data.payload.settings.lapMode != this.default.instances[data.context].payload.settings.lapMode) {
            this.default.clipboard[data.context] = '';
        }
        this.default.instances[data.context] = data;
        this.default.asyncInstances(data);
        // if(data.payload.settings.fileName)
    },
    async sendToPlugin({context, payload}) {
        if(payload) {
            log.info(payload);
            if(payload.property_inspector == 'loadsavepicker') {
                log.info('正在打开保存文件对话框...');
                const saveFilePath = await showSaveFileDialog('Text files (*.txt)|*.txt', 'new_file.txt');
                if (saveFilePath) {
                    log.info('用户选择的保存路径和文件名:', saveFilePath);
                    // 在这里你可以使用 saveFilePath 来创建文件或进行其他操作
                    this.default.instances[context].payload.settings.fileName = saveFilePath;
                    plugin.setSettings(context, this.default.instances[context].payload.settings);
                } else {
                    log.info('用户取消了保存操作。');
                }
            }
        }
    },
    keyDown(data) {
        log.info(`KeyDown on instance ${data.context}:`);
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
        log.info(`KeyUp on instance ${data.context}:`);
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
    dialRotate(data) {//旋钮旋转
        log.info(data);
    },
    dialDown(data) {//旋钮按下
        log.info(data);
    }
});