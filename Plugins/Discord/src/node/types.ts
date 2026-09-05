export type VoiceModeType = "VOICE_ACTIVITY" | "PUSH_TO_TALK";

export interface VoiceMode {
    type?: VoiceModeType;
    autoThreshold?: boolean;
    threshold?: number;
    shortcut?: unknown;
    delay?: number;
}

export interface VoiceDeviceSettings {
    availableDevices?: Array<{ id?: string; name?: string; [key: string]: unknown }>;
    available_devices?: Array<{ id?: string; name?: string; [key: string]: unknown }>;
    device?: string;
    volume?: number;
}

export interface VoiceSettings {
    mute?: boolean;
    deaf?: boolean;
    input?: VoiceDeviceSettings;
    output?: VoiceDeviceSettings;
    mode?: VoiceMode;
    [key: string]: unknown;
}

export interface DiscordGuild {
    id: string;
    name?: string;
    icon_url?: string;
    [key: string]: unknown;
}

export interface DiscordChannel {
    id: string;
    name?: string;
    type?: number;
    voice_states?: VoiceChannelUser[];
    voiceStates?: VoiceChannelUser[];
    [key: string]: unknown;
}

export interface DiscordUser {
    id: string;
    username?: string;
    global_name?: string;
    [key: string]: unknown;
}

export interface VoiceChannelUser {
    user?: DiscordUser;
    mute?: boolean;
    volume?: number;
    pan?: { left?: number; right?: number } | null;
    channel_id?: string;
    channel?: { id?: string };
    [key: string]: unknown;
}

export interface SoundboardSound {
    sound_id?: string;
    name?: string;
    emoji_name?: string;
    guild_id?: string;
    guild_name?: string;
    [key: string]: unknown;
}

export interface GlobalListenerData extends VoiceSettings {
    guilds: DiscordGuild[];
    notices: Record<string, number>;
    soundboard: SoundboardSound[] | false;
    currentNotice: string;
    noticeImage: string | Buffer;
    channelUsers: VoiceChannelUser[];
    currentVoiceChannel: string;
    speakingUsers: Set<string>;
    speakingOrder: string[];
    screenshare: boolean;
    video: boolean;
}

export interface LoginState {
    logining: boolean;
    hasLogin: boolean;
    timer?: NodeJS.Timeout;
    loginState: -1 | 0 | 1;
    failCount: number;
    refreshTokenCount: number;
    appState: boolean;
}

export type DiscordRpcClient = any;
