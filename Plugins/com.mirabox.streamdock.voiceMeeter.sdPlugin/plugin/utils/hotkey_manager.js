const { log } = require('./plugin');
// hotkeyManager.js (CommonJS 模块)

const { GlobalKeyboardListener } = require("node-global-key-listener");

// 初始化全局键盘监听器实例
const gkl = new GlobalKeyboardListener();

// --- 模块内部状态 ---
// 存储已注册到 gkl 的监听器函数，key是快捷键的唯一ID
const registeredGklListeners = new Map();
// 存储当前生效的快捷键配置列表，key是快捷键的唯一ID
let currentHotkeysConfigMap = new Map();
// 存储用户注册的动作处理函数，key是actionId
const actionHandlers = new Map();
let isGklStarted = false; // 标记 gkl 是否已启动

// --- 录制模式相关变量 (纯录制逻辑) ---
let isRecordingOnlyShortcut = false; // 新增标记，表示是否处于纯录制模式
let recordingResolveOnlyShortcut = null; // 用于解决纯录制 Promise
let recordingRejectOnlyShortcut = null; // 新增：用于拒绝纯录制 Promise (超时或取消)
let recordingModifiersOnlyShortcut = new Set();
let recordingMainKeyOnlyShortcut = null;
let recordingTimeout = null; // 新增：用于超时机制的定时器句柄

const RECORDING_TIMEOUT_MS = 10000; // 录制超时时间（10秒），可根据需要调整

// --- 内部辅助函数：解析快捷键字符串 ---
function parseShortcut(shortcutString) {
    const parts = shortcutString.toUpperCase().split('+');
    const mainKey = parts[parts.length - 1];
    const modifiers = new Set(); // 使用 Set 存储修饰键，避免重复

    for (let i = 0; i < parts.length - 1; i++) {
        const mod = parts[i];
        switch (mod) {
            case 'CTRL':
            case 'ALT':
            case 'SHIFT':
            case 'META': // Windows Key / Command Key
                modifiers.add(mod);
                break;
            default:
                log.warn(`[HotkeyManager] 警告: 快捷键字符串 '${shortcutString}' 包含未知修饰键 '${mod}'。`);
                break;
        }
    }
    return { mainKey, modifiers };
}

// --- 内部辅助函数：创建 gkl 监听器函数 ---
function createGklListener(hotkey) {
    const { mainKey, modifiers } = parseShortcut(hotkey.shortcut);

    const listenerFunction = function (e, down) {
        // 只在按键“按下”时触发
        if (e.state === "DOWN" && e.name === mainKey) {
            let allModifiersPressed = true;
            for (const mod of modifiers) {
                switch (mod) {
                    case 'CTRL':
                        if (!(down["LEFT CTRL"] || down["RIGHT CTRL"])) allModifiersPressed = false;
                        break;
                    case 'ALT':
                        if (!(down["LEFT ALT"] || down["RIGHT ALT"])) allModifiersPressed = false;
                        break;
                    case 'SHIFT':
                        if (!(down["LEFT SHIFT"] || down["RIGHT SHIFT"])) allModifiersPressed = false;
                        break;
                    case 'META':
                        if (!(down["LEFT META"] || down["RIGHT META"])) allModifiersPressed = false;
                        break;
                    default:
                        allModifiersPressed = false;
                        break;
                }
                if (!allModifiersPressed) break;
            }

            if (allModifiersPressed) {
                // 执行用户提供的动作回调
                if (actionHandlers.has(hotkey.action)) {
                    log.info(`[HotkeyManager] 快捷键 "${hotkey.name}" (${hotkey.shortcut}) 已触发！`);
                    try {
                        actionHandlers.get(hotkey.action)(hotkey); // 传递完整的快捷键对象
                    } catch (error) {
                        log.error(error)
                    }
                } else {
                    log.warn(`[HotkeyManager] 动作 '${hotkey.action}' 未注册处理函数。`);
                }
                return true; // 返回 true 尝试阻止事件进一步传播（取决于操作系统和底层库）
            }
        }
    };
    return listenerFunction;
}


// =========================================================
// 新增函数: 重置录制超时
// =========================================================
function resetRecordingTimeout() {
    if (recordingTimeout) {
        clearTimeout(recordingTimeout);
    }
    recordingTimeout = setTimeout(() => {
        if (isRecordingOnlyShortcut) { // 确保仍在录制模式
            log.warn("[HotkeyManager] 快捷键录制超时，自动退出录制模式。");
            cancelRecordingShortcut(new Error("录制超时。")); // 调用取消函数，并传入超时错误
        }
    }, RECORDING_TIMEOUT_MS);
}

// =========================================================
// 新增函数: 取消录制快捷键
// =========================================================
/**
 * 外部调用此函数以取消当前正在进行的快捷键录制。
 * @param {Error} [error] - 取消的原因，通常是 Error 对象。
 */
function cancelRecordingShortcut(error = new Error("录制被手动取消。")) {
    if (!isRecordingOnlyShortcut) {
        log.info("[HotkeyManager] 当前没有进行中的快捷键录制。");
        return;
    }

    log.info("[HotkeyManager] 快捷键录制已取消。");
    isRecordingOnlyShortcut = false;

    // 清除超时定时器
    if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        recordingTimeout = null;
    }

    // 重置录制状态变量
    recordingModifiersOnlyShortcut.clear();
    recordingMainKeyOnlyShortcut = null;

    // 如果 Promise 存在，则拒绝它
    if (recordingRejectOnlyShortcut) {
        recordingRejectOnlyShortcut(error);
        recordingResolveOnlyShortcut = null; // 清空引用
        recordingRejectOnlyShortcut = null; // 清空引用
    }
}


// --- 内部监听器：处理纯录制模式下的按键事件 ---
// 这个监听器应该在常规快捷键监听器之前被触发，以确保录制优先
gkl.addListener(function (e, down) {
    if (isRecordingOnlyShortcut) {
        const keyName = e.name;
        const mouseKeywords = ['button1', 'button2', 'button3', 'button4', 'button5', 'mouse', 'wheel'];
        const isMouseShortcut = mouseKeywords.some(keyword => keyName.toLowerCase().includes(keyword));

        // 如果是鼠标事件：
        if (isMouseShortcut) {
            log.warn(`[HotkeyManager] 录制中检测到鼠标事件 "${keyName}"，已停止录制。`);
            cancelRecordingShortcut(new Error("录制因鼠标事件而中断。")); // 立即停止录制
            return false; // 不拦截鼠标事件，让它传播
        }

        // 仅处理按键按下事件 (键盘事件)
        if (e.state === "DOWN") {
            resetRecordingTimeout(); // 每次有效按键，重置超时

            // 识别修饰键
            if (keyName.includes("CTRL")) {
                recordingModifiersOnlyShortcut.add("CTRL");
            } else if (keyName.includes("ALT")) {
                recordingModifiersOnlyShortcut.add("ALT");
            } else if (keyName.includes("SHIFT")) {
                recordingModifiersOnlyShortcut.add("SHIFT");
            } else if (keyName.includes("META")) {
                recordingModifiersOnlyShortcut.add("META");
            } else {
                // 按下的是主键，但我们需要检查是否有修饰键被按下
                if (recordingModifiersOnlyShortcut.size > 0) {
                    recordingMainKeyOnlyShortcut = keyName;
                    isRecordingOnlyShortcut = false; // 退出录制模式

                    // 组合快捷键字符串
                    const shortcutParts = [];
                    if (recordingModifiersOnlyShortcut.has("CTRL")) shortcutParts.push("CTRL");
                    if (recordingModifiersOnlyShortcut.has("ALT")) shortcutParts.push("ALT");
                    if (recordingModifiersOnlyShortcut.has("SHIFT")) shortcutParts.push("SHIFT");
                    if (recordingModifiersOnlyShortcut.has("META")) shortcutParts.push("META");
                    shortcutParts.push(recordingMainKeyOnlyShortcut);
                    const recordedShortcut = shortcutParts.join('+');

                    // 清除最终的超时定时器
                    if (recordingTimeout) {
                        clearTimeout(recordingTimeout);
                        recordingTimeout = null;
                    }

                    // 解决 Promise，返回录制结果
                    if (recordingResolveOnlyShortcut) {
                        recordingResolveOnlyShortcut({
                            shortcut: recordedShortcut,
                            modifiers: Array.from(recordingModifiersOnlyShortcut),
                            mainKey: recordingMainKeyOnlyShortcut
                        });
                    }

                    // 重置录制状态（确保在 resolve/reject 后清空引用）
                    recordingModifiersOnlyShortcut.clear();
                    recordingMainKeyOnlyShortcut = null;
                    recordingResolveOnlyShortcut = null;
                    recordingRejectOnlyShortcut = null; // 清空引用

                    log.info(`\n[HotkeyManager] 录制完成！快捷键: ${recordedShortcut}`);
                } else {
                    log.warn(`[HotkeyManager] 录制中：请先按住一个修饰键，再按下主键。已忽略 "${keyName}"。`);
                }
            }
        }
        return true; // 在纯录制模式下，拦截键盘事件
    }
    return false; // 不在录制模式，不拦截
}, true); // 传递 true 作为第三个参数，使这个监听器优先执行


// --- 导出方法 ---

/**
 * 初始化并启动全局键盘监听器。
 * 必须在调用其他快捷键管理方法前调用一次。
 * 同时注册传入的初始快捷键配置。
 * @param {Array<object>} initialHotkeys - 初始快捷键配置数组。每个对象应包含 id, name, shortcut, action。
 */
function start(initialHotkeys = []) {
    if (isGklStarted) {
        log.warn('[HotkeyManager] 全局键盘监听已在运行中。');
        return;
    }

    gkl.start();
    isGklStarted = true;
    log.info('[HotkeyManager] 全局键盘监听已启动。');

    // 注册初始快捷键
    if (Array.isArray(initialHotkeys)) {
        initialHotkeys.forEach(hk => addHotkey(hk));
    } else {
        log.warn('[HotkeyManager] 初始快捷键配置必须是数组。');
    }

    // 绑定进程退出时的清理
    process.on('SIGINT', () => {
        log.info('\n[HotkeyManager] 收到 Ctrl+C，正在停止...');
        stop();
        process.exit();
    });
    process.on('SIGTERM', () => {
        log.info('\n[HotkeyManager] 收到 SIGTERM，正在停止...');
        stop();
        process.exit();
    });
}

/**
 * 停止全局键盘监听器并清理所有已注册的快捷键。
 */
function stop() {
    if (isGklStarted) {
        gkl.stop();
        isGklStarted = false;
        // 清理所有已注册的监听器
        registeredGklListeners.clear();
        currentHotkeysConfigMap.clear();
        actionHandlers.clear(); // 清理动作处理函数
        // 在停止时也尝试清除录制相关的状态和超时
        cancelRecordingShortcut(new Error("HotkeyManager 已停止。")); // 使用错误对象
        log.info('[HotkeyManager] 全局键盘监听已停止。');
    } else {
        log.info('[HotkeyManager] 全局键盘监听未在运行。');
    }
}

/**
 * 添加一个快捷键。如果ID已存在，则更新该快捷键。
 * @param {object} hotkey - 快捷键对象，必须包含 id (string), name (string), shortcut (string), action (string)。
 * @returns {boolean} 添加或更新是否成功。
 */
function addHotkey(hotkey) {
    if (!hotkey || !hotkey.id || !hotkey.shortcut || !hotkey.action) {
        log.error("[HotkeyManager] 无法添加快捷键：无效的快捷键对象。", hotkey);
        return false;
    }

    // --- 在这里添加过滤鼠标事件的逻辑 ---
    const mouseKeywords = ['button1', 'button2', 'button3', 'button4', 'button5', 'mouse', 'wheel']; // 常见的鼠标相关关键字
    const shortcutLower = hotkey.shortcut.toLowerCase(); // 转换为小写进行不区分大小写匹配

    const isMouseShortcut = mouseKeywords.some(keyword => shortcutLower.includes(keyword));

    if (isMouseShortcut) {
        log.warn(`[HotkeyManager] 快捷键 '${hotkey.name}' (${hotkey.shortcut}) 包含鼠标事件，已跳过添加。`);
        return false; // 阻止添加鼠标相关的快捷键
    }
    // --- 过滤逻辑结束 ---


    // 如果该ID的快捷键已存在，先移除旧的监听器
    if (registeredGklListeners.has(hotkey.id)) {
        const oldListener = registeredGklListeners.get(hotkey.id);
        gkl.removeListener(oldListener);
        log.info(`[HotkeyManager] 快捷键ID '${hotkey.id}' 已存在，正在更新。`);
    }

    // 创建新的监听器并注册
    const listenerFunction = createGklListener(hotkey);
    gkl.addListener(listenerFunction);
    registeredGklListeners.set(hotkey.id, listenerFunction);
    currentHotkeysConfigMap.set(hotkey.id, hotkey); // 更新内部配置Map

    log.info(`[HotkeyManager] 快捷键 '${hotkey.name}' (${hotkey.shortcut}) 已添加/更新。`);
    return true;
}

/**
 * 根据ID删除一个快捷键。
 * @param {string} hotkeyId - 要删除的快捷键的ID。
 * @returns {boolean} 删除是否成功。
 */
function deleteHotkey(hotkeyId) {
    if (registeredGklListeners.has(hotkeyId)) {
        const listener = registeredGklListeners.get(hotkeyId);
        gkl.removeListener(listener);
        registeredGklListeners.delete(hotkeyId);
        currentHotkeysConfigMap.delete(hotkeyId);
        log.info(`[HotkeyManager] 快捷键ID '${hotkeyId}' 已删除。`);
        return true;
    } else {
        log.warn(`[HotkeyManager] 未找到ID为 '${hotkeyId}' 的快捷键，无法删除。`);
        return false;
    }
}

/**
 * 获取所有当前已注册的快捷键列表。
 * @returns {Array<object>} 快捷键对象的数组副本。
 */
function listHotkeys() {
    return Array.from(currentHotkeysConfigMap.values());
}

/**
 * 注册一个动作处理函数。
 * 当某个快捷键触发时，如果其 actionId 匹配，则调用此函数。
 * @param {string} actionId - 动作的唯一ID。
 * @param {function(object): void} handler - 处理函数，接收快捷键对象作为参数。
 */
function registerActionHandler(actionId, handler) {
    if (typeof handler === 'function') {
        actionHandlers.set(actionId, handler);
        log.info(`[HotkeyManager] 动作处理函数 '${actionId}' 已注册。`);
    } else {
        log.warn(`[HotkeyManager] 尝试注册无效的动作处理函数为 '${actionId}'。`);
    }
}

/**
 * 启动纯快捷键录制模式。
 * 用户按下第一个非修饰键时，录制结束。
 * 此方法不会将录制到的快捷键添加到内部管理列表，也不会触发任何动作。
 * @returns {Promise<object>} Promise 解析为录制到的快捷键对象：
 * {
 * shortcut: string, // 例如 "CTRL+ALT+C"
 * modifiers: string[], // 例如 ["CTRL", "ALT"]
 * mainKey: string // 例如 "C"
 * }
 */
function recordShortcut() {
    return new Promise((resolve, reject) => {
        if (!isGklStarted) {
            log.error('[HotkeyManager] 错误: 全局键盘监听器未启动，无法录制快捷键。请先调用 hotkeyManager.start()。');
            return reject(new Error("全局键盘监听器未启动。"));
        }
        if (isRecordingOnlyShortcut) {
            log.warn('[HotkeyManager] 已经在录制模式中，拒绝新的录制请求。');
            return reject(new Error("已经在录制快捷键，无法同时开始新的录制。"));
        }

        isRecordingOnlyShortcut = true;
        recordingResolveOnlyShortcut = resolve;
        recordingRejectOnlyShortcut = reject;
        recordingModifiersOnlyShortcut.clear();
        recordingMainKeyOnlyShortcut = null;

        log.info("\n[HotkeyManager] ----------------------------------------------");
        log.info("[HotkeyManager] 快捷键录制模式已启动。请按住修饰键（Ctrl/Alt/Shift）后按下主键。");
        log.info("[HotkeyManager] 例如: 按下 Ctrl+Shift+Alt 不放，然后按下 C。");
        log.info(`[HotkeyManager] 鼠标事件将中断录制。超时时间为 ${RECORDING_TIMEOUT_MS / 1000} 秒。`);
        log.info("[HotkeyManager] ----------------------------------------------");

        // 设置初始超时
        resetRecordingTimeout();
    });
}


// 导出模块方法
module.exports = {
    start,
    stop,
    addHotkey,
    deleteHotkey,
    listHotkeys,
    registerActionHandler,
    recordShortcut,
    cancelRecordingShortcut,
    // 如果需要，可以导出 parseShortcut 方便外部预处理
    // parseShortcut
};