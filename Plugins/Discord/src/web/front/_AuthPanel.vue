<script setup lang="ts">
    import { computed } from "vue";
    import { Property } from "@mirabox/streamdock-sdk/property";

    const property = Property.getReactiveInstance();
    const i18n = Property.getI18n();

    const isAuthorized = computed(() => {
        return Boolean(property.globalSettings.streamKitToken || property.globalSettings.accessToken);
    });

    function openAuthorization() {
        property.openSubWindows("authorization", 520, 500);
    }

    function logout() {
        property.setGlobalSettings({
            ...property.globalSettings,
            streamKitToken: "",
            accessToken: "",
            clientId: "",
            clientSecret: "",
        });
    }
</script>

<template>
    <section class="auth-panel">
        <div class="auth-status" :class="{ ready: isAuthorized }">
            <span class="status-dot"></span>
            <span class="status-title">{{ isAuthorized ? i18n["已授权"] || "Authorized" : i18n["未授权"] || "Not authorized" }}</span>
        </div>

        <div class="actions">
            <button v-if="!isAuthorized" class="primary" type="button" @click="openAuthorization">{{ i18n["请求授权"] || "Authorize" }}</button>
            <button v-if="isAuthorized" class="ghost" type="button" @click="logout">{{ i18n["退出登录"] || "Logout" }}</button>
        </div>
    </section>
</template>

<style scoped>
    .auth-panel {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 12px;
        font:
            13px Arial,
            sans-serif;
        color: #f2f3f5;
    }
    .auth-status {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1 1 auto;
    }
    .status-dot {
        width: 8px;
        height: 8px;
        flex: 0 0 auto;
        border-radius: 50%;
        background: #f04747;
        box-shadow: 0 0 0 4px rgba(240, 71, 71, 0.14);
    }
    .auth-status.ready .status-dot {
        background: #43b581;
        box-shadow: 0 0 0 4px rgba(67, 181, 129, 0.16);
    }
    .status-title {
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .actions {
        display: flex;
        gap: 6px;
        flex: 0 0 auto;
    }
    button {
        min-height: 26px;
        padding: 0 10px;
        border: 1px solid transparent;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-weight: 700;
    }
    button:disabled {
        cursor: default;
        opacity: 0.45;
    }
    .primary {
        background: #7289da;
        border-color: #7289da;
    }
    .primary:hover {
        background: #677bc4;
        border-color: #677bc4;
    }
    .ghost {
        background: #2c2f33;
        border-color: #40444b;
    }
    .ghost:hover:not(:disabled) {
        background: #343941;
    }
</style>
