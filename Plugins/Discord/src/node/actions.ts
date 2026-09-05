import { Action, log } from "@mirabox/streamdock-sdk/node";
import { loginState, runtime } from "./state.js";
import { AuthService } from "./services/AuthService.js";
import { DiscordRpcService } from "./services/DiscordRpcService.js";
import { eventBus } from "./services/EventBus.js";
import { GlobalListener } from "./services/GlobalListener.js";
import type { VoiceDeviceSettings, VoiceMode } from "./types.js";
import { t } from "./utils/i18n.js";
import { renderKnobVolumeImage } from "./utils/knobImages.js";
import { renderNotificationImage, renderShakeFrame, renderVoiceChannelImage, type VoiceAvatarItem } from "./utils/images.js";
import { findActionManifestAsync, isActionManifestRef, manifestRefMatches, readActionStateImageAsync, type ActionManifestRef } from "./utils/profileIcons.js";
import { adjustOutputVolume, transformInverse } from "./utils/volume.js";

function clampVolume(value: number, max: number): number {
    return Math.min(max, Math.max(0, value));
}

async function runSafely(action: Action, task: () => Promise<void> | void): Promise<void> {
    try {
        await task();
    } catch (error) {
        log.error(`${action.constructor.name} failed`, error);
        action.showAlert();
    }
}

async function getSelectChannel(settings: any, isTextChannel = false): Promise<any> {
    const guilds = await GlobalListener.getGuilds();
    const select = settings.select === "__disconnect__" ? "__disconnect__" : guilds.some((item) => item.id === settings.select) ? settings.select : guilds[0]?.id || "";
    const channels = select && select !== "__disconnect__" ? await GlobalListener.getChannels(select) : [];
    const filteredChannels = channels.filter((item) => (isTextChannel ? item.type === 0 : item.type === 2 || item.type === 13));
    const channel = settings.channel === "__disconnect__" ? "__disconnect__" : filteredChannels.some((item) => item.id === settings.channel) ? settings.channel : filteredChannels[0]?.id || "";
    const selectImage = select && select !== "__disconnect__" ? await GlobalListener.getGuildImage(select) : "";
    log.info("getSelectChannel", { isTextChannel, guildCount: guilds.length, select, channel, hasSelectImage: Boolean(selectImage) });
    return { ...settings, guilds, channels: filteredChannels, select, channel, iconDisplayMode: settings.iconDisplayMode || "static", selectImage };
}

abstract class DiscordAction extends Action {
    private loginHandler?: () => void;

    willAppear(data: StreamDockEvents.WillAppear): void {
        this.loginHandler = () => void this.onLogin();
        eventBus.on("Login", this.loginHandler);
        if (loginState.hasLogin) void this.onLogin();
    }

    willDisappear(_data?: StreamDockEvents.WillDisappear): void {
        if (this.loginHandler) eventBus.off("Login", this.loginHandler);
    }

    onLogin(): Promise<void> | void {}
}

abstract class VoiceSettingsAction extends DiscordAction {
    async onLogin(): Promise<void> {
        await GlobalListener.addListener("VOICE_SETTINGS_UPDATE", () => this.onVoiceSettingsUpdate(), this.context);
        this.onVoiceSettingsUpdate();
    }

    willDisappear(data: StreamDockEvents.WillDisappear): void {
        super.willDisappear(data);
        GlobalListener.removeListener("VOICE_SETTINGS_UPDATE", this.context);
    }

    abstract onVoiceSettingsUpdate(): void;
}

export class MuteAction extends VoiceSettingsAction {
    onVoiceSettingsUpdate(): void {
        this.setState(GlobalListener.data.mute || GlobalListener.data.deaf ? 1 : 0);
    }

    keyUp(): void {
        void runSafely(this, async () => {
            const mute = !GlobalListener.data.mute;
            GlobalListener.data.mute = mute;
            await DiscordRpcService.setVoiceSettings({ mute });
            this.onVoiceSettingsUpdate();
        });
    }
}

export class DeafAction extends VoiceSettingsAction {
    onVoiceSettingsUpdate(): void {
        this.setState(GlobalListener.data.deaf ? 1 : 0);
    }

    keyUp(): void {
        void runSafely(this, async () => {
            const deaf = !GlobalListener.data.deaf;
            GlobalListener.data.deaf = deaf;
            await DiscordRpcService.setVoiceSettings({ deaf });
            this.onVoiceSettingsUpdate();
        });
    }
}

export class PushToTalkAction extends DiscordAction {
    private active = false;
    private get isVoiceActivity(): boolean {
        return GlobalListener.data.mode?.type === "VOICE_ACTIVITY";
    }

    keyDown(): void {
        if (this.active) return;
        void runSafely(this, async () => {
            this.active = true;
            this.setState(1);
            if (this.isVoiceActivity) {
                // 语音激活模式: 按下取消静音，松手恢复静音
                await DiscordRpcService.setVoiceSettings({ mute: false });
            } else {
                // 按键说话模式: 使用 Discord 原生 PTT
                await DiscordRpcService.pushToTalk(true);
            }
        });
    }

    keyUp(): void {
        if (!this.active) return;
        void runSafely(this, async () => {
            this.active = false;
            this.setState(0);
            if (this.isVoiceActivity) {
                await DiscordRpcService.setVoiceSettings({ mute: true });
            } else {
                await DiscordRpcService.pushToTalk(false);
            }
        });
    }

    willDisappear(data: StreamDockEvents.WillDisappear): void {
        super.willDisappear(data);
        if (this.active) {
            if (this.isVoiceActivity) {
            } else {
                void DiscordRpcService.pushToTalk(false);
            }
        }
    }
}

export class VoiceActivationToggleAction extends VoiceSettingsAction {
    onVoiceSettingsUpdate(): void {
        this.setState(GlobalListener.data.mode?.type === "VOICE_ACTIVITY" ? 1 : 0);
    }

    keyUp(): void {
        void runSafely(this, async () => {
            const currentMode = GlobalListener.data.mode || (await DiscordRpcService.getVoiceSettings()).mode || {};
            const modeCompat = currentMode as VoiceMode & { auto_threshold?: boolean };
            const nextType: "VOICE_ACTIVITY" | "PUSH_TO_TALK" = currentMode.type === "VOICE_ACTIVITY" ? "PUSH_TO_TALK" : "VOICE_ACTIVITY";
            const mode = {
                type: nextType,
                autoThreshold: modeCompat.autoThreshold ?? modeCompat.auto_threshold,
                threshold: currentMode.threshold,
                shortcut: currentMode.shortcut,
                delay: currentMode.delay,
            };
            GlobalListener.data.mode = mode;
            this.setState(nextType === "VOICE_ACTIVITY" ? 1 : 0);
            await DiscordRpcService.setVoiceSettings({ mode });
        });
    }
}

export class MuteControlAction extends VoiceSettingsAction {
    onVoiceSettingsUpdate(): void {
        this.setState(GlobalListener.data.mute || GlobalListener.data.deaf ? 1 : 0);
        this.setTitle(`${Math.round(GlobalListener.data.input?.volume || 0)}%`);
    }

    dialRotate(data: StreamDockEvents.DialRotate): void {
        void runSafely(this, async () => {
            const volume = clampVolume((GlobalListener.data.input?.volume || 0) + 5 * data.payload.ticks, 100);
            this.setTitle(`${Math.round(volume)}%`);
            await DiscordRpcService.setVoiceSettings({ input: { volume } });
        });
    }

    dialDown(): void {
        void runSafely(this, async () => DiscordRpcService.setVoiceSettings({ mute: !GlobalListener.data.mute }));
    }
}

export class DeafControlAction extends VoiceSettingsAction {
    onVoiceSettingsUpdate(): void {
        this.setState(GlobalListener.data.deaf ? 1 : 0);
        this.setTitle(`${Math.round(transformInverse(GlobalListener.data.output?.volume || 0))}%`);
    }

    dialRotate(data: StreamDockEvents.DialRotate): void {
        void runSafely(this, async () => {
            const volume = adjustOutputVolume(GlobalListener.data.output?.volume || 0, 5 * data.payload.ticks);
            this.setTitle(`${Math.round(transformInverse(volume))}%`);
            await DiscordRpcService.setVoiceSettings({ output: { volume } });
        });
    }

    dialDown(): void {
        void runSafely(this, async () => DiscordRpcService.setVoiceSettings({ deaf: !GlobalListener.data.deaf }));
    }
}

export class VoiceChannelAction extends DiscordAction {
    protected currentSelect = "";
    protected currentChannel = "";
    protected currentIconDisplayMode = "";
    protected currentStaticImage = "";

    async onLogin(): Promise<void> {
        void this.refresh();
        void this.registerVoiceListeners();
    }

    willDisappear(data: StreamDockEvents.WillDisappear): void {
        super.willDisappear(data);
        GlobalListener.removeListener("VOICE_STATE_CHANGE", this.context);
        GlobalListener.removeListener("VOICE_STATE_UPDATE", this.context);
        GlobalListener.removeListener("VOICE_STATE_DELETE", this.context);
        GlobalListener.removeListener("SPEAKING_START", this.context);
        GlobalListener.removeListener("SPEAKING_STOP", this.context);
    }

    updateState(): void {
        const inVoice = Boolean(GlobalListener.data.currentVoiceChannel);
        if (!this.isDisconnectAction()) return;
        this.setState(this.isDisconnectAction() && inVoice ? 1 : 0);
    }

    async refresh(): Promise<void> {
        const { selectImage, ...settings } = await getSelectChannel(this.settings);
        this.currentSelect = settings.select;
        this.currentChannel = settings.channel;
        this.currentIconDisplayMode = (settings.iconDisplayMode as string) || "static";
        this.currentStaticImage = selectImage;
        // 在服务器列表最前面插入"离开语音频道"选项
        settings.guilds = [{ id: "__disconnect__", name: "<< 离开语音频道 >>" }, ...settings.guilds];
        // 选中离开时隐藏频道列表
        if (settings.select === "__disconnect__") {
            settings.channels = [];
            settings.channel = "__disconnect__";
        }
        this.setSettings(settings);
        await this.updateChannelImage();
        if (settings.channel === "__disconnect__") {
            this.setTitle("离开");
        } else if (settings.channel) {
            this.setTitle(settings.channels.find((item: any) => item.id === settings.channel)?.name || "");
        }
        void this.registerVoiceListeners();
    }

    didReceiveSettings(data: StreamDockEvents.DidReceiveSettings): void {
        const nextSelect = data.payload.settings.select || "";
        const nextChannel = data.payload.settings.channel || "";
        const nextMode = data.payload.settings.iconDisplayMode || "static";
        if (this.currentSelect !== nextSelect || this.currentChannel !== nextChannel || this.currentIconDisplayMode !== nextMode) void this.refresh();
        else this.updateState();
    }

    sendToPlugin(data: StreamDockEvents.SendToPlugin): void {
        if (data.payload?.refresh) void this.refresh();
    }

    protected async registerVoiceListeners(): Promise<void> {
        const channelId = this.getConfiguredChannel();
        if (!channelId || channelId === "__disconnect__") return;
        await GlobalListener.addListener("VOICE_STATE_CHANGE", () => this.updateChannelImage(), this.context);
        if (this.getIconDisplayMode() !== "dynamic") return;
        const data = { channel_id: channelId };
        await GlobalListener.addListener("VOICE_STATE_UPDATE", this.updateChannelImage.bind(this), this.context, data);
        await GlobalListener.addListener("VOICE_STATE_DELETE", this.updateChannelImage.bind(this), this.context, data);
        await GlobalListener.addListener("SPEAKING_START", this.updateChannelImage.bind(this), this.context, data);
        await GlobalListener.addListener("SPEAKING_STOP", this.updateChannelImage.bind(this), this.context, data);
    }

    protected async updateChannelImage(): Promise<void> {
        if (this.isDisconnectAction()) {
            this.updateState();
            return;
        }
        if (this.getIconDisplayMode() !== "dynamic") {
            this.restoreStaticImage();
            return;
        }
        if (!this.isCurrentVoiceChannel()) {
            this.restoreStaticImage();
            return;
        }
        await this.updateDynamicImage(this.currentStaticImage);
    }

    protected restoreStaticImage(): void {
        if (this.currentStaticImage) this.setImage(this.currentStaticImage);
        else this.setState(0);
    }

    protected getConfiguredChannel(): string {
        return this.currentChannel || (this.settings.channel as string) || "";
    }

    protected getIconDisplayMode(): string {
        return this.currentIconDisplayMode || (this.settings.iconDisplayMode as string) || "static";
    }

    protected isDisconnectAction(): boolean {
        return this.currentSelect === "__disconnect__" || this.currentChannel === "__disconnect__" || this.settings.select === "__disconnect__" || this.settings.channel === "__disconnect__";
    }

    protected isCurrentVoiceChannel(): boolean {
        const channelId = this.getConfiguredChannel();
        return Boolean(channelId && !this.isDisconnectAction() && GlobalListener.data.currentVoiceChannel === channelId);
    }

    protected async updateDynamicImage(fallbackImage = ""): Promise<void> {
        const channelId = this.getConfiguredChannel();
        if (!channelId || channelId === "__disconnect__" || !this.isCurrentVoiceChannel()) {
            if (fallbackImage) this.setImage(fallbackImage);
            else this.setState(0);
            return;
        }
        const voiceStates = await GlobalListener.getChannelVoiceUsers(channelId, false, false);
        if (!voiceStates.length) {
            if (fallbackImage) this.setImage(fallbackImage);
            else this.setState(0);
            return;
        }
        const speakingUsers = GlobalListener.data.speakingUsers as Set<string>;
        const speakingOrder = (GlobalListener.data.speakingOrder || []) as string[];
        const orderIndex = new Map<string, number>();
        speakingOrder.forEach((id, index) => orderIndex.set(id, index));
        const sorted = [...voiceStates].sort((a: any, b: any) => {
            const aId = a.user?.id || "";
            const bId = b.user?.id || "";
            const aSpeaking = speakingUsers.has(aId) ? 0 : 1;
            const bSpeaking = speakingUsers.has(bId) ? 0 : 1;
            if (aSpeaking !== bSpeaking) return aSpeaking - bSpeaking;
            const aOrder = orderIndex.get(aId);
            const bOrder = orderIndex.get(bId);
            if (aOrder !== undefined || bOrder !== undefined) return (aOrder ?? 9999) - (bOrder ?? 9999);
            return 0;
        });
        log.info("render dynamic voice channel image", { channelId, users: voiceStates.length, visible: Math.min(sorted.length, 4), speaking: speakingUsers.size });
        const avatars: VoiceAvatarItem[] = [];
        for (const state of sorted.slice(0, 4)) {
            const id = state.user?.id;
            if (!id) continue;
            const imagePath = await GlobalListener.getUserImagePath(id);
            if (imagePath) avatars.push({ id, imagePath, speaking: speakingUsers.has(id) });
        }
        if (avatars.length) this.setImage(await renderVoiceChannelImage(avatars, voiceStates.length, { width: 128, height: 128 }));
        else if (fallbackImage) this.setImage(fallbackImage);
        else this.setState(0);
    }

    keyUp(): void {
        void runSafely(this, async () => {
            if (this.settings.channel === "__disconnect__") {
                await runtime.client?.selectVoiceChannel(null as any);
                await GlobalListener.syncSelectedVoiceChannel();
                return;
            }
            const selected = await runtime.client?.GET_SELECTED_VOICE_CHANNEL();
            if (selected?.id === this.settings.channel || selected?.channel_id === this.settings.channel) {
                await runtime.client?.selectVoiceChannel(null as any);
            } else {
                await runtime.client?.selectVoiceChannel(null as any);
                await runtime.client?.selectVoiceChannel(this.settings.channel as string);
            }
            await GlobalListener.syncSelectedVoiceChannel();
            this.showOk();
        });
    }
}

export class TextChannelAction extends VoiceChannelAction {
    async onLogin(): Promise<void> {
        void this.refresh();
    }

    protected async registerVoiceListeners(): Promise<void> {}

    async refresh(): Promise<void> {
        const { selectImage, ...settings } = await getSelectChannel(this.settings, true);
        this.currentSelect = settings.select;
        this.setSettings(settings);
        if (selectImage) this.setImage(selectImage);
        if (settings.channel) this.setTitle(settings.channels.find((item: any) => item.id === settings.channel)?.name || "");
    }

    keyUp(): void {
        void runSafely(this, async () => {
            await runtime.client?.selectTextChannel(this.settings.channel as string);
            this.showOk();
        });
    }
}

export class VolumeControlAction extends Action {
    keyUp(data: StreamDockEvents.KeyUp): void {
        void runSafely(this, async () => {
            const settings = data.payload.settings;
            if (!settings.rdio || !settings.slider) return;
            await DiscordRpcService.setVoiceSettings({
                [settings.rdio as string]: { volume: adjustOutputVolume(0, Number(settings.slider)) },
            } as any);
        });
    }
}

export class VolumeControlKnobAction extends VoiceSettingsAction {
    onVoiceSettingsUpdate(): void {
        const rdio = (this.settings.rdio as string) || "output";
        const device = GlobalListener.data[rdio] as VoiceDeviceSettings | undefined;
        this.updateKnobImage(this.toDisplayVolume(rdio, device?.volume ?? 0));
    }

    didReceiveSettings(): void {
        this.onVoiceSettingsUpdate();
    }

    private updateKnobImage(value: number): void {
        const rdio = (this.settings.rdio as string) || "output";
        const max = rdio === "input" ? 100 : 200;
        this.setTitle("");
        this.setImage(
            renderKnobVolumeImage({
                title: rdio === "input" ? t("输入音量") : t("输出音量"),
                value,
                max,
                icon: rdio === "input" ? "mic" : "volume",
            }),
        );
    }

    private toDisplayVolume(rdio: string, volume: number): number {
        return Math.round(rdio === "input" ? clampVolume(volume, 100) : transformInverse(volume));
    }

    private adjustVolume(rdio: string, current: number, offset: number): number {
        if (rdio === "input") return clampVolume(current + offset, 100);
        return adjustOutputVolume(current, offset);
    }

    dialRotate(data: StreamDockEvents.DialRotate): void {
        void runSafely(this, async () => {
            const rdio = (this.settings.rdio as string) || "output";
            const device = GlobalListener.data[rdio] as VoiceDeviceSettings | undefined;
            const current = device?.volume ?? 0;
            const step = Number(this.settings.adjustment || 1);
            const volume = this.adjustVolume(rdio, current, step * data.payload.ticks);
            this.updateKnobImage(this.toDisplayVolume(rdio, volume));
            await DiscordRpcService.setVoiceSettings({ [rdio]: { volume } } as any);
        });
    }

    dialDown(): void {
        void runSafely(this, async () => {
            const rdio = (this.settings.rdio as string) || "output";
            if (rdio === "input") {
                await DiscordRpcService.setVoiceSettings({ mute: !GlobalListener.data.mute });
            } else {
                await DiscordRpcService.setVoiceSettings({ deaf: !GlobalListener.data.deaf });
            }
        });
    }
}

export class SetDevicesAction extends VoiceSettingsAction {
    onVoiceSettingsUpdate(): void {
        const settings = this.settings as Record<string, unknown>;
        settings.inputDevices = GlobalListener.data.input?.availableDevices || GlobalListener.data.input?.available_devices || [];
        settings.outputDevices = GlobalListener.data.output?.availableDevices || GlobalListener.data.output?.available_devices || [];
        this.saveSettings();
    }

    keyUp(): void {
        void runSafely(this, async () => {
            const settings: any = {};
            if (this.settings.mode === "input" || this.settings.mode === "both") settings.input = { device: this.settings.input };
            if (this.settings.mode === "output" || this.settings.mode === "both") settings.output = { device: this.settings.output };
            await DiscordRpcService.setVoiceSettings(settings);
        });
    }
}

export class VoiceboardAction extends DiscordAction {
    async onLogin(): Promise<void> {
        await GlobalListener.addListener("VOICE_STATE_CHANGE", () => this.updateState(), this.context);
        this.updateState();
        await this.refresh();
    }

    willDisappear(data: StreamDockEvents.WillDisappear): void {
        super.willDisappear(data);
        GlobalListener.removeListener("VOICE_STATE_CHANGE", this.context);
    }

    updateState(): void {
        this.setState(GlobalListener.data.currentVoiceChannel ? 1 : 0);
    }

    async refresh(): Promise<void> {
        this.updateState();
        const [sounds, guilds] = await Promise.all([GlobalListener.getSoundboardSounds(false), GlobalListener.getGuilds()]);
        const guildMap = new Map<string, string>();
        for (const g of guilds) {
            guildMap.set(g.id, g.name || "");
        }
        for (const s of sounds) {
            if (!s.guild_name && s.guild_id) {
                s.guild_name = guildMap.get(s.guild_id) || (s.guild_id === "0" ? "Default" : `Server ${s.guild_id}`);
            }
        }
        (this.settings as Record<string, unknown>).sounds = sounds;
        this.saveSettings();
        const selected = sounds.find((item) => item.sound_id === this.settings.sound_id);
        if (selected) this.setTitle((this.settings.title as string) || selected.name || "");
    }

    sendToPlugin(data: StreamDockEvents.SendToPlugin): void {
        if (data.payload?.refresh) void this.refresh();
    }

    keyUp(): void {
        void (async () => {
            if (!GlobalListener.data.currentVoiceChannel) return;
            const sounds = Array.isArray(this.settings.sounds) ? this.settings.sounds : [];
            const sound = sounds.find((item: any) => item.sound_id === this.settings.sound_id);
            if (!sound || !runtime.client) return;
            const payload = { ...(sound as Record<string, any>) };
            delete payload.guild_name;
            try {
                await runtime.client.PLAY_SOUNDBOARD_SOUND(payload);
            } catch (error: any) {
                if (error?.code === 4005 || error?.code === 4018) return;
                log.error("PLAY_SOUNDBOARD_SOUND failed", error);
                this.showAlert();
            }
        })();
    }
}

export class NoticeAction extends DiscordAction {
    private timer?: ReturnType<typeof setInterval>;
    private baseIconRef: ActionManifestRef | null = null;
    private lookupToken = 0;

    willAppear(data: StreamDockEvents.WillAppear): void {
        const cachedRef = (data.payload.settings as Record<string, unknown>)?.noticeManifestRef;
        this.baseIconRef = isActionManifestRef(cachedRef) && manifestRefMatches(data, cachedRef) ? cachedRef : null;
        super.willAppear(data);
        if (!this.baseIconRef) {
            if (cachedRef) {
                delete (this.settings as Record<string, unknown>).noticeManifestRef;
                this.saveSettings();
            }
            this.lookupBaseIconInBackground(data);
        }
    }

    async onLogin(): Promise<void> {
        await GlobalListener.addListener("NOTIFICATION_CREATE", () => this.animateNotification(), this.context);
        void this.updateImage();
    }

    propertyInspectorDidDisappear(): void {
        void this.updateImage();
    }

    willDisappear(data: StreamDockEvents.WillDisappear): void {
        super.willDisappear(data);
        this.lookupToken++;
        if (this.timer) clearInterval(this.timer);
        GlobalListener.removeListener("NOTIFICATION_CREATE", this.context);
    }

    private getNoticeCount(): number {
        return (Object.values(GlobalListener.data.notices || {}) as any[]).reduce((acc: number, value: any) => acc + Number(value || 0), 0);
    }

    async updateImage(): Promise<void> {
        const sum = this.getNoticeCount();
        this.setImage(await renderNotificationImage(sum, await readActionStateImageAsync(this.baseIconRef)));
    }

    private lookupBaseIconInBackground(data: StreamDockEvents.WillAppear): void {
        const token = ++this.lookupToken;
        void findActionManifestAsync(data)
            .then((ref) => {
                if (!ref || token !== this.lookupToken || this.context !== data.context) return;
                this.baseIconRef = ref;
                (this.settings as Record<string, unknown>).noticeManifestRef = ref;
                this.saveSettings();
                void this.updateImage();
            })
            .catch((error) => {
                log.error("find notice action manifest failed", error);
            });
    }

    animateNotification(): void {
        const noticeImage = GlobalListener.data.noticeImage as Buffer | null;
        if (!noticeImage) {
            void this.updateImage();
            return;
        }
        if (this.timer) clearInterval(this.timer);
        const frameRate = 20;
        const frameDelay = 1000 / frameRate;
        const amplitude = 6;
        const freq = 6;
        const duration = 1500;
        const startTime = Date.now();
        let frameIndex = 0;
        this.timer = setInterval(() => {
            const t = frameIndex / frameRate;
            const offsetX = Math.round(Math.sin(t * 2 * Math.PI * freq) * amplitude);
            void renderShakeFrame(noticeImage, offsetX).then((frame) => this.setImage(frame));
            frameIndex++;
            if (Date.now() - startTime >= duration) {
                if (this.timer) clearInterval(this.timer);
                this.timer = undefined;
                void this.updateImage();
            }
        }, frameDelay);
    }

    updateTitle(): void {
        const sum = Object.values(GlobalListener.data.notices || {}).reduce((acc: number, value: any) => acc + Number(value || 0), 0);
        this.setTitle(String(sum));
    }

    keyUp(): void {
        void runSafely(this, async () => {
            if (!GlobalListener.data.currentNotice) return;
            await runtime.client?.selectTextChannel(GlobalListener.data.currentNotice);
            GlobalListener.data.notices = {};
            await this.updateImage();
        });
    }
}

export class UserVolumeControlAction extends DiscordAction {
    protected setDisconnectedVisual(): void {
        this.setTitle("");
    }

    async onLogin(): Promise<void> {
        await GlobalListener.addListener("VOICE_STATE_CHANGE", () => this.refresh(), this.context);
        await this.refresh();
    }

    willDisappear(data: StreamDockEvents.WillDisappear): void {
        super.willDisappear(data);
        GlobalListener.removeListener("VOICE_STATE_CHANGE", this.context);
    }

    updateState(): void {
        this.setState(GlobalListener.data.currentVoiceChannel ? 1 : 0);
    }

    async refresh(): Promise<void> {
        if (!GlobalListener.data.currentVoiceChannel) {
            (this.settings as Record<string, unknown>).voice_states = [];
            this.setState(0);
            this.setDisconnectedVisual();
            this.saveSettings();
            return;
        }
        const voiceStates = await GlobalListener.getChannelVoiceUsers("", false);
        (this.settings as Record<string, unknown>).voice_states = voiceStates;
        const selected = voiceStates.find((item: any) => item.user?.id === this.settings.user);
        if (selected) await this.renderSelectedUserVisual(selected);
        else this.setState(1);
        this.saveSettings();
    }

    protected async renderSelectedUserVisual(voiceState: any): Promise<void> {
        await this.setSelectedUserVisual(voiceState?.user);
    }

    async setSelectedUserVisual(user: any): Promise<void> {
        if (!user) return;
        this.setTitle(user.global_name || user.username || "");
        const image = await GlobalListener.getUserImage(user.id);
        if (image) this.setImage(image);
    }

    didReceiveSettings(data: StreamDockEvents.DidReceiveSettings): void {
        const selected = ((data.payload.settings.voice_states as any[]) || []).find((item: any) => item.user?.id === data.payload.settings.user);
        if (selected) void this.renderSelectedUserVisual(selected);
    }

    keyUp(): void {
        void runSafely(this, async () => {
            const voiceState = ((this.settings.voice_states as any[]) || []).find((item: any) => item.user?.id === this.settings.user);
            if (!voiceState) return;
            if (this.settings.mode === "mute") {
                voiceState.mute = !voiceState.mute;
            } else if (this.settings.mode === "set") {
                voiceState.volume = Number(this.settings.volume || 100);
            } else {
                voiceState.volume += (Number(this.settings.adjustment || 0) / 100) * voiceState.volume;
                voiceState.volume = Math.min(200, Math.max(0, voiceState.volume));
            }
            await runtime.client?.setUserVoiceSettings(
                this.settings.user as string,
                {
                    id: this.settings.user,
                    pan: voiceState.pan,
                    volume: voiceState.volume,
                    mute: voiceState.mute,
                } as any,
            );
            this.saveSettings();
        });
    }
}

export class UserVolumeControlKnobAction extends UserVolumeControlAction {
    private updateKnobImage(voiceState: any): void {
        const user = voiceState?.user || {};
        const name = user.global_name || user.username || t("用户音量");
        const value = Math.round(Number(voiceState?.volume ?? 100));
        this.setTitle("");
        this.setImage(
            renderKnobVolumeImage({
                title: String(name).slice(0, 8),
                value,
                max: 200,
                icon: "user",
            }),
        );
    }

    protected async renderSelectedUserVisual(voiceState: any): Promise<void> {
        this.updateKnobImage(voiceState);
    }

    async refresh(): Promise<void> {
        await super.refresh();
    }

    didReceiveSettings(data: StreamDockEvents.DidReceiveSettings): void {
        super.didReceiveSettings(data);
    }

    dialRotate(data: StreamDockEvents.DialRotate): void {
        void runSafely(this, async () => {
            const voiceState = ((this.settings.voice_states as any[]) || []).find((item: any) => item.user?.id === this.settings.user);
            if (!voiceState) return;
            voiceState.volume = Math.min(200, Math.max(0, voiceState.volume + Number(this.settings.adjustment || 1) * data.payload.ticks));
            this.updateKnobImage(voiceState);
            await runtime.client?.setUserVoiceSettings(
                this.settings.user as string,
                {
                    id: this.settings.user,
                    pan: voiceState.pan,
                    volume: voiceState.volume,
                    mute: voiceState.mute,
                } as any,
            );
            this.saveSettings();
        });
    }
}

export class ToggleVideoAction extends DiscordAction {
    async onLogin(): Promise<void> {
        await GlobalListener.addListener("VIDEO_STATE_UPDATE", () => this.updateState(), this.context);
        this.updateState();
    }

    willDisappear(data: StreamDockEvents.WillDisappear): void {
        super.willDisappear(data);
        GlobalListener.removeListener("VIDEO_STATE_UPDATE", this.context);
    }

    updateState(): void {
        this.setState(GlobalListener.data.video ? 1 : 0);
    }

    keyUp(): void {
        void runSafely(this, async () => {
            await runtime.client?.TOGGLE_VIDEO();
        });
    }
}

export class ScreenShareAction extends DiscordAction {
    async onLogin(): Promise<void> {
        await GlobalListener.addListener("SCREENSHARE_STATE_UPDATE", () => this.updateState(), this.context);
        this.updateState();
    }

    willDisappear(data: StreamDockEvents.WillDisappear): void {
        super.willDisappear(data);
        GlobalListener.removeListener("SCREENSHARE_STATE_UPDATE", this.context);
    }

    updateState(): void {
        this.setState(GlobalListener.data.screenshare ? 1 : 0);
    }

    keyUp(): void {
        void runSafely(this, async () => {
            await runtime.client?.TOGGLE_SCREENSHARE();
        });
    }
}

export function registerActions(plugin: any): void {
    plugin.regActionClass("mute", MuteAction);
    plugin.regActionClass("deaf", DeafAction);
    plugin.regActionClass("voicechannel", VoiceChannelAction);
    plugin.regActionClass("textchannel", TextChannelAction);
    plugin.regActionClass("notice", NoticeAction);
    plugin.regActionClass("userVolumeControl", UserVolumeControlAction);
    plugin.regActionClass("userVolumeControlKnob", UserVolumeControlKnobAction);
    plugin.regActionClass("volumeControl", VolumeControlAction);
    plugin.regActionClass("volumeControlKnob", VolumeControlKnobAction);
    plugin.regActionClass("voiceboard", VoiceboardAction);
    plugin.regActionClass("setDevices", SetDevicesAction);
    plugin.regActionClass("mutecontrol", MuteControlAction);
    plugin.regActionClass("deafcontrol", DeafControlAction);
    plugin.regActionClass("toggleVideo", ToggleVideoAction);
    plugin.regActionClass("screenShare", ScreenShareAction);
    plugin.regActionClass("pushtotalk", PushToTalkAction);
    plugin.regActionClass("voiceActivationToggle", VoiceActivationToggleAction);
}

export function setupPluginLifecycle(plugin: any): void {
    const refreshCb = () => {
        if (loginState.hasLogin) {
            plugin.actionList?.forEach((action: Action) => action.setTitle(""));
            return;
        }
        const title = loginState.failCount > 3 ? "Please try\nrestart\nDiscord" : ["unconnected", "", ""][loginState.loginState + 1];
        plugin.actionList?.forEach((action: Action) => action.setTitle(title));
    };
    AuthService.setRefreshCallback(refreshCb);

    plugin.didReceiveGlobalSettings = async (_data: StreamDockEvents.DidReceiveGlobalSettings) => {
        loginState.failCount = 0;
        const method = plugin.globalSettings?.authMethod || "streamkit";
        const hasAnyToken = Boolean(plugin.globalSettings?.streamKitToken) || Boolean(plugin.globalSettings?.accessToken);

        // 前端清除了所有 token（登出或切换模式）→ 后端同步登出
        if (!hasAnyToken && loginState.hasLogin) {
            AuthService.logout();
            return;
        }

        // 仅在前端显式触发（_triggerAuth 标记）时才执行授权
        // 例外：已有 StreamKit token 时自动续期（token 有效则快速重连，过期则弹窗重授权）
        if (!plugin.globalSettings?._triggerAuth) {
            if (method === "streamkit" && plugin.globalSettings?.streamKitToken) {
                if (!loginState.hasLogin && !loginState.logining) {
                    await AuthService.authorize("streamkit");
                }
                return;
            }
            // StreamKit 模式：提前建立 IPC 连接，后续授权无需等待握手
            if (method === "streamkit" && !loginState.hasLogin) {
                AuthService.preConnect().catch(() => {});
            }
            return;
        }
        // 清除标记避免重复触发
        delete plugin.globalSettings._triggerAuth;
        plugin.setGlobalSettings(plugin.globalSettings);

        if (loginState.hasLogin || loginState.logining) return;

        if (method === "manual") {
            if (!plugin.globalSettings?.accessToken) {
                await AuthService.manualRefreshToken(true);
            } else {
                const s = plugin.globalSettings;
                await AuthService.manualLogin(s.clientId as string, s.accessToken as string);
            }
        } else {
            await AuthService.authorize("streamkit");
        }
    };

    plugin.applicationDidLaunch = () => {
        loginState.appState = true;
        if (loginState.timer) clearInterval(loginState.timer);
        loginState.timer = AuthService.startMaintenance();
        // Discord 刚启动时 IPC pipe 可能还没 ready，后台重试直到可连接/可认证。
        AuthService.startReconnectLoop("application launch");
    };

    plugin.applicationDidTerminate = () => {
        if (loginState.timer) clearInterval(loginState.timer);
        loginState.appState = false;
        AuthService.handleDiscordTerminated();
    };
}
