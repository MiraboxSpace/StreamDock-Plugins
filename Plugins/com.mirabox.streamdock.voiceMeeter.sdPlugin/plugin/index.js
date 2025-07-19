const { Plugins, Actions, log, EventEmitter } = require('./utils/plugin');
const { execSync } = require('child_process');
import { Voicemeeter, StripProperties } from "voicemeeter-connector";
const hotkeyManager = require('./utils/hotkey_manager');
const { addListener, removeListener, notifyListeners } = require("./utils/listener_controller");
const MidiSender = require('./utils/midiSender.js'); // 导入 MidiSender 类

// 实例化 MidiSender
const sender = new MidiSender();
const plugin = new Plugins('voice_meeter');
let vmInstance = null;
setInterval(async () => {
    if (vmInstance === null) {
        vmInstance = await initializeVoicemeeter()
    }
}, 1000)


async function initializeVoicemeeter() {
    try {
        const vm = await Voicemeeter.init();
        await vm.connect();
        log.info("Voicemeeter initialized and connected successfully");
        // 全局监听变化
        vm.attachChangeEvent(() => notifyListeners(vm));
        return vm; // 返回连接实例以便后续使用
    } catch (error) {
        log.error("Failed to initialize Voicemeeter:", error);
        // throw error; // 重新抛出错误以便外部处理
        return null;
    }
}
let hotkeyInitFlag = false;
plugin.didReceiveGlobalSettings = ({ payload: { settings } }) => {

    log.info('didReceiveGlobalSettings', settings);
    try {
        // log.info(Object.values(settings.hotkeys))
        if (!hotkeyInitFlag) {
            // --- 3. 启动快捷键管理器，并传入初始配置 ---
            const initialHotkeys = [
                {
                    id: "open_calc",
                    context: "xx",
                    fn_name: "",
                    name: "打开计算器",
                    shortcut: "CTRL+ALT+C",
                    action: "my_custom_open_calc"
                }
            ];
            hotkeyManager.start(settings?.hotkeys ? Object.values(settings.hotkeys) : initialHotkeys);
            log.info('--- 应用程序启动 ---');
            log.info('全局键盘监听已启动。请尝试您的快捷键。');
            log.info('当前注册的快捷键:');
            hotkeyManager.listHotkeys().forEach(hk => {
                log.info(`- ${hk.name} (${hk.shortcut}) -> 动作: ${hk.action}`);
            });
            hotkeyInitFlag = true;
        }
    } catch (error) {
        hotkeyManager.start()
    }

};

const createSvg = (text) => `<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
    <text x="72" y="120" font-family="Arial" font-weight="bold" font-size="36" fill="white" text-anchor="middle"
        stroke="black" stroke-width="2" paint-order="stroke">
        ${text}
    </text>
</svg>`;

const timers = {};

// 创建一个虚拟代理
const vmProxy = new Proxy({}, {
    get(target, prop) {
        if (!vmInstance) {
            throw new Error("vmInstance 未初始化!");
        }
        return vmInstance[prop];
    }
});
import modify_setting_factory from './actions/modify_setting.js';
const action_modify_setting = modify_setting_factory(plugin, vmProxy, addListener, log, timers, hotkeyManager, sender);
plugin.modify_setting = new Actions(action_modify_setting);


import mute_unmute_factory from './actions/mute_unmute.js';
const action_mute_unmute = mute_unmute_factory(plugin, vmProxy, addListener, log, timers, hotkeyManager, sender);
plugin.mute_unmute = new Actions(action_mute_unmute);

import advanced_press_long_press_factory from './actions/advanced_press_long_press.js';
const action_advanced_press_long_press = advanced_press_long_press_factory(plugin, vmProxy, addListener, log, timers, hotkeyManager, sender);
plugin.advanced_press_long_press = new Actions(action_advanced_press_long_press);

import advanced_toggle_factory from './actions/advanced_toggle.js';
const action_advanced_toggle = advanced_toggle_factory(plugin, vmProxy, addListener, log, timers, hotkeyManager, sender);
plugin.advanced_toggle = new Actions(action_advanced_toggle);

import advanced_ptt_factory from './actions/advanced_ptt.js';
const action_advanced_ptt = advanced_ptt_factory(plugin, vmProxy, addListener, log, timers, hotkeyManager, sender);
plugin.advanced_ptt = new Actions(action_advanced_ptt);

import macrobuttom_toggle_factory from './actions/macrobuttom_toggle.js';
const action_macrobuttom_toggle = macrobuttom_toggle_factory(plugin, vmProxy, addListener, log, timers, hotkeyManager, sender);
plugin.macrobuttom_toggle = new Actions(action_macrobuttom_toggle);

import gain_adjust_factory from './actions/gain_adjust.js';
const action_gain_adjust = gain_adjust_factory(plugin, vmProxy, addListener, log, timers, hotkeyManager, sender);
plugin.gain_adjust = new Actions(action_gain_adjust);

import setting_adjust_factory from './actions/setting_adjust.js';
const action_setting_adjust = setting_adjust_factory(plugin, vmProxy, addListener, log, timers, hotkeyManager, sender);
plugin.setting_adjust = new Actions(action_setting_adjust);