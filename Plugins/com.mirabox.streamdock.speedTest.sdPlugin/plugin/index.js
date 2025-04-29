const { Plugins, Actions, log } = require('./utils/plugin');

const plugin = new Plugins('speedTest');
const fs = require('fs').promises;
const path = require('path');
const { getSpeedtestServers, getLibreSpeedTestServers } = require('./utils/get_speedtest_servers');
// const { createMetricsBase64 } = require('./utils/create_img_base64');
const { renderWithCustomFonts, test } = require('./utils/canvas');
const { runSpeedTest, runLibreSpeedTest, getAvailableServers } = require('./utils/speed-test');

/* 获取当前时间
 * @param {boolean} use12HourFormat - 是否使用12小时制（默认false）
 * @param {boolean} showSeconds - 是否显示秒（默认false）
 * @returns {string} 格式化后的时间字符串
 */
function getCurrentTime(use12HourFormat = false, showSeconds = false) {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    let timeString;

    if (use12HourFormat) {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12; // 将0点转换为12
        timeString = `${hours}:${minutes}`;

        if (showSeconds) {
            const seconds = now.getSeconds().toString().padStart(2, '0');
            timeString += `:${seconds}`;
        }

        timeString += ` ${ampm}`;
    } else {
        hours = hours.toString().padStart(2, '0');
        timeString = `${hours}:${minutes}`;

        if (showSeconds) {
            const seconds = now.getSeconds().toString().padStart(2, '0');
            timeString += `:${seconds}`;
        }
    }

    return timeString;
}

/**
 * 异步读取图片并转为Base64（自动处理路径问题）
 * @param {string} filePath 图片路径（支持相对/绝对路径）
 * @returns {Promise<string>} Base64字符串的Promise
 */
async function imageToBase64(filePath) {
    // 统一转为绝对路径
    const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(__dirname, filePath);

    // 检查文件是否存在
    try {
        await fs.access(absolutePath, fs.constants.R_OK);
    } catch (err) {
        throw new Error(`文件不存在或不可读: ${absolutePath}`);
    }

    const buffer = await fs.readFile(absolutePath);
    return buffer.toString('base64');
}

/**
 * 将 JSON 数据保存到指定路径
 * @param {Object} jsonData - 要保存的 JSON 数据
 * @param {string} filePath - 文件保存路径（可以是相对或绝对路径）
 * @returns {Promise<[Error|null, string|null]>} 返回一个 Promise，解析为 [error, resolvedPath] 数组
 */
function saveJsonToFile(jsonData, filePath) {
    return new Promise(async (resolve) => {
        try {
            // 确保目录存在
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            
            // 将数据转换为格式化的 JSON 字符串
            const jsonString = JSON.stringify(jsonData, null, 2);
            
            // 写入文件
            await fs.writeFile(filePath, jsonString);
            
            const resolvedPath = path.resolve(filePath);
            log.info(`数据已成功保存到 ${resolvedPath}`);
            resolve([null, resolvedPath]);
        } catch (error) {
            log.error('保存 JSON 文件时出错:', error);
            resolve([error, null]);
        }
    });
}

async function setInitImage(context, imgPath) {
    let base64Img = await imageToBase64(imgPath);
    plugin.setImage(context, 'data:image/jpeg;base64,' + base64Img);
}

// 操作一
plugin.action1 = new Actions({
    default: {
        instances: {},
        servers: [],
        intervals: {},
        longPressThreshold: 1000, // 长按阈值，单位毫秒
        longPressTimers: {}, // 用于存储每个实例的长按定时器
        async speedTest(data) {
            log.info(data.context);
            const settings = this.instances[data.context];
            log.info(settings);
            if(settings.testInfo.state === 'running') return;
            settings.testInfo.state = 'running';
            setInitImage(data.context, '../static/speed-speedtest.png');
            const dots = ['.', '..', '...'];
            let interval = setInterval(() => {
                if(settings.testInfo.state === 'running') {
                    plugin.setTitle(data.context, `Running \n -Speed- \n Test${dots[new Date().getSeconds() % 3]} `);
                }else {
                    clearInterval(interval);
                }
            },1000);
            log.info('------------serverId---------', settings.serverId)
            const [err, result] = await runSpeedTest({ serverId: settings.serverId });
            settings.testInfo.state = 'stop';
            if (err) {
                plugin.setTitle(data.context, `Speed Test \n fail`);
            } else {
                log.info(JSON.stringify(result, null, 4));
                settings.testInfo = result;
                this.instances[data.context] = settings;
                plugin.setSettings(data.context, settings);
                this.draw(data.context);
            }
        },
        async draw(context) {
            const settings = this.instances[context];
            if(settings.testInfo.latency == null) return;
            renderWithCustomFonts({
                backgroundColor: settings.backgroundColor,
                latencyColor: settings.latencyColor,
                downloadColor: settings.downloadColor,
                uploadColor: settings.uploadColor,
                timeColor: settings.timeColor,
                latency: settings.testInfo.latency,
                download: settings.testInfo.download,
                upload: settings.testInfo.upload,
                time: getCurrentTime(settings.timeAMPM)
            }).then(base64Img => {
                plugin.setTitle(context, ``);
                plugin.setImage(context, base64Img);
            }).catch((e) => { 
                log.error(e);
                plugin.setTitle(context, `Speed Test fail`);
            });
        },
        async handleShortPress(data) {
            this.speedTest(data);  
        },
        handleLongPress(data) {
            if(this.instances[data.context].testInfo.url !== '') {
                plugin.openUrl(this.instances[data.context].testInfo.url);
            }
        },
        autoTest(data) {
            const context = data.context;
            if(data.payload.settings.autorunTime !== '') {
                log.info('-----auto not null-----')
                if(this.intervals[context] == undefined) {
                    log.info('-----interval undefined-----')
                    this.intervals[context] = setInterval(() => {
                        this.speedTest(data)
                    }, 1000 * 60 * Number.parseInt(data.payload.settings.autorunTime))
                    return;
                }
                if(data.payload.settings.autorunTime !== this.instances[context].autorunTime) {
                    log.info('-----interval change-----')
                    clearInterval(this.intervals[context])
                    delete this.intervals[context]
                    this.intervals[context] = setInterval(() => {
                        this.speedTest(data)
                    }, 1000 * 60 * Number.parseInt(data.payload.settings.autorunTime))
                }
            }else {
                log.info('-----auto close-----')
                clearInterval(this.intervals[context])
                delete this.intervals[context]
            }
        }
    },
    async _willAppear(data) {
        log.info("操作创建: ", data.context);
        // 获取测速地址
        let [err, result] = await getSpeedtestServers();
        if(err) {

        }else {
            this.default.servers = result
        }
        this.default.servers.push({
            id: '5396',
            name: 'Suzhou',
            sponsor: 'China Telecom JiangSu 5G'
        })
        const settings = data.payload.settings;
        settings.servers = this.default.servers.map(i => ({ name: i.sponsor, id: i.id }));
        settings.servers.unshift({ name: '-CLOSEST SERVER-', id: '' });
        plugin.setSettings(data.context, settings);
        log.info(settings.servers);
        this.default.instances[data.context] = settings;
        this.default.autoTest(data);
    },
    _willDisappear(data) { },
    _propertyInspectorDidAppear(data) { },
    didReceiveSettings(data) {
        const context = data.context;
        this.default.autoTest(data);

        this.default.instances[context] = Object.assign(this.default.instances[context], data.payload.settings);
        log.info(this.default.instances[context]);
        // this.default.draw(context);
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

// 操作一
plugin.action2 = new Actions({
    default: {
        instances: {},
        servers: [],
        serversPath: '',
        intervals: {},
        longPressThreshold: 1000, // 长按阈值，单位毫秒
        longPressTimers: {}, // 用于存储每个实例的长按定时器
        async speedTest(data) {
            log.info(data.context);
            const settings = this.instances[data.context];
            log.info(settings);
            if(settings.testInfo.state === 'running') return;
            settings.testInfo.state = 'running';
            setInitImage(data.context, '../static/speed-librespeed.png');
            const dots = ['.', '..', '...'];
            let interval = setInterval(() => {
                if(settings.testInfo.state === 'running') {
                    plugin.setTitle(data.context, `Running \n -Speed- \n Test${dots[new Date().getSeconds() % 3]} `);
                }else {
                    clearInterval(interval);
                }
            },1000);
            log.info('------------serverId---------', settings.serverId, this.serversPath)
            const [err, result] = await runLibreSpeedTest({ serverId: settings.serverId, serversPath: this.serversPath });
            settings.testInfo.state = 'stop';
            if (err) {
                plugin.setTitle(data.context, `Speed Test \n fail`);
            } else {
                log.info(JSON.stringify(result, null, 4));
                settings.testInfo = result;
                this.instances[data.context] = settings;
                plugin.setSettings(data.context, settings);
                this.draw(data.context);
            }
        },
        async draw(context) {
            const settings = this.instances[context];
            if(settings.testInfo.latency == null) return;
            renderWithCustomFonts({
                backgroundColor: settings.backgroundColor,
                latencyColor: settings.latencyColor,
                downloadColor: settings.downloadColor,
                uploadColor: settings.uploadColor,
                timeColor: settings.timeColor,
                latency: settings.testInfo.latency,
                download: settings.testInfo.download,
                upload: settings.testInfo.upload,
                time: getCurrentTime(settings.timeAMPM)
            }).then(base64Img => {
                plugin.setTitle(context, ``);
                plugin.setImage(context, base64Img);
            }).catch((e) => { 
                log.error(e);
                plugin.setTitle(context, `Speed Test fail`);
            });
        },
        async handleShortPress(data) {
            this.speedTest(data);  
        },
        handleLongPress(data) {
            if(this.instances[data.context].testInfo.url !== '') {
                plugin.openUrl(this.instances[data.context].testInfo.url);
            }
        },
        autoTest(data) {
            const context = data.context;
            if(data.payload.settings.autorunTime !== '') {
                log.info('-----auto not null-----')
                if(this.intervals[context] == undefined) {
                    log.info('-----interval undefined-----')
                    this.intervals[context] = setInterval(() => {
                        this.speedTest(data)
                    }, 1000 * 60 * Number.parseInt(data.payload.settings.autorunTime))
                    return;
                }
                if(data.payload.settings.autorunTime !== this.instances[context].autorunTime) {
                    log.info('-----interval change-----')
                    clearInterval(this.intervals[context])
                    delete this.intervals[context]
                    this.intervals[context] = setInterval(() => {
                        this.speedTest(data)
                    }, 1000 * 60 * Number.parseInt(data.payload.settings.autorunTime))
                }
            }else {
                log.info('-----auto close-----')
                clearInterval(this.intervals[context])
                delete this.intervals[context]
            }
        }
    },
    async _willAppear(data) {
        log.info("操作创建: ", data.context);
        // 获取测速地址
        let [err, result] = await getLibreSpeedTestServers();
        if(err) {
            
        }else {
            this.default.servers = result
        }
        this.default.servers.unshift(
            {
                "id": 1,
                "name": "南京航空航天大学",
                "server": "//speed.nuaa.edu.cn/backend",
                "dlURL": "garbage.php",
                "ulURL": "empty.php",
                "pingURL": "empty.php",
                "getIpURL": "getIP.php"
            }
        )
        this.default.servers =  await getAvailableServers(this.default.servers);

        let [pathErr, pathResult] = await saveJsonToFile(this.default.servers, './servers.json');
        if(pathErr) {
            
        }else {
            this.default.serversPath = pathResult
        }

        const settings = data.payload.settings;
        settings.servers = this.default.servers.map(i => ({ name: i.name, id: i.id }));
        settings.servers.unshift({ name: '-CLOSEST SERVER-', id: '' });
        plugin.setSettings(data.context, settings);
        log.info(settings.servers);
        this.default.instances[data.context] = settings;
        this.default.autoTest(data);
    },
    _willDisappear(data) { },
    _propertyInspectorDidAppear(data) { },
    didReceiveSettings(data) {
        const context = data.context;
        this.default.autoTest(data);

        this.default.instances[context] = Object.assign(this.default.instances[context], data.payload.settings);
        log.info(this.default.instances[context]);
        // this.default.draw(context);
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