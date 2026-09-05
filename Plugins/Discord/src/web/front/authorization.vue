<script setup lang="ts">
    import { computed, onUnmounted, ref } from "vue";
    import { Property } from "@mirabox/streamdock-sdk/property";

    const property = Property.getReactiveInstance();
    const i18n = Property.getI18n();
    const saving = ref(false);
    const status = ref<"form" | "manual" | "success" | "connecting">("form");
    const countdown = ref(5);
    const activeTab = ref<"streamkit" | "manual">("streamkit");
    const clientId = ref(String(property.globalSettings.clientId || ""));
    const clientSecret = ref(String(property.globalSettings.clientSecret || ""));
    let countdownTimer: number | undefined;

    const canAuthorize = computed(() => Boolean(clientId.value.trim() && clientSecret.value.trim()));
    const previousSendToPropertyInspector = property.sendToPropertyInspector;

    property.sendToPropertyInspector = (data: any) => {
        previousSendToPropertyInspector?.(data);
        if (data?.payload?.state === 0) {
            showSuccess();
        } else if (data?.payload?.state === 1) {
            if (activeTab.value === "streamkit") {
                saving.value = false;
                status.value = "form";
            } else {
                showManualAuthorization();
            }
        }
    };

    // ---- StreamKit 快速授权 ----
    function connectWithStreamKit() {
        saving.value = true;
        status.value = "connecting";
        property.setGlobalSettings({ ...property.globalSettings, authMethod: "streamkit", _triggerAuth: true });
    }

    // ---- 手动授权 ----
    function authorize() {
        if (!canAuthorize.value) return;
        saving.value = true;
        status.value = "form";
        property.setGlobalSettings({
            ...property.globalSettings,
            authMethod: "manual",
            clientId: clientId.value.trim(),
            clientSecret: clientSecret.value.trim(),
            _triggerAuth: true,
        });
        property.sendToPlugin({
            __authDebug: "authorizeClicked",
            hasClientId: Boolean(clientId.value.trim()),
            clientIdLength: clientId.value.trim().length,
            hasClientSecret: Boolean(clientSecret.value.trim()),
            clientSecretLength: clientSecret.value.trim().length,
        });
    }

    function showManualAuthorization() {
        saving.value = false;
        status.value = "manual";
    }

    function showSuccess() {
        saving.value = false;
        status.value = "success";
        countdown.value = 5;
        if (countdownTimer) window.clearInterval(countdownTimer);
        countdownTimer = window.setInterval(() => {
            countdown.value -= 1;
            if (countdown.value <= 0) {
                closeWindow();
            }
        }, 1000);
    }

    function closeWindow() {
        if (countdownTimer) window.clearInterval(countdownTimer);
        property.closeSubWindow(property.currentSubWindowId);
    }

    function openDevelopersPage() {
        property.openUrl("https://discord.com/developers/applications");
    }

    function openTutorial() {
        property.openUrl("https://github.com/MiraboxSpace/StreamDock-Plugins/tree/main/Plugins/Discord");
    }

    onUnmounted(() => {
        if (countdownTimer) window.clearInterval(countdownTimer);
        property.sendToPropertyInspector = previousSendToPropertyInspector;
    });
</script>

<template>
    <main class="authorization-page">
        <section class="card">
            <div class="header">
                <div class="shield" :class="{ success: status === 'success', manual: status === 'manual', connecting: status === 'connecting' }">
                    {{ status === "success" ? "✓" : status === "manual" ? "i" : status === "connecting" ? "..." : "D" }}
                </div>
                <h1>
                    {{
                        status === "success"
                            ? i18n["Authorization success"] || "Authorization success"
                            : status === "manual"
                              ? i18n["Information"] || "Information"
                              : i18n["discordauthorization"] || "Discord authorization"
                    }}
                </h1>
            </div>

            <!-- Tab 切换 -->
            <div v-if="status !== 'success'" class="auth-tabs">
                <button class="auth-tab" :class="{ active: activeTab === 'streamkit' }" @click="activeTab = 'streamkit'">
                    {{ i18n["快速授权"] || "Quick Auth" }}
                </button>
                <button class="auth-tab" :class="{ active: activeTab === 'manual' }" @click="activeTab = 'manual'">
                    {{ i18n["手动配置"] || "Manual" }}
                </button>
            </div>

            <!-- StreamKit tab -->
            <div v-if="activeTab === 'streamkit' && status !== 'success'" class="streamkit-panel">
                <p class="streamkit-desc">
                    {{ i18n["使用 Discord 客户端一键授权"] || "One-click authorization via Discord desktop client" }}
                </p>
                <p class="streamkit-hint">
                    {{ i18n["请确保 Discord 桌面客户端正在运行"] || "Please make sure Discord desktop client is running" }}
                </p>
                <button class="authorize-button" type="button" :class="{ loading: saving }" :disabled="saving" @click="connectWithStreamKit">
                    <span v-if="saving" class="spinner"></span>
                    <span>{{ saving ? i18n["等待授权"] || "Waiting for authorization..." : i18n["连接 Discord"] || "Connect to Discord" }}</span>
                </button>
            </div>

            <!-- 手动配置 tab -->
            <form v-if="activeTab === 'manual' && status !== 'success'" @submit.prevent="authorize">
                <label class="field">
                    <span>{{ i18n["获取ID"] || "Get ID" }}</span>
                    <button class="link-button" type="button" @click="openDevelopersPage">{{ i18n["DEV网址"] || "Discord Developer Portal" }}</button>
                </label>

                <label class="field">
                    <span>CLIENT ID</span>
                    <input v-model="clientId" type="text" autocomplete="off" required />
                </label>

                <label class="field">
                    <span>CLIENT SECRET</span>
                    <input v-model="clientSecret" type="password" autocomplete="off" required />
                </label>

                <button class="authorize-button" type="submit" :class="{ loading: saving }" :disabled="!canAuthorize || saving">
                    <span v-if="saving" class="spinner"></span>
                    <span>{{ saving ? i18n["正在授权"] || "Authorizing..." : i18n["请求授权"] || "Authorize" }}</span>
                </button>

                <button class="tutorial-link" type="button" @click="openTutorial">{{ i18n["View the tutorial"] || "View the tutorial" }}</button>
            </form>

            <!-- 手动授权提示 -->
            <div v-if="status === 'manual'" class="result">
                <p>
                    {{
                        i18n["Automatic token acquisition failed, attempting manual authorization, please open Discord for authorization."] ||
                        "Automatic token acquisition failed, attempting manual authorization, please open Discord for authorization."
                    }}
                </p>
                <button class="authorize-button" type="button" @click="closeWindow">{{ i18n["Close window"] || "Close window" }}</button>
            </div>

            <!-- 成功 -->
            <div v-if="status === 'success'" class="result">
                <p>{{ i18n["Authorization completed successfully!"] || "Authorization completed successfully!" }}</p>
                <p class="countdown">{{ i18n["Closing window in"] || "Closing window in" }} {{ countdown }} {{ i18n["seconds"] || "seconds" }}...</p>
                <button class="authorize-button" type="button" @click="closeWindow">{{ i18n["Close window"] || "Close window" }}</button>
            </div>
        </section>
    </main>
</template>

<style scoped>
    .authorization-page {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100vw;
        height: 100vh;
        padding: 22px;
        overflow: hidden;
        background: #2c2f33;
        color: #fff;
        font-family: Arial, sans-serif;
    }
    .card {
        width: min(420px, 100%);
        padding: 26px 28px;
        border-radius: 8px;
        background: #23272a;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.32);
    }
    .header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        margin-bottom: 22px;
        text-align: center;
    }
    .shield {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #7289da;
        color: #fff;
        font-size: 24px;
        font-weight: 800;
    }
    .shield.success {
        background: #43b581;
    }
    .shield.manual {
        background: #7289da;
        font-family: Georgia, serif;
        font-style: italic;
    }
    .shield.connecting {
        background: #faa61a;
        animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.6;
        }
    }
    h1 {
        margin: 0;
        font-size: 22px;
        line-height: 1.25;
    }

    /* ---- tabs ---- */
    .auth-tabs {
        display: flex;
        gap: 0;
        margin-bottom: 18px;
        border-radius: 4px;
        overflow: hidden;
        border: 1px solid #40444b;
    }
    .auth-tab {
        flex: 1;
        min-height: 32px;
        padding: 6px 12px;
        border: none;
        background: #2c2f33;
        color: #b9bbbe;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition:
            background 0.15s,
            color 0.15s;
    }
    .auth-tab.active {
        background: #7289da;
        color: #fff;
    }
    .auth-tab:hover:not(.active) {
        background: #343941;
    }

    /* ---- StreamKit panel ---- */
    .streamkit-panel {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        text-align: center;
    }
    .streamkit-desc {
        color: #dcddde;
        font-size: 14px;
        line-height: 1.5;
    }
    .streamkit-hint {
        color: #b9bbbe;
        font-size: 12px;
    }

    /* ---- manual form ---- */
    form {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }
    .field {
        display: flex;
        flex-direction: column;
        gap: 7px;
        color: #dcddde;
        font-size: 13px;
    }
    input {
        min-height: 36px;
        padding: 6px 10px;
        border: 1px solid #40444b;
        border-radius: 4px;
        outline: none;
        background: #2c2f33;
        color: #fff;
    }
    input:focus {
        border-color: #7289da;
        box-shadow: 0 0 0 3px rgba(114, 137, 218, 0.22);
    }
    button {
        font: inherit;
    }
    .link-button,
    .tutorial-link {
        width: fit-content;
        padding: 0;
        border: 0;
        background: transparent;
        color: #7289da;
        cursor: pointer;
        text-decoration: underline;
    }
    .link-button:hover,
    .tutorial-link:hover {
        color: #8ea1e1;
    }
    .authorize-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 38px;
        margin-top: 8px;
        border: 1px solid #7289da;
        border-radius: 4px;
        background: #7289da;
        color: #fff;
        cursor: pointer;
        font-weight: 700;
        width: 100%;
    }
    .authorize-button:hover:not(:disabled) {
        border-color: #677bc4;
        background: #677bc4;
    }
    .authorize-button:disabled {
        cursor: default;
        opacity: 0.65;
    }
    .result {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        text-align: center;
        color: #dcddde;
        line-height: 1.45;
    }
    .countdown {
        color: #b9bbbe;
        font-size: 14px;
    }
    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.35);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.85s linear infinite;
    }
    .tutorial-link {
        align-self: center;
        margin-top: 2px;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
