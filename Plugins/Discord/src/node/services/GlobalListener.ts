import { log } from "@mirabox/streamdock-sdk/node";
import { runtime, voiceState } from "../state.js";
import type { DiscordChannel, DiscordGuild, GlobalListenerData, SoundboardSound, VoiceChannelUser } from "../types.js";
import { cacheDataUrl, cacheDataUrlPath, getCachedDataUrl, getCachedDataUrlPath, getImageAndCache } from "../utils/images.js";

type Listener = () => void | Promise<void>;
type Unsubscriber = { unsubscribe: () => Promise<unknown>; key: string };

function listenerKey(event: string, data: unknown): string {
    return `${event}:${JSON.stringify(data ?? {})}`;
}

function createInitialData(): GlobalListenerData {
    return {
        ...voiceState,
        guilds: [],
        notices: {},
        soundboard: false,
        currentNotice: "",
        noticeImage: "",
        channelUsers: [],
        currentVoiceChannel: "",
        speakingUsers: new Set<string>(),
        speakingOrder: [],
        screenshare: false,
        video: false,
    };
}

export class GlobalListener {
    static data = createInitialData();

    private static started = false;
    private static unsubscribers: Record<string, Unsubscriber> = {};
    private static voiceChannelUnsubscribers: Record<string, Unsubscriber> = {};
    private static boundVoiceChannel = "";
    private static events: Record<string, Record<string, Listener>> = {};
    private static channelsCache: Record<string, DiscordChannel[]> = {};
    private static userImageCache: Record<string, string> = {};
    private static userImagePathCache: Record<string, string> = {};
    private static userImageRequests: Partial<Record<string, Promise<{ dataUrl: string; path: string }>>> = {};

    static async start(): Promise<void> {
        const client = runtime.client;
        if (!client || this.started) return;
        this.started = true;

        await this.subscribeGlobal("VOICE_SETTINGS_UPDATE", this.VOICE_SETTINGS_UPDATE);
        await this.subscribeGlobal("VOICE_CHANNEL_SELECT", this.VOICE_CHANNEL_SELECT);
        await this.subscribeGlobal("NOTIFICATION_CREATE", this.NOTIFICATION_CREATE);
        await this.subscribeGlobal("SCREENSHARE_STATE_UPDATE", this.SCREENSHARE_STATE_UPDATE);
        await this.subscribeGlobal("VIDEO_STATE_UPDATE", this.VIDEO_STATE_UPDATE);
        await this.syncInitialState();
    }

    static async stop(): Promise<void> {
        await this.unbindVoiceChannelListeners();
        for (const [event, item] of Object.entries(this.unsubscribers)) {
            try {
                await item.unsubscribe();
            } catch (error) {
                log.error(`unsubscribe ${event} failed`, error);
            }
        }
        this.unsubscribers = {};
        this.started = false;
    }

    private static async subscribeGlobal(event: string, handler: (data: unknown) => void | Promise<void>): Promise<void> {
        const client = runtime.client;
        if (!client || this.unsubscribers[event]) return;
        client.on(event, handler);
        try {
            this.unsubscribers[event] = { ...(await client.subscribe(event, {})), key: listenerKey(event, {}) };
        } catch (error) {
            log.error(`subscribe ${event} failed`, error);
        }
    }

    static async addListener(event: string, fn: Listener, context: string, _data: unknown = {}): Promise<void> {
        this.events[event] ??= {};
        this.events[event][context] = fn;
        await this.dispatchTo(event, context);
    }

    static removeListener(event: string, context: string): void {
        delete this.events[event]?.[context];
    }

    static removeAll(): void {
        this.data = createInitialData();
        this.unsubscribers = {};
        this.voiceChannelUnsubscribers = {};
        this.boundVoiceChannel = "";
        this.started = false;
        this.events = {};
        this.channelsCache = {};
        this.userImageCache = {};
        this.userImagePathCache = {};
        this.userImageRequests = {};
    }

    private static async syncInitialState(): Promise<void> {
        const client = runtime.client;
        if (!client) return;
        try {
            Object.assign(this.data, await client.getVoiceSettings());
            this.emit("VOICE_SETTINGS_UPDATE");
        } catch (error) {
            log.error("getVoiceSettings failed", error);
        }

        try {
            await this.updateCurrentVoiceChannel(await client.GET_SELECTED_VOICE_CHANNEL());
        } catch (error) {
            log.error("GET_SELECTED_VOICE_CHANNEL failed", error);
            await this.updateCurrentVoiceChannel(null);
        }
    }

    static async syncSelectedVoiceChannel(): Promise<void> {
        try {
            await this.updateCurrentVoiceChannel(await runtime.client?.GET_SELECTED_VOICE_CHANNEL());
        } catch (error) {
            log.error("GET_SELECTED_VOICE_CHANNEL failed", error);
            await this.updateCurrentVoiceChannel(null);
        }
    }

    static async getGuilds(): Promise<DiscordGuild[]> {
        const result = (await runtime.client?.getGuilds()) as { guilds?: DiscordGuild[] } | undefined;
        this.data.guilds = result?.guilds ?? [];
        return this.data.guilds;
    }

    static async getChannels(guildId: string): Promise<DiscordChannel[]> {
        if (!guildId) return [];
        this.channelsCache[guildId] = ((await runtime.client?.getChannels(guildId)) as DiscordChannel[] | undefined) ?? [];
        return this.channelsCache[guildId] ?? [];
    }

    static async getSoundboardSounds(useCache = true): Promise<SoundboardSound[]> {
        if (!(useCache && this.data.soundboard)) {
            this.data.soundboard = ((await runtime.client?.GET_SOUNDBOARD_SOUNDS()) as SoundboardSound[] | undefined) ?? [];
        }
        return this.data.soundboard || [];
    }

    static async getGuildImage(guildId: string): Promise<string> {
        if (!guildId || guildId === "__disconnect__") return "";
        try {
            const guild = (await runtime.client?.getGuild(guildId)) as DiscordGuild | undefined;
            const iconUrl = guild?.icon_url;
            if (!iconUrl) return "";
            return ((await getImageAndCache(iconUrl)) as string) || "";
        } catch (error) {
            log.error("getGuildImage failed", error);
            return "";
        }
    }

    static async getUserImage(userId: string): Promise<string> {
        if (!userId) return "";
        try {
            if (this.userImageCache[userId]) return this.userImageCache[userId];
            const cached = await getCachedDataUrl(`user:${userId}`);
            if (cached) {
                this.userImageCache[userId] = cached;
                return cached;
            }
            const result = await this.loadUserImage(userId);
            return result.dataUrl;
        } catch (error) {
            log.error("getUserImage failed", error);
            return "";
        }
    }

    static async getUserImagePath(userId: string): Promise<string> {
        if (!userId) return "";
        try {
            if (this.userImagePathCache[userId]) return this.userImagePathCache[userId];
            const cached = await getCachedDataUrlPath(`user:${userId}`);
            if (cached) {
                this.userImagePathCache[userId] = cached;
                return cached;
            }
            const result = await this.loadUserImage(userId);
            return result.path;
        } catch (error) {
            log.error("getUserImagePath failed", error);
            return "";
        }
    }

    private static async loadUserImage(userId: string): Promise<{ dataUrl: string; path: string }> {
        const pending = this.userImageRequests[userId];
        if (pending) return pending;
        const request = (async () => {
            const result = (await runtime.client?.getImage(userId)) as { data_url?: string } | undefined;
            const key = `user:${userId}`;
            const dataUrl = ((await cacheDataUrl(key, result?.data_url || "")) as string) || "";
            const path = ((await cacheDataUrlPath(key, result?.data_url || "")) as string) || "";
            if (dataUrl) this.userImageCache[userId] = dataUrl;
            if (path) this.userImagePathCache[userId] = path;
            return { dataUrl, path };
        })();
        this.userImageRequests[userId] = request;
        try {
            return await request;
        } finally {
            delete this.userImageRequests[userId];
        }
    }

    static async getChannelVoiceUsers(channelId = "", refresh = true, noMe = true): Promise<VoiceChannelUser[]> {
        const currentChannelId = channelId || this.data.currentVoiceChannel;
        if (!currentChannelId || currentChannelId === "__disconnect__") return [];
        if (refresh) {
            try {
                const channel = (await runtime.client?.getChannel(currentChannelId)) as DiscordChannel | undefined;
                this.data.channelUsers = channel?.voice_states || channel?.voiceStates || [];
            } catch (error) {
                log.error("getChannelVoiceUsers failed", error);
            }
        }
        return noMe ? this.data.channelUsers.filter((item) => item?.user?.id !== runtime.client?.user?.id) : this.data.channelUsers;
    }

    private static async updateCurrentVoiceChannel(res: unknown = null): Promise<void> {
        if (!res) {
            this.data.currentVoiceChannel = "";
            this.data.channelUsers = [];
            this.data.speakingUsers.clear();
            this.data.speakingOrder = [];
            await this.unbindVoiceChannelListeners();
            this.emit("VOICE_STATE_CHANGE");
            return;
        }

        const selected = res as DiscordChannel & { channel_id?: string | null };
        const channelId = selected.channel_id || selected.id;
        if (!channelId) {
            await this.updateCurrentVoiceChannel(null);
            return;
        }

        if (this.data.currentVoiceChannel && this.data.currentVoiceChannel !== channelId) {
            this.data.speakingUsers.clear();
            this.data.speakingOrder = [];
        }
        this.data.currentVoiceChannel = channelId;
        this.data.channelUsers = selected.voice_states || selected.voiceStates || [];
        await this.bindVoiceChannelListeners(channelId);
        this.emit("VOICE_STATE_CHANGE");
    }

    private static async bindVoiceChannelListeners(channelId: string): Promise<void> {
        const client = runtime.client;
        if (!client || !channelId || this.boundVoiceChannel === channelId) return;
        await this.unbindVoiceChannelListeners();
        this.boundVoiceChannel = channelId;
        const data = { channel_id: channelId };
        const subscriptions: Array<[string, (data: unknown) => void | Promise<void>]> = [
            ["VOICE_STATE_UPDATE", this.VOICE_STATE_UPDATE],
            ["VOICE_STATE_DELETE", this.VOICE_STATE_DELETE],
            ["SPEAKING_START", this.SPEAKING_START],
            ["SPEAKING_STOP", this.SPEAKING_STOP],
        ];
        for (const [event, handler] of subscriptions) {
            client.on(event, handler);
            try {
                this.voiceChannelUnsubscribers[event] = { ...(await client.subscribe(event, data)), key: listenerKey(event, data) };
            } catch (error) {
                log.error(`subscribe ${event} failed`, error);
            }
        }
        await this.syncVoiceChannelState(channelId);
    }

    private static async syncVoiceChannelState(channelId: string): Promise<void> {
        await this.getChannelVoiceUsers(channelId, true, false);
        this.emit("VOICE_STATE_UPDATE");
        this.emit("VOICE_STATE_CHANGE");
    }

    private static async unbindVoiceChannelListeners(): Promise<void> {
        const client = runtime.client;
        const handlers: Record<string, (data: unknown) => void | Promise<void>> = {
            VOICE_STATE_UPDATE: this.VOICE_STATE_UPDATE,
            VOICE_STATE_DELETE: this.VOICE_STATE_DELETE,
            SPEAKING_START: this.SPEAKING_START,
            SPEAKING_STOP: this.SPEAKING_STOP,
        };
        for (const [event, item] of Object.entries(this.voiceChannelUnsubscribers)) {
            try {
                await item.unsubscribe();
            } catch (error) {
                log.error(`unsubscribe ${event} failed`, error);
            }
            client?.off?.(event, handlers[event]);
        }
        this.voiceChannelUnsubscribers = {};
        this.boundVoiceChannel = "";
    }

    private static mergeChannelUsers(channelId: string, users: VoiceChannelUser[]): void {
        if (channelId !== this.data.currentVoiceChannel) return;
        for (const state of users) {
            if (!state?.user?.id) continue;
            const index = this.data.channelUsers.findIndex((item) => item.user?.id === state.user?.id);
            if (index === -1) this.data.channelUsers.push(state);
            else this.data.channelUsers[index] = state;
        }
    }

    private static removeChannelUser(channelId: string, userId: string): void {
        if (channelId !== this.data.currentVoiceChannel) return;
        this.data.channelUsers = this.data.channelUsers.filter((item) => item.user?.id !== userId);
    }

    private static removeSpeakingUser(userId: string): void {
        this.data.speakingUsers.delete(userId);
        this.data.speakingOrder = (this.data.speakingOrder || []).filter((id: string) => id !== userId);
    }

    private static async dispatchTo(event: string, context: string): Promise<void> {
        const fn = this.events[event]?.[context];
        if (fn) await fn();
    }

    private static emit(event: string): void {
        Object.values(this.events[event] || {}).forEach((fn) => void fn());
    }

    static VOICE_SETTINGS_UPDATE = (data: unknown = null): void => {
        if (data) Object.assign(GlobalListener.data, data);
        GlobalListener.emit("VOICE_SETTINGS_UPDATE");
    };

    static VOICE_CHANNEL_SELECT = async (data: unknown): Promise<void> => {
        await GlobalListener.updateCurrentVoiceChannel(data);
    };

    static VOICE_STATE_UPDATE = (data: unknown): void => {
        const state = data as VoiceChannelUser;
        if (state?.user?.id === runtime.client?.user?.id) {
            void GlobalListener.syncSelectedVoiceChannel();
            return;
        }
        const channelId = state.channel_id || state.channel?.id || GlobalListener.data.currentVoiceChannel;
        if (channelId) GlobalListener.mergeChannelUsers(channelId, [state]);
        GlobalListener.emit("VOICE_STATE_UPDATE");
        GlobalListener.emit("VOICE_STATE_CHANGE");
    };

    static VOICE_STATE_DELETE = (data: unknown): void => {
        const state = data as VoiceChannelUser;
        if (state?.user?.id === runtime.client?.user?.id) {
            void GlobalListener.syncSelectedVoiceChannel();
            return;
        }
        const channelId = state.channel_id || state.channel?.id || GlobalListener.data.currentVoiceChannel;
        if (channelId && state?.user?.id) GlobalListener.removeChannelUser(channelId, state.user.id);
        if (state?.user?.id) GlobalListener.removeSpeakingUser(state.user.id);
        GlobalListener.emit("VOICE_STATE_DELETE");
        GlobalListener.emit("VOICE_STATE_CHANGE");
    };

    static SPEAKING_START = (data: unknown): void => {
        const payload = data as { user_id?: string };
        if (!payload?.user_id) return;
        GlobalListener.data.speakingUsers.add(payload.user_id);
        GlobalListener.data.speakingOrder = [payload.user_id, ...(GlobalListener.data.speakingOrder || []).filter((id) => id !== payload.user_id)];
        GlobalListener.emit("SPEAKING_START");
        GlobalListener.emit("VOICE_STATE_CHANGE");
    };

    static SPEAKING_STOP = (data: unknown): void => {
        const payload = data as { user_id?: string };
        if (!payload?.user_id) return;
        GlobalListener.data.speakingUsers.delete(payload.user_id);
        GlobalListener.emit("SPEAKING_STOP");
        GlobalListener.emit("VOICE_STATE_CHANGE");
    };

    static NOTIFICATION_CREATE = async (data: unknown): Promise<void> => {
        const payload = data as { channel_id?: string; icon_url?: string };
        if (!payload.channel_id) return;
        GlobalListener.data.currentNotice = payload.channel_id;
        GlobalListener.data.notices[payload.channel_id] = (GlobalListener.data.notices[payload.channel_id] || 0) + 1;
        if (payload.icon_url) {
            GlobalListener.data.noticeImage = (await getImageAndCache(payload.icon_url, true)) || "";
        }
        GlobalListener.emit("NOTIFICATION_CREATE");
    };

    static SCREENSHARE_STATE_UPDATE = (data: unknown): void => {
        GlobalListener.data.screenshare = (data as { active?: boolean })?.active ?? false;
        GlobalListener.emit("SCREENSHARE_STATE_UPDATE");
    };

    static VIDEO_STATE_UPDATE = (data: unknown): void => {
        GlobalListener.data.video = (data as { active?: boolean })?.active ?? false;
        GlobalListener.emit("VIDEO_STATE_UPDATE");
    };
}
