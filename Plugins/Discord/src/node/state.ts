import type { Plugin } from "@mirabox/streamdock-sdk/node";
import type { DiscordRpcClient, LoginState, VoiceSettings } from "./types.js";

export const loginState: LoginState = {
    logining: false,
    hasLogin: false,
    loginState: 0,
    failCount: 0,
    refreshTokenCount: 0,
    appState: false,
};

export const voiceState: VoiceSettings = {
    mute: false,
    deaf: false,
    output: {},
    input: {},
    mode: {},
};

export const runtime: {
    plugin?: Plugin;
    client?: DiscordRpcClient | null;
} = {
    client: null,
};
