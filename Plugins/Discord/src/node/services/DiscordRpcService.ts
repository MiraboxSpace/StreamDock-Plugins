import { Client } from "../discord-rpc/index.js";
import type { DiscordRpcClient, VoiceSettings } from "../types.js";
import { runtime, voiceState } from "../state.js";

export class DiscordRpcService {
    static createClient(): DiscordRpcClient {
        return new Client({ transport: "ipc" }) as unknown as DiscordRpcClient;
    }

    static get client(): DiscordRpcClient | null {
        return runtime.client ?? null;
    }

    static set client(client: DiscordRpcClient | null) {
        runtime.client = client;
    }

    static async getVoiceSettings(): Promise<VoiceSettings> {
        const settings = await this.client?.getVoiceSettings();
        if (settings) Object.assign(voiceState, settings);
        return settings ?? voiceState;
    }

    static async setVoiceSettings(settings: VoiceSettings): Promise<void> {
        await this.client?.setVoiceSettings(settings);
        Object.assign(voiceState, settings);
    }

    static async pushToTalk(active: boolean): Promise<void> {
        await this.client?.PUSH_TO_TALK(active);
    }
}
