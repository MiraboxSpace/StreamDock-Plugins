import EventEmitter from "node:events";
import { setTimeout, clearTimeout } from "node:timers";
import * as transports from "./transports/index.js";
import { RPCCommands, RPCEvents, RelationshipTypes } from "./constants.js";
import { pid as getPid, uuid } from "./util.js";

function subKey(event: string, args: unknown): string {
    return `${event}${JSON.stringify(args)}`;
}

const RPC_REQUEST_TIMEOUT_MS = 2000;
const RPC_REQUEST_RETRY_COUNT = 2;

export interface RPCClientOptions {
    transport: "ipc";
}

interface RPCLoginOptions {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    rpcToken?: string;
    tokenEndpoint?: string;
    scopes?: string[];
}

interface ClientApplication {
    id: string;
    name: string;
    icon?: string;
    description?: string;
    summary?: string;
    [key: string]: unknown;
}

interface User {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
    [key: string]: unknown;
}

interface CertifiedDevice {
    type: "AUDIO_INPUT" | "AUDIO_OUTPUT" | "VIDEO_INPUT";
    uuid: string;
    vendor: {
        name: string;
        url: string;
    };
    model: {
        name: string;
        url: string;
    };
    related: string[];
    echoCancellation: boolean;
    noiseSuppression: boolean;
    automaticGainControl: boolean;
    hardwareMute: boolean;
}

interface UserVoiceSettings {
    pan?: { left: number; right: number } | null;
    volume?: number;
    mute?: boolean;
}

interface Guild {
    id: string;
    name: string;
    [key: string]: unknown;
}

interface Channel {
    id: string;
    name: string;
    type: number;
    [key: string]: unknown;
}

interface VoiceSettings {
    automaticGainControl: boolean;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    qos: boolean;
    silenceWarning: boolean;
    deaf: boolean;
    mute: boolean;
    input: {
        availableDevices: Array<{ id: string; name: string }>;
        device: string;
        volume: number;
    };
    output: {
        availableDevices: Array<{ id: string; name: string }>;
        device: string;
        volume: number;
    };
    mode: {
        type: string;
        autoThreshold: boolean;
        threshold: number;
        shortcut: unknown;
        delay: number;
    };
}

interface SetVoiceSettingsArgs {
    automaticGainControl?: boolean;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    qos?: boolean;
    silenceWarning?: boolean;
    deaf?: boolean;
    mute?: boolean;
    input?: {
        device?: string;
        volume?: number;
    };
    output?: {
        device?: string;
        volume?: number;
    };
    mode?: {
        type?: string;
        autoThreshold?: boolean;
        threshold?: number;
        shortcut?: unknown;
        delay?: number;
    };
}

interface SetActivityArgs {
    pid?: number;
    state?: string;
    details?: string;
    startTimestamp?: number | Date;
    endTimestamp?: number | Date;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    partySize?: number;
    partyId?: string;
    partyMax?: number;
    matchSecret?: string;
    joinSecret?: string;
    spectateSecret?: string;
    buttons?: Array<{ label: string; url: string }>;
    instance?: boolean;
}

interface RPCMessage {
    cmd: string;
    evt: string;
    nonce: string;
    data: {
        user?: User;
        code?: number;
        message?: string;
        [key: string]: unknown;
    };
}

interface ExpectingEntry {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timeout?: ReturnType<typeof setTimeout>;
    finish: () => void;
}

interface QueuedRequest {
    cmd: string;
    args?: unknown;
    evt?: string;
    nonce: string;
    retriesLeft: number;
    timeout: number;
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
}

interface TransportInstance extends EventEmitter {
    connect(): Promise<void>;
    close(): Promise<void>;
    send(data: unknown, op?: number): void;
    ping(): void;
}

interface FetchFunction {
    (method: string, path: string, options?: { data?: unknown; query?: Record<string, string> }): Promise<unknown>;
    endpoint: string;
}

export class RPCClient extends EventEmitter {
    options: RPCClientOptions;
    accessToken: string | null = null;
    clientId: string | null = null;
    application: ClientApplication | null = null;
    user: User | null = null;
    fetch: FetchFunction;
    transport: TransportInstance;
    private _expecting: Map<string, ExpectingEntry> = new Map();
    private _subscriptions: Map<string, (data: { shortcut: unknown }) => void> = new Map();
    private _connectPromise: Promise<this> | undefined = undefined;
    private _requestQueue: QueuedRequest[] = [];
    private _activeRequest: QueuedRequest | null = null;

    constructor(options: RPCClientOptions = { transport: "ipc" }) {
        super();

        this.options = options;

        const Transport = transports[options.transport];
        if (!Transport) {
            throw new TypeError(`RPC_INVALID_TRANSPORT: ${options.transport}`);
        }

        this.transport = new (Transport as any)(this) as TransportInstance;
        this.transport.on("message", this._onRpcMessage.bind(this));

        this.fetch = ((method: string, path: string, { data, query } = {}) =>
            fetch(`${this.fetch.endpoint}${path}${query ? new URLSearchParams(query) : ""}`, {
                method,
                body: data ? JSON.stringify(data) : undefined,
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json",
                },
            }).then(async (r) => {
                const body = await r.json();
                if (!r.ok) {
                    const e = new Error(`${r.status}`);
                    (e as any).body = body;
                    throw e;
                }
                return body;
            })) as FetchFunction;

        this.fetch.endpoint = "https://discord.com/api";
    }

    connect(clientId: string): Promise<this> {
        if (this._connectPromise) {
            return this._connectPromise;
        }
        this._connectPromise = new Promise((resolve, reject) => {
            this.clientId = clientId;
            const timeout = setTimeout(() => {
                this._connectPromise = undefined;
                this.transport.close().catch(() => {});
                reject(new Error("RPC_CONNECTION_TIMEOUT"));
            }, 10e3);
            timeout.unref();
            this.once("connected", () => {
                clearTimeout(timeout);
                resolve(this);
            });
            this.transport.once("close", () => {
                this.rejectPendingRequests(new Error("connection closed"));
                this._connectPromise = undefined;
                this.emit("disconnected");
                reject(new Error("connection closed"));
            });
            this.transport.connect().catch((error) => {
                this._connectPromise = undefined;
                reject(error);
            });
        });
        return this._connectPromise;
    }

    async login(options: RPCLoginOptions = {}): Promise<this> {
        let { clientId, accessToken } = options;
        await this.connect(clientId!);
        if (!options.scopes) {
            this.emit("ready");
            return this;
        }
        if (!accessToken) {
            accessToken = (await this.authorize()) as string;
        }
        return this.authenticate(accessToken);
    }

    request(cmd: string, args?: unknown, evt?: string, options?: { timeout?: number; retries?: number }): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const nonce = uuid();
            this._requestQueue.push({
                cmd, args, evt, nonce,
                retriesLeft: options?.retries ?? RPC_REQUEST_RETRY_COUNT,
                timeout: options?.timeout ?? RPC_REQUEST_TIMEOUT_MS,
                resolve, reject,
            });
            this.pumpRequestQueue();
        });
    }

    private pumpRequestQueue(): void {
        if (this._activeRequest || this._requestQueue.length === 0) return;
        const request = this._requestQueue.shift()!;
        this._activeRequest = request;

        const finish = () => {
            const entry = this._expecting.get(request.nonce);
            if (entry?.timeout) clearTimeout(entry.timeout);
            this._expecting.delete(request.nonce);
            if (this._activeRequest?.nonce === request.nonce) this._activeRequest = null;
            this.pumpRequestQueue();
        };

        const timeout = setTimeout(() => {
            const error = new Error(`RPC request timed out after ${request.timeout}ms: ${request.cmd}${request.evt ? `/${request.evt}` : ""}`);
            this.failRequest(request, error);
        }, request.timeout);
        timeout.unref?.();

        this._expecting.set(request.nonce, { resolve: request.resolve, reject: request.reject, timeout, finish });
        try {
            this.transport.send({ cmd: request.cmd, args: request.args, evt: request.evt, nonce: request.nonce });
        } catch (error: any) {
            this.failRequest(request, error instanceof Error ? error : new Error(String(error)));
        }
    }

    private failRequest(request: QueuedRequest, error: Error): void {
        const entry = this._expecting.get(request.nonce);
        if (entry?.timeout) clearTimeout(entry.timeout);
        this._expecting.delete(request.nonce);
        if (this._activeRequest?.nonce === request.nonce) this._activeRequest = null;

        if (request.retriesLeft > 0) {
            request.retriesLeft--;
            request.nonce = uuid();
            this._requestQueue.unshift(request);
        } else {
            request.reject(error);
        }
        this.pumpRequestQueue();
    }

    private rejectPendingRequests(error: Error): void {
        const expecting = Array.from(this._expecting.values());
        this._expecting.clear();
        this._activeRequest = null;
        const queued = this._requestQueue.splice(0);

        expecting.forEach((entry) => {
            if (entry.timeout) clearTimeout(entry.timeout);
            entry.reject(error);
        });
        queued.forEach((request) => request.reject(error));
    }

    private _onRpcMessage(message: RPCMessage): void {
        if (message.cmd === RPCCommands.DISPATCH && message.evt === RPCEvents.READY) {
            if (message.data.user) {
                this.user = message.data.user;
            }
            this.emit("connected");
        } else if (this._expecting.has(message.nonce)) {
            const entry = this._expecting.get(message.nonce)!;
            const { resolve, reject } = entry;
            if (message.evt === "ERROR") {
                const e = new Error(message.data.message!);
                (e as any).code = message.data.code;
                (e as any).data = message.data;
                reject(e);
            } else {
                resolve(message.data);
            }
            entry.finish();
        } else if (message.nonce) {
            return;
        } else {
            this.emit(message.evt, message.data);
        }
    }

    private async authorize(): Promise<unknown> {
        return await this.request("AUTHORIZE", {
            scopes: ["identify", "rpc", "rpc.voice.read", "rpc.notifications.read", "messages.read", "rpc.voice.write"],
            client_id: this.clientId,
        });
    }

    private authenticate(accessToken: string): Promise<this> {
        return this.request("AUTHENTICATE", { access_token: accessToken }).then((result) => {
            const { application, user } = result as { application: ClientApplication; user: User };
            this.accessToken = accessToken;
            this.application = application;
            this.user = user;
            this.emit("ready");
            return this;
        });
    }

    getGuild(id: string, timeout?: number): Promise<Guild> {
        return this.request(RPCCommands.GET_GUILD, { guild_id: id, timeout }) as Promise<Guild>;
    }

    getImage(id: string): Promise<unknown> {
        return this.request(RPCCommands.GET_IMAGE, { type: "user", id, format: "png", size: 128 });
    }

    DEEP_LINK(data: unknown): Promise<unknown> {
        return this.request("DEEP_LINK", data);
    }

    NETWORKING_CREATE_TOKEN(): Promise<unknown> {
        return this.request("NETWORKING_CREATE_TOKEN");
    }

    GET_PROVIDER_ACCESS_TOKEN(): Promise<unknown> {
        return this.request("GET_PROVIDER_ACCESS_TOKEN");
    }

    TOGGLE_SCREENSHARE(): Promise<unknown> {
        return this.request("TOGGLE_SCREENSHARE");
    }

    TOGGLE_VIDEO(): Promise<unknown> {
        return this.request("TOGGLE_VIDEO");
    }

    PUSH_TO_TALK(active: boolean): Promise<unknown> {
        return this.request(RPCCommands.PUSH_TO_TALK, { active });
    }

    getGuilds(timeout?: number): Promise<unknown> {
        return this.request(RPCCommands.GET_GUILDS, { timeout });
    }

    getChannel(id: string, timeout?: number): Promise<Channel> {
        return this.request(RPCCommands.GET_CHANNEL, { channel_id: id, timeout }) as Promise<Channel>;
    }

    async getChannels(id?: string, timeout?: number): Promise<Channel[]> {
        const { channels } = (await this.request(RPCCommands.GET_CHANNELS, {
            timeout,
            guild_id: id,
        })) as { channels: Channel[] };
        return channels;
    }

    setCertifiedDevices(devices: CertifiedDevice[]): Promise<unknown> {
        return this.request(RPCCommands.SET_CERTIFIED_DEVICES, {
            devices: devices.map((d) => ({
                type: d.type,
                id: d.uuid,
                vendor: d.vendor,
                model: d.model,
                related: d.related,
                echo_cancellation: d.echoCancellation,
                noise_suppression: d.noiseSuppression,
                automatic_gain_control: d.automaticGainControl,
                hardware_mute: d.hardwareMute,
            })),
        });
    }

    setUserVoiceSettings(id: string, settings: UserVoiceSettings): Promise<unknown> {
        return this.request(RPCCommands.SET_USER_VOICE_SETTINGS, {
            user_id: id,
            pan: settings.pan,
            mute: settings.mute,
            volume: settings.volume,
        });
    }

    selectVoiceChannel(id: string, { timeout, force = false }: { timeout?: number; force?: boolean } = {}): Promise<unknown> {
        return this.request(RPCCommands.SELECT_VOICE_CHANNEL, { channel_id: id, timeout, force });
    }

    GET_SOUNDBOARD_SOUNDS(): Promise<unknown> {
        return this.request(RPCCommands.GET_SOUNDBOARD_SOUNDS);
    }

    PLAY_SOUNDBOARD_SOUND(data: unknown): Promise<unknown> {
        return this.request(RPCCommands.PLAY_SOUNDBOARD_SOUND, data);
    }

    GET_SELECTED_VOICE_CHANNEL(): Promise<unknown> {
        return this.request(RPCCommands.GET_SELECTED_VOICE_CHANNEL);
    }

    selectTextChannel(id: string, { timeout }: { timeout?: number } = {}): Promise<unknown> {
        return this.request(RPCCommands.SELECT_TEXT_CHANNEL, { channel_id: id, timeout });
    }

    getVoiceSettings(): Promise<VoiceSettings> {
        return this.request(RPCCommands.GET_VOICE_SETTINGS).then((s) => {
            const settings = s as Record<string, any>;
            return {
                automaticGainControl: settings.automatic_gain_control,
                echoCancellation: settings.echo_cancellation,
                noiseSuppression: settings.noise_suppression,
                qos: settings.qos,
                silenceWarning: settings.silence_warning,
                deaf: settings.deaf,
                mute: settings.mute,
                input: {
                    availableDevices: settings.input.available_devices,
                    device: settings.input.device_id,
                    volume: settings.input.volume,
                },
                output: {
                    availableDevices: settings.output.available_devices,
                    device: settings.output.device_id,
                    volume: settings.output.volume,
                },
                mode: {
                    type: settings.mode.type,
                    autoThreshold: settings.mode.auto_threshold,
                    threshold: settings.mode.threshold,
                    shortcut: settings.mode.shortcut,
                    delay: settings.mode.delay,
                },
            };
        });
    }

    setVoiceSettings(args: SetVoiceSettingsArgs): Promise<unknown> {
        return this.request(RPCCommands.SET_VOICE_SETTINGS, {
            automatic_gain_control: args.automaticGainControl,
            echo_cancellation: args.echoCancellation,
            noise_suppression: args.noiseSuppression,
            qos: args.qos,
            silence_warning: args.silenceWarning,
            deaf: args.deaf,
            mute: args.mute,
            input: args.input
                ? {
                      device_id: args.input.device,
                      volume: args.input.volume,
                  }
                : undefined,
            output: args.output
                ? {
                      device_id: args.output.device,
                      volume: args.output.volume,
                  }
                : undefined,
            mode: args.mode
                ? {
                      type: args.mode.type,
                      auto_threshold: args.mode.autoThreshold,
                      threshold: args.mode.threshold,
                      shortcut: args.mode.shortcut,
                      delay: args.mode.delay,
                  }
                : undefined,
        });
    }

    captureShortcut(callback: (shortcut: unknown, stop: () => Promise<unknown>) => void): Promise<() => Promise<unknown>> {
        const subid = subKey(RPCEvents.CAPTURE_SHORTCUT_CHANGE, callback);
        const stop = (): Promise<unknown> => {
            this._subscriptions.delete(subid);
            return this.request(RPCCommands.CAPTURE_SHORTCUT, { action: "STOP" });
        };
        this._subscriptions.set(subid, ({ shortcut }) => {
            callback(shortcut, stop);
        });
        return this.request(RPCCommands.CAPTURE_SHORTCUT, { action: "START" }).then(() => stop);
    }

    setActivity(args: SetActivityArgs = {}, pid: number = getPid()!): Promise<unknown> {
        let timestamps: { start?: number; end?: number } | undefined;
        let assets:
            | {
                  large_image?: string;
                  large_text?: string;
                  small_image?: string;
                  small_text?: string;
              }
            | undefined;
        let party: { id?: string; size?: [number, number] } | undefined;
        let secrets: { match?: string; join?: string; spectate?: string } | undefined;

        if (args.startTimestamp || args.endTimestamp) {
            timestamps = {
                start: args.startTimestamp ? (typeof args.startTimestamp === "number" ? args.startTimestamp : undefined) : undefined,
                end: args.endTimestamp ? (typeof args.endTimestamp === "number" ? args.endTimestamp : undefined) : undefined,
            };
            if (args.startTimestamp instanceof Date) {
                timestamps.start = Math.round(args.startTimestamp.getTime());
            }
            if (args.endTimestamp instanceof Date) {
                timestamps.end = Math.round(args.endTimestamp.getTime());
            }
            if (timestamps.start && timestamps.start > 2147483647000) {
                throw new RangeError("timestamps.start must fit into a unix timestamp");
            }
            if (timestamps.end && timestamps.end > 2147483647000) {
                throw new RangeError("timestamps.end must fit into a unix timestamp");
            }
        }
        if (args.largeImageKey || args.largeImageText || args.smallImageKey || args.smallImageText) {
            assets = {
                large_image: args.largeImageKey,
                large_text: args.largeImageText,
                small_image: args.smallImageKey,
                small_text: args.smallImageText,
            };
        }
        if (args.partySize || args.partyId || args.partyMax) {
            party = { id: args.partyId };
            if (args.partySize || args.partyMax) {
                party.size = [args.partySize!, args.partyMax!];
            }
        }
        if (args.matchSecret || args.joinSecret || args.spectateSecret) {
            secrets = {
                match: args.matchSecret,
                join: args.joinSecret,
                spectate: args.spectateSecret,
            };
        }

        return this.request(RPCCommands.SET_ACTIVITY, {
            pid,
            activity: {
                state: args.state,
                details: args.details,
                timestamps,
                assets,
                party,
                secrets,
                buttons: args.buttons,
                instance: !!args.instance,
            },
        });
    }

    clearActivity(pid: number = getPid()!): Promise<unknown> {
        return this.request(RPCCommands.SET_ACTIVITY, {
            pid,
        });
    }

    sendJoinInvite(user: User | string): Promise<unknown> {
        return this.request(RPCCommands.SEND_ACTIVITY_JOIN_INVITE, {
            user_id: typeof user === "string" ? user : user.id,
        });
    }

    sendJoinRequest(user: User | string): Promise<unknown> {
        return this.request(RPCCommands.SEND_ACTIVITY_JOIN_REQUEST, {
            user_id: typeof user === "string" ? user : user.id,
        });
    }

    closeJoinRequest(user: User | string): Promise<unknown> {
        return this.request(RPCCommands.CLOSE_ACTIVITY_JOIN_REQUEST, {
            user_id: typeof user === "string" ? user : user.id,
        });
    }

    createLobby(type: number, capacity: number, metadata: unknown): Promise<unknown> {
        return this.request(RPCCommands.CREATE_LOBBY, {
            type,
            capacity,
            metadata,
        });
    }

    updateLobby(lobby: { id: string }, { type, owner, capacity, metadata }: { type?: number; owner?: { id: string }; capacity?: number; metadata?: unknown } = {}): Promise<unknown> {
        return this.request(RPCCommands.UPDATE_LOBBY, {
            id: lobby.id,
            type,
            owner_id: (owner && owner.id) || owner,
            capacity,
            metadata,
        });
    }

    deleteLobby(lobby: { id: string }): Promise<unknown> {
        return this.request(RPCCommands.DELETE_LOBBY, {
            id: lobby.id,
        });
    }

    connectToLobby(id: string, secret: string): Promise<unknown> {
        return this.request(RPCCommands.CONNECT_TO_LOBBY, {
            id,
            secret,
        });
    }

    sendToLobby(lobby: { id: string }, data: unknown): Promise<unknown> {
        return this.request(RPCCommands.SEND_TO_LOBBY, {
            id: lobby.id,
            data,
        });
    }

    disconnectFromLobby(lobby: { id: string }): Promise<unknown> {
        return this.request(RPCCommands.DISCONNECT_FROM_LOBBY, {
            id: lobby.id,
        });
    }

    updateLobbyMember(lobby: { id: string }, user: { id: string }, metadata: unknown): Promise<unknown> {
        return this.request(RPCCommands.UPDATE_LOBBY_MEMBER, {
            lobby_id: lobby.id,
            user_id: user.id,
            metadata,
        });
    }

    getRelationships(): Promise<unknown> {
        const types = Object.keys(RelationshipTypes);
        return this.request(RPCCommands.GET_RELATIONSHIPS).then((o) => {
            const obj = o as { relationships: Array<{ type: number; [key: string]: unknown }> };
            return obj.relationships.map((r) => ({
                ...r,
                type: types[r.type],
            }));
        });
    }

    async subscribe(event: string, args: unknown): Promise<{ unsubscribe: () => Promise<unknown> }> {
        await this.request(RPCCommands.SUBSCRIBE, args, event);
        return {
            unsubscribe: () => this.request(RPCCommands.UNSUBSCRIBE, args, event),
        };
    }

    async destroy(): Promise<void> {
        this.rejectPendingRequests(new Error("client destroyed"));
        this._connectPromise = undefined;
        await this.transport.close();
    }
}

export default RPCClient;
