import { Plugin } from "@mirabox/streamdock-sdk/node";
import { runtime } from "./state.js";
import { AuthService } from "./services/AuthService.js";
import { registerActions, setupPluginLifecycle } from "./actions.js";

const plugin = Plugin.getInstance();
runtime.plugin = plugin;

registerActions(plugin);
setupPluginLifecycle(plugin);
// AuthService: 统一认证服务，支持 StreamKit 快速授权 + 手动 OAuth2 配置
AuthService.init();

Plugin.startPlugin();
