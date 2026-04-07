import { log } from "./utils/log.mjs";
import { eventEmitter } from "./utils/plugin.mjs";
import GlobalListener from "./GlobalListener.mjs";
import { fetchWithTimeout } from "./utils/utils.mjs";
import express from "express";
import cors from "cors";
import RPC from "discord-rpc";
import state from "./GlobalVar.mjs";
import path from "path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ENDPOINT = "https://discord.com/api/v10";
let refreshState = null;
async function urlAUTH() {
    log.info(`try discord auth`);
    try {
        state.client = new RPC.Client({ transport: "ipc" });
        await state.client.connect(state.plugin.globalSettings.clientId);
        await state.client.DEEP_LINK({
            type: "OAUTH2",
            params: {
                search: `client_id=${state.plugin.globalSettings.clientId}&response_type=token&scope=identify+rpc+rpc.voice.read+rpc.notifications.read+rpc.voice.write+rpc.video.write+rpc.screenshare.write`,
            },
        });
    } catch {
        log.info(`try browser auth`);
        state.plugin.openUrl(
            `https://discord.com/oauth2/authorize?client_id=${state.plugin.globalSettings.clientId}&response_type=token&scope=identify+rpc+rpc.voice.read+rpc.notifications.read+rpc.voice.write+rpc.video.write+rpc.screenshare.write`,
        );
    }
}
function setLoginStateCallback(callback) {
    refreshState = callback;
}
async function getToken(client_id, client_secret) {
    const body = new URLSearchParams({
        grant_type: "client_credentials",
        scope: "identify rpc rpc.voice.read rpc.notifications.read rpc.voice.write rpc.video.write rpc.screenshare.write",
    });
    const basicAuth = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
    const response = await fetchWithTimeout(
        `${API_ENDPOINT}/oauth2/token`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${basicAuth}`,
            },
            body: body,
        },
        5000,
    );
    if (!response.ok) {
        const errorText = await response.text();
        log.error("http error", errorText);
        throw errorText;
    }
    log.info("get token  success");
    return await response.json();
}
function startServer() {
    let id = "";

    const app = express();
    app.use(cors());
    const port = 26432;

    // 启动服务器
    // Start the server
    app.listen(port, () => {
        log.info(`Server is running at http://127.0.0.1:${port}`);
    });

    app.get("/", async (req, res) => {
        log.info("callback");
        const htmlContent = `<!doctype html><html><head><meta charset="UTF-8"/><title>callbackpage</title><style>#box{width:100%;display:flex;justify-content:center}</style></head><body><div id="box"><h2>授权成功(authorizationsuccessful)</h2></div><script type="module">console.log('进入callback');const params=new URLSearchParams(window.location.hash.substring(1));const access_token=params.get('access_token');const token_type=params.get('token_type');const expires_in=params.get('expires_in');const scope=params.get('scope');if(access_token==null){document.querySelector('h2').innerText='授权失败(Authorization failed): '+params.get('error_description')}const data={access_token,token_type,expires_in,scope,};fetch('http://localhost:26432/data',{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify(data),}).then((response)=>{if(!response.ok){throw new Error('HTTP error! status');}return response.json()}).then((result)=>{console.log('服务器返回:',result);window.close()}).catch((error)=>{console.error('请求失败:',error)});</script></body></html>`;

        res.setHeader("Content-Type", "text/html");
        res.send(htmlContent);
    });
    app.post("/data", (req, res) => {
        let data = "";
        req.on("data", (chunk) => {
            data += chunk;
        });
        req.on("end", async () => {
            const parsedData = JSON.parse(data);
            let temp = parsedData;
            temp.clientId = id;
            state.LoginState.clientId = id;
            state.LoginState.accessToken = parsedData.access_token;
            state.plugin.globalSettings.accessToken = parsedData.access_token;
            state.plugin.setGlobalSettings(state.plugin.globalSettings);
            state.plugin.sendToPropertyInspector({ state: 0 });
            login();
        });
        res.json({ msg: "完成" });
    });
    app.use((err, req, res, next) => {
        log.error("Unhandled error:", err);
        res.status(err.status || 500);
        res.send({
            message: err.message,
            error: err,
        });
    });
}
async function refreshToken(allowManualAuth = true) {
    state.client = null;
    state.LoginState.hasLogin = false;
    if (state.plugin.globalSettings.clientId && state.plugin.globalSettings.clientSecret) {
        let temp = "";
        // try {
        //     temp = await getToken(state.plugin.globalSettings.clientId, state.plugin.globalSettings.clientSecret);
        //     //   temp = null;
        // } catch (error) {
        //     log.info("auto get token fail", error);
        //     temp = null;
        // }
        if (!temp) {
            if (allowManualAuth) {
                state.plugin.sendToPropertyInspector({ state: 1 });
                log.info("try url auth");
                urlAUTH();
            } else {
                log.info("auto get token fail");
            }
        } else {
            log.info("get token success");
            state.plugin.sendToPropertyInspector({ state: 0 });
            state.plugin.globalSettings.accessToken = temp.access_token;
            if (state.LoginState.appState == true) {
                login();
            }
        }
    } else {
        log.info("lack clientId or clientSecret");
    }
}
const login = async () => {
    if (state.LoginState.hasLogin) {
        return;
    }
    if (state.LoginState.logining) {
        log.info("is logining");
        return;
    }
    state.LoginState.logining = true;
    try {
        const scopes = ["rpc", "identify", "rpc.voice.read", "messages.read", "rpc.notifications.read", "rpc.voice.write"];
        const accessToken = state.plugin.globalSettings?.accessToken;
        const clientId = state.plugin.globalSettings?.clientId;
        if (clientId && accessToken) {
            log.info("try login");
            try {
                state.client = new RPC.Client({ transport: "ipc" });
                state.client.on("disconnected", () => {
                    state.LoginState.hasLogin = false;
                    state.LoginState.loginState = 0;
                    GlobalListener.removeAll();
                    refreshState();
                    log.info(`WebSocket 连接已关闭`);
                });
                await state.client.login({ clientId, accessToken, scopes }); // 等待登录完成
                state.LoginState.loginState = 1;
                log.info("Logged in successfully!");

                try {
                    state.LoginState.hasLogin = true;
                    state.LoginState.failCount = 0;
                    state.LoginState.refreshTokenCout = 0;
                    refreshState();
                    await eventEmitter.emit("Login");
                } catch (error) {
                    log.error("emit error", error);
                }
            } catch (error) {
                if (error.code === 4009) {
                    log.error("Error code:", error.code || error);
                    // code: 4009, Token does not match current user Invalid token
                    state.LoginState.refreshTokenCout++;
                    log.info("refreshTokenCout:", state.LoginState.refreshTokenCout);
                    if (state.LoginState.refreshTokenCout > 2) {
                        state.plugin.globalSettings.clientId = "";
                        state.plugin.globalSettings.clientSecret = "";
                        state.plugin.globalSettings.accessToken = "";
                        state.plugin.setGlobalSettings(state.plugin.globalSettings);
                        log.info("refreshTokenCout > 2,clear settings");
                    } else {
                        refreshToken(false);
                    }
                } else {
                    log.error("Login failed:", error.code || error);
                }
                state.client = null;
                state.LoginState.loginState = -1;
                state.LoginState.failCount++;
                refreshState();
            }
        }
    } finally {
        state.LoginState.logining = false;
    }
};
// 启动服务器
// Start the server
function initLogin() {
    startServer();
}
function startLoginTimer() {
    clearTimeout(state.LoginState.timer);
    state.LoginState.timer = setInterval(login, 5000);
}
export { refreshToken, setLoginStateCallback, initLogin, startLoginTimer };
