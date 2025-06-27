const { log } = require('./plugin');
// MidiSender.js
const easymidi = require('easymidi');

class MidiSender {
    constructor() {
        this.outputInstances = {};
        this.portNameMap = {};

        const availableOutputs = easymidi.getOutputs();
        log.info('[MidiSender] --- Available MIDI Output Ports ---');
        if (availableOutputs.length === 0) {
            log.info('No MIDI output devices found.');
        } else {
            availableOutputs.forEach((name, index) => {
                log.info(`Port ${index}: ${name}`);
            });
        }
        log.info('-------------------------------------------');
    }

    addPortMapping(alias, actualPortName) {
        this.portNameMap[alias] = actualPortName;
    }

    _getOrCreateOutputInstance(portName) {
        if (this.outputInstances[portName]) {
            return this.outputInstances[portName];
        }

        try {
            const output = new easymidi.Output(portName);
            this.outputInstances[portName] = output;
            log.info(`[MidiSender] MIDI 输出端口 "${portName}" 已打开 (easymidi)`);
            return output;
        } catch (e) {
            log.error(`[MidiSender] 错误: 无法打开 MIDI 端口 "${portName}": ${e.message}`);
            return null;
        }
    }

    sendMidiCommand(commandString) {
        const match = commandString.match(/^SendMidi\((.*)\);?$/);
        if (!match || match.length < 2) {
            log.error("[MidiSender] 错误: MIDI 命令格式不正确。应为 SendMidi(port, type, channel, data1, [data2]);");
            return false;
        }

        const argsString = match[1];
        const parts = argsString.split(',').map(s => s.trim());

        if (parts.length < 4) {
            log.error("[MidiSender] 错误: MIDI 命令参数数量不足。");
            return false;
        }

        const portAliasOrName = parts[0];
        const messageType = parts[1];
        const midiChannel = parseInt(parts[2]) - 1; // MIDI 通道 (1-16 转换为 0-15)
        const data1 = parseInt(parts[3]);
        const data2 = parts.length > 4 ? parseInt(parts[4]) : undefined;

        const actualPortName = this.portNameMap[portAliasOrName] || portAliasOrName;

        const targetOutput = this._getOrCreateOutputInstance(actualPortName);
        if (!targetOutput) {
            return false;
        }

        let easymidiMessageType;
        let messageData; // 每次在 case 中完整初始化
        let isValid = true;

        const validateParams = (params, minVal, maxVal, name) => {
            if (isNaN(params) || params < minVal || params > maxVal) {
                log.error(`[MidiSender] 错误: '${name}' 参数无效。应在 ${minVal}-${maxVal} 之间。`);
                isValid = false;
                return false;
            }
            return true;
        };

        // 先验证通道，因为所有消息类型都需要通道
        if (!validateParams(midiChannel, 0, 15, "MIDI Channel")) return false;


        switch (messageType) {
            case "ctrl-change":
            case "cc":
                easymidiMessageType = 'cc';
                if (!validateParams(data1, 0, 127, "Controller Number") || !validateParams(data2, 0, 127, "Control Value")) return false;
                messageData = { channel: midiChannel, controller: data1, value: data2 };
                break;

            case "note-on":
                easymidiMessageType = 'noteon';
                if (!validateParams(data1, 0, 127, "Note Number") || !validateParams(data2, 0, 127, "Velocity")) return false;
                messageData = { channel: midiChannel, note: data1, velocity: data2 };
                break;

            case "note-off":
                easymidiMessageType = 'noteoff';
                if (!validateParams(data1, 0, 127, "Note Number") || !validateParams(data2, 0, 127, "Velocity (Note Off)")) return false;
                messageData = { channel: midiChannel, note: data1, velocity: data2 };
                break;

            case "pitch-bend":
                easymidiMessageType = 'pitch';
                if (!validateParams(data1, 0, 127, "Pitch Bend LSB") || !validateParams(data2, 0, 127, "Pitch Bend MSB")) return false;
                messageData = { channel: midiChannel, value: (data2 << 7) | data1 };
                break;

            case "program-change":
            case "pc":
                easymidiMessageType = 'program';
                if (!validateParams(data1, 0, 127, "Program Number")) return false;
                messageData = { channel: midiChannel, number: data1 };
                break;

            default:
                log.error(`[MidiSender] 错误: 未知 MIDI 消息类型 "${messageType}"。`);
                return false;
        }

        if (!isValid || !messageData) { // 额外检查 messageData 是否已被初始化
            log.error("[MidiSender] 错误: 消息数据未正确构建。");
            return false;
        }

        try {
            targetOutput.send(easymidiMessageType, messageData);
            log.info(`[MidiSender] MIDI 命令已发送: "${commandString}" -> EASIMIDI类型: "${easymidiMessageType}" 数据: ${JSON.stringify(messageData)} 到端口 "${actualPortName}"`);
            return true;
        } catch (e) {
            log.error(`[MidiSender] 发送 MIDI 消息到端口 "${actualPortName}" 时发生错误: ${e.message}`);
            return false;
        }
    }

    closeAllPorts() {
        for (const portName in this.outputInstances) {
            const output = this.outputInstances[portName];
            if (output) {
                output.close();
                log.info(`[MidiSender] MIDI 输出端口 "${portName}" 已关闭。`);
            }
        }
        this.outputInstances = {};
    }
}

module.exports = MidiSender;