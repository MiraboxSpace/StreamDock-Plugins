/**
 * AuthService — 统一的 Discord RPC 授权服务
 *
 * 支持两种认证方式：
 *   1. StreamKit 快速授权（默认）— 借用 Discord 官方 StreamKit client_id 完成 IPC 授权
 *   2. 手动配置 — 用户提供自己的 clientId/clientSecret，走 OAuth2 client_credentials
 *
 * StreamKit 流程:
 *   IPC 握手 → AUTHORIZE → code 交换 → AUTHENTICATE
 *
 * 手动配置流程:
 *   client_credentials grant → client.login()
 */

import { log } from "@mirabox/streamdock-sdk/node";
import express from "express";
import cors from "cors";
import { loginState, runtime } from "../state.js";
import type { DiscordRpcClient } from "../types.js";
import { fetchWithTimeout } from "../utils/http.js";
import { DiscordRpcService } from "./DiscordRpcService.js";
import { GlobalListener } from "./GlobalListener.js";
import { eventBus } from "./EventBus.js";

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const STREAMKIT_CLIENT_ID = "207646673902501888";
const TOKEN_ENDPOINT = "https://streamkit.discord.com/overlay/token";
const API_ENDPOINT = "https://discord.com/api/v10";
const SCOPES_ARR = ["identify", "rpc", "rpc.voice.read", "rpc.notifications.read", "rpc.voice.write", "rpc.video.write", "rpc.screenshare.write", "rpc.video.read", "rpc.screenshare.read"];
const SCOPES_STR = SCOPES_ARR.join(" ");

// ---------------------------------------------------------------------------
// StreamKit Token 类型 & 持久化
// ---------------------------------------------------------------------------

interface StreamKitToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number;
    scope: string;
    saved_at: number;
}

interface TokenExchangeResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

interface AuthorizeOptions {
    silent?: boolean;
}

function loadStreamKitToken(): StreamKitToken | null {
    try {
        const raw = runtime.plugin?.globalSettings?.streamKitToken;
        if (!raw || typeof raw !== "string") return null;
        const token: StreamKitToken = JSON.parse(raw);
        return token.access_token ? token : null;
    } catch {
        return null;
    }
}

function saveStreamKitToken(token: StreamKitToken): void {
    if (!runtime.plugin) return;
    runtime.plugin.globalSettings.streamKitToken = JSON.stringify(token);
    runtime.plugin.setGlobalSettings(runtime.plugin.globalSettings);
}

function clearStreamKitToken(): void {
    if (!runtime.plugin) return;
    delete runtime.plugin.globalSettings.streamKitToken;
    runtime.plugin.setGlobalSettings(runtime.plugin.globalSettings);
}

function isStreamKitTokenValid(token: StreamKitToken): boolean {
    if (!token?.access_token) return false;
    const exp = token.expires_at > 0 ? token.expires_at : token.saved_at + token.expires_in * 1000;
    return Date.now() < exp;
}

// ---------------------------------------------------------------------------
// StreamKit: code → token 交换
// ---------------------------------------------------------------------------

async function exchangeCode(code: string): Promise<TokenExchangeResponse> {
    const response = await fetchWithTimeout(TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }, 10_000);
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Token exchange failed: HTTP ${response.status} — ${text}`);
    }
    const data: any = await response.json();
    if (!data?.access_token) throw new Error("Token exchange response missing access_token");
    return data as TokenExchangeResponse;
}

function enrichToken(raw: TokenExchangeResponse): StreamKitToken {
    const now = Date.now();
    return {
        access_token: raw.access_token,
        token_type: raw.token_type || "Bearer",
        expires_in: raw.expires_in || 604800,
        scope: raw.scope || SCOPES_STR,
        saved_at: now,
        expires_at: now + (raw.expires_in || 604800) * 1000,
    };
}

// ---------------------------------------------------------------------------
// AuthService
// ---------------------------------------------------------------------------

export class AuthService {
    private static refreshCallback: (() => void) | null = null;
    private static serverStarted = false;
    private static preConnectPromise: Promise<DiscordRpcClient | null> | null = null;
    private static reconnectTimer: NodeJS.Timeout | null = null;
    private static reconnectAttempts = 0;

    // ---- 回调 ---------------------------------------------------------------

    static setRefreshCallback(cb: () => void): void {
        this.refreshCallback = cb;
    }

    // ---- 预连接（StreamKit 模式，固定 clientId 可提前握手）--------------------

    /** 提前建立 IPC 连接，让后续授权免去握手等待 */
    static async preConnect(): Promise<void> {
        if (DiscordRpcService.client || this.preConnectPromise) return;
        this.preConnectPromise = this.createPreConnectClient();
        await this.preConnectPromise;
    }

    static startReconnectLoop(reason: string, intervalMs = 2000, maxAttempts = 90): void {
        if (this.reconnectTimer || loginState.hasLogin) return;
        this.reconnectAttempts = 0;
        log.info(`AuthService: reconnect loop started (${reason})`);

        const tick = async () => {
            if (!loginState.appState || loginState.hasLogin) {
                this.stopReconnectLoop();
                return;
            }
            if (loginState.logining || this.preConnectPromise) return;
            this.reconnectAttempts++;

            try {
                await this.tryReconnectOnce();
            } catch (error: any) {
                log.info("AuthService: reconnect attempt failed", { attempt: this.reconnectAttempts, reason, error: error?.message ?? error });
            }

            if (loginState.hasLogin || this.reconnectAttempts >= maxAttempts) {
                this.stopReconnectLoop();
            }
        };

        this.reconnectTimer = setInterval(() => void tick(), intervalMs);
        void tick();
    }

    static stopReconnectLoop(): void {
        if (this.reconnectTimer) clearInterval(this.reconnectTimer);
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
    }

    private static async tryReconnectOnce(): Promise<void> {
        const settings = runtime.plugin?.globalSettings || {};
        const method = (settings.authMethod as string) || "streamkit";
        if (method === "streamkit") {
            if (settings.streamKitToken) await this.authorize("streamkit", { silent: true });
            else await this.preConnect();
            return;
        }
        if (settings.clientId && settings.accessToken) {
            await this.manualLogin(settings.clientId as string, settings.accessToken as string, false, true);
        } else if (settings.clientId && settings.clientSecret) {
            await this.manualRefreshToken(false, false, true);
        }
    }

    // ---- 共享登录成功处理 ----------------------------------------------------

    private static async onLoginSuccess(client: DiscordRpcClient): Promise<void> {
        this.stopReconnectLoop();
        if (DiscordRpcService.client !== client) {
            await this.destroyClient(DiscordRpcService.client);
            DiscordRpcService.client = client;
        }
        loginState.hasLogin = true;
        loginState.loginState = 1;
        loginState.failCount = 0;
        this.refreshCallback?.();
        await GlobalListener.stop();
        await GlobalListener.start();
        eventBus.emit("Login");
    }

    // ---- 共享断开处理 --------------------------------------------------------

    private static setupDisconnectHandler(client: DiscordRpcClient): void {
        client.removeAllListeners("disconnected");
        client.on("disconnected", () => {
            if (DiscordRpcService.client !== client) return;
            loginState.hasLogin = false;
            loginState.loginState = 0;
            DiscordRpcService.client = null;
            GlobalListener.removeAll();
            this.refreshCallback?.();
            log.info("AuthService: disconnected");
            this.startReconnectLoop("rpc disconnected");
        });
    }

    private static async destroyClient(client: DiscordRpcClient | null | undefined): Promise<void> {
        if (!client) return;
        try {
            await client.destroy?.();
        } catch (error) {
            log.info("AuthService: destroy client failed", error);
        }
    }

    static handleDiscordTerminated(): void {
        this.stopReconnectLoop();
        void this.destroyClient(DiscordRpcService.client);
        DiscordRpcService.client = null;
        loginState.hasLogin = false;
        loginState.loginState = 0;
        GlobalListener.removeAll();
        this.refreshCallback?.();
    }

    private static async createPreConnectClient(): Promise<DiscordRpcClient | null> {
        const client = DiscordRpcService.createClient();
        DiscordRpcService.client = client;
        try {
            await client.connect(STREAMKIT_CLIENT_ID);
            client.on("disconnected", () => {
                if (DiscordRpcService.client === client) DiscordRpcService.client = null;
            });
            log.info("AuthService: IPC pre-connected");
            return client;
        } catch {
            if (DiscordRpcService.client === client) DiscordRpcService.client = null;
            await this.destroyClient(client);
            log.info("AuthService: pre-connect failed, will connect on demand");
            return null;
        } finally {
            this.preConnectPromise = null;
        }
    }

    // ---- StreamKit: 确保 IPC 已连接 ------------------------------------------

    private static async ensureConnected(): Promise<DiscordRpcClient> {
        if (this.preConnectPromise) {
            const preConnected = await this.preConnectPromise;
            if (preConnected && DiscordRpcService.client === preConnected) return preConnected;
        }
        const existing = DiscordRpcService.client;
        if (existing?.clientId === STREAMKIT_CLIENT_ID) return existing;
        if (existing) await this.destroyClient(existing);
        const client = DiscordRpcService.createClient();
        DiscordRpcService.client = client;
        try {
            await client.connect(STREAMKIT_CLIENT_ID);
            log.info("AuthService: IPC connected");
            return client;
        } catch (error) {
            if (DiscordRpcService.client === client) DiscordRpcService.client = null;
            await this.destroyClient(client);
            throw error;
        }
    }

    // ---- 统一授权入口 --------------------------------------------------------

    /** 根据 authMethod 执行授权，由 didReceiveGlobalSettings 调度 */
    static async authorize(method: string, options: AuthorizeOptions = {}): Promise<void> {
        if (loginState.logining) {
            log.info("AuthService: already authorizing, skip");
            return;
        }
        loginState.logining = true;

        try {
            if (method === "manual") {
                await this.authorizeManual();
            } else {
                await this.authorizeStreamKit();
            }
            runtime.plugin?.sendToPropertyInspector({ state: 0 });
        } catch (err: any) {
            if (options.silent) {
                log.info("AuthService: silent authorization failed:", err?.message ?? err);
                loginState.hasLogin = false;
                throw err;
            }
            log.error("AuthService: authorization failed:", err?.message ?? err);
            loginState.hasLogin = false;
            loginState.loginState = -1;
            loginState.failCount++;
            this.refreshCallback?.();
            runtime.plugin?.sendToPropertyInspector({ state: 1 });
            throw err;
        } finally {
            loginState.logining = false;
        }
    }

    // ---- StreamKit 授权 -----------------------------------------------------

    private static async authorizeStreamKit(): Promise<void> {
        const cached = loadStreamKitToken();
        if (cached && isStreamKitTokenValid(cached)) {
            log.info("AuthService: StreamKit cached token valid, authenticating...");
            await this.streamKitAuthenticate(cached.access_token);
            return;
        }
        if (cached) {
            log.info("AuthService: StreamKit token expired, full re-authorization");
        }

        await this.streamKitFullAuthorize();
    }

    private static async streamKitFullAuthorize(): Promise<void> {
        const client = await this.ensureConnected();
        this.setupDisconnectHandler(client);

        const authResult = await client.request("AUTHORIZE", { client_id: STREAMKIT_CLIENT_ID, scopes: SCOPES_ARR, prompt: "none" }, undefined, { timeout: 60_000, retries: 0 });
        const code = (authResult as any)?.code;
        if (!code) throw new Error("AUTHORIZE did not return a code");
        log.info("AuthService: authorization code received");

        const tokenData = await exchangeCode(code);
        const token = enrichToken(tokenData);
        log.info("AuthService: token exchanged, expires at", new Date(token.expires_at).toISOString());

        await client.request("AUTHENTICATE", { access_token: token.access_token });
        client.accessToken = token.access_token;
        saveStreamKitToken(token);
        await this.onLoginSuccess(client);
        log.info("AuthService: StreamKit authenticated");
    }

    private static async streamKitAuthenticate(accessToken: string): Promise<void> {
        const client = await this.ensureConnected();
        this.setupDisconnectHandler(client);
        await client.request("AUTHENTICATE", { access_token: accessToken });
        client.accessToken = accessToken;
        await this.onLoginSuccess(client);
        log.info("AuthService: StreamKit authenticated (cached token)");
    }

    // ---- 手动 OAuth2 授权 ---------------------------------------------------

    private static async authorizeManual(): Promise<void> {
        const settings = runtime.plugin?.globalSettings || {};
        const clientId = settings.clientId as string;
        const accessToken = settings.accessToken as string;

        if (clientId && accessToken) {
            await this.manualLogin(clientId, accessToken, true);
            return;
        }
        await this.manualRefreshToken(true, true);
    }

    static async manualRefreshToken(allowManualAuth = true, ignoreLoginLock = false, silent = false): Promise<void> {
        await this.destroyClient(DiscordRpcService.client);
        DiscordRpcService.client = null;
        loginState.hasLogin = false;
        const settings = runtime.plugin?.globalSettings || {};
        const clientId = settings.clientId as string;
        const clientSecret = settings.clientSecret as string;

        if (!clientId) {
            log.info("AuthService: lack clientId");
            return;
        }
        if (clientSecret) {
            try {
                const token = await this.getClientCredentialsToken(clientId, clientSecret);
                runtime.plugin!.globalSettings.accessToken = token.access_token;
                runtime.plugin!.setGlobalSettings(runtime.plugin!.globalSettings);
                runtime.plugin!.sendToPropertyInspector({ state: 0 });
                if (loginState.appState) await this.manualLogin(clientId, token.access_token, ignoreLoginLock, silent);
                return;
            } catch (error) {
                log.info("AuthService: auto get token fail", error);
            }
        }
        if (allowManualAuth) {
            runtime.plugin?.sendToPropertyInspector({ state: 1 });
            await this.openManualAuth(clientId);
        }
    }

    static async manualLogin(clientId: string, accessToken: string, ignoreLoginLock = false, silent = false): Promise<void> {
        if (loginState.hasLogin || (!ignoreLoginLock && loginState.logining)) return;
        const ownsLoginLock = !loginState.logining;
        if (ownsLoginLock) loginState.logining = true;
        try {
            if (!clientId || !accessToken) return;
            await this.destroyClient(DiscordRpcService.client);
            const client = DiscordRpcService.createClient();
            DiscordRpcService.client = client;
            this.setupDisconnectHandler(client);

            await client.login({
                clientId,
                accessToken,
                scopes: ["rpc", "identify", "rpc.voice.read", "messages.read", "rpc.notifications.read", "rpc.voice.write"],
            });
            loginState.refreshTokenCount = 0;
            await this.onLoginSuccess(client);
            log.info("AuthService: manual login succeeded");
        } catch (error: any) {
            if (silent) log.info("AuthService: silent manual login failed:", error?.code || error?.message || error);
            else log.error("AuthService: manual login failed:", error?.code || error);
            await this.destroyClient(DiscordRpcService.client);
            DiscordRpcService.client = null;
            if (!silent) {
                loginState.loginState = -1;
                loginState.failCount++;
                this.refreshCallback?.();
            }
            if (error?.code === 4009) {
                if (silent) {
                    return;
                }
                loginState.refreshTokenCount++;
                if (loginState.refreshTokenCount > 2 && runtime.plugin) {
                    runtime.plugin.globalSettings.clientId = "";
                    runtime.plugin.globalSettings.clientSecret = "";
                    runtime.plugin.globalSettings.accessToken = "";
                    runtime.plugin.setGlobalSettings(runtime.plugin.globalSettings);
                } else {
                    void this.manualRefreshToken(false, ignoreLoginLock, silent);
                }
            }
        } finally {
            if (ownsLoginLock) loginState.logining = false;
        }
    }

    // ---- 登出 ---------------------------------------------------------------

    static logout(): void {
        clearStreamKitToken();
        if (runtime.plugin) {
            runtime.plugin.globalSettings.clientId = "";
            runtime.plugin.globalSettings.clientSecret = "";
            runtime.plugin.globalSettings.accessToken = "";
            runtime.plugin.setGlobalSettings(runtime.plugin.globalSettings);
        }
        void this.destroyClient(DiscordRpcService.client);
        DiscordRpcService.client = null;
        loginState.hasLogin = false;
        loginState.loginState = 0;
        GlobalListener.removeAll();
        this.refreshCallback?.();
        log.info("AuthService: logged out");
    }

    // ---- 维护 ---------------------------------------------------------------

    static async maintain(): Promise<void> {
        const token = loadStreamKitToken();
        if (!token) return;
        if (!isStreamKitTokenValid(token)) {
            log.info("AuthService: StreamKit token expired, re-authorizing");
            clearStreamKitToken();
            loginState.hasLogin = false;
            loginState.loginState = 0;
            this.refreshCallback?.();
            this.authorize("streamkit").catch(() => {});
        }
    }

    static startMaintenance(intervalMs = 30_000): NodeJS.Timeout {
        return setInterval(() => {
            this.maintain().catch(() => {});
        }, intervalMs);
    }

    // ---- Express 回调服务器（手动模式）----------------------------------------

    static init(): void {
        if (this.serverStarted) return;
        this.serverStarted = true;
        const app = express();
        app.use(cors());
        app.use(express.json());

        app.get("/", (_req, res) => {
            res.setHeader("Content-Type", "text/html");
            res.send(
                `<!doctype html><html><head><meta charset="UTF-8"/><title>callbackpage</title></head><body><h2>授权成功(authorizationsuccessful)</h2><script type="module">const params=new URLSearchParams(window.location.hash.substring(1));const data={access_token:params.get('access_token'),token_type:params.get('token_type'),expires_in:params.get('expires_in'),scope:params.get('scope')};fetch('http://localhost:26432/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(()=>window.close()).catch(console.error);</script></body></html>`,
            );
        });

        app.post("/data", (req, res) => {
            const accessToken = req.body?.access_token;
            if (accessToken && runtime.plugin) {
                runtime.plugin.globalSettings.accessToken = accessToken;
                runtime.plugin.setGlobalSettings(runtime.plugin.globalSettings);
                runtime.plugin.sendToPropertyInspector({ state: 0 });
                void this.manualLogin(runtime.plugin.globalSettings.clientId as string, accessToken);
            }
            res.json({ msg: "完成" });
        });

        app.listen(26432, () => log.info("Auth callback server is running at http://127.0.0.1:26432"));
    }

    // ---- 手动授权辅助方法 ----------------------------------------------------

    private static async openManualAuth(clientId: string): Promise<void> {
        let client: DiscordRpcClient | null = null;
        try {
            client = DiscordRpcService.createClient();
            await client.connect(clientId);
            await client.DEEP_LINK({
                type: "OAUTH2",
                params: {
                    search: `client_id=${clientId}&response_type=token&scope=${SCOPES_STR.replace(/ /g, "+")}`,
                },
            });
        } catch {
            runtime.plugin?.openUrl(`https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=token&scope=${SCOPES_STR.replace(/ /g, "+")}`);
        } finally {
            await this.destroyClient(client);
        }
    }

    private static async getClientCredentialsToken(clientId: string, clientSecret: string): Promise<any> {
        const body = new URLSearchParams({ grant_type: "client_credentials", scope: SCOPES_STR });
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const response = await fetchWithTimeout(
            `${API_ENDPOINT}/oauth2/token`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${basicAuth}`,
                },
                body,
            },
            5000,
        );
        if (!response.ok) throw await response.text();
        return response.json();
    }
}
