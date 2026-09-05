<script setup lang="ts">
import { computed, watch } from "vue";
import AuthPanel from "./_AuthPanel.vue";
import { Property } from "@mirabox/streamdock-sdk/property";
const property = Property.getReactiveInstance();
const i18n = Property.getI18n();

interface VoiceStateOption {
    user?: {
        id?: string;
        username?: string;
        global_name?: string;
    };
}

const voiceStates = computed<VoiceStateOption[]>(() => (property.settings.voice_states as VoiceStateOption[] | undefined) || []);
const hasUsers = computed(() => voiceStates.value.length > 0);
const hasSelectedUser = computed(() => voiceStates.value.some((item) => item.user?.id === property.settings.user));
const showControls = computed(() => hasUsers.value && hasSelectedUser.value);

watch(
    () => property.settings.mode,
    (mode) => {
        if (mode === "mute") property.settings.type = "toggle";
    },
    { immediate: true },
);
</script>
<template>
    <AuthPanel />
    <section class="panel">
        <label>{{ i18n["用户"] || "User" }}</label>
        <select v-if="hasUsers" v-model="property.settings.user">
            <option v-for="item in voiceStates" :key="item.user?.id" :value="item.user?.id">{{ item.user?.global_name || item.user?.username }}</option>
        </select>
        <div v-else class="empty">{{ i18n["当前语音频道没有用户"] || "No users in current voice channel" }}</div>

        <template v-if="showControls">
            <label>{{ i18n["模式"] || "Mode" }}</label>
            <select v-model="property.settings.mode">
                <option value="mute">{{ i18n["静音"] || "Mute" }}</option>
                <option value="adjustment">{{ i18n["调整"] || "Adjust" }}</option>
                <option value="set">{{ i18n["设置"] || "Set" }}</option>
            </select>
            <label v-if="property.settings.mode === 'adjustment'">{{ i18n["调整单位"] || "Adjustment" }}</label>
            <input v-if="property.settings.mode === 'adjustment'" v-model.number="property.settings.adjustment" type="number" />
            <label v-if="property.settings.mode === 'set'">{{ i18n["理想音量"] || "Volume" }}</label>
            <input v-if="property.settings.mode === 'set'" v-model.number="property.settings.volume" type="number" min="0" max="200" />
        </template>
    </section>
</template>
<style scoped>
.panel {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 8px;
    padding: 0 16px 16px;
    font: 13px system-ui, sans-serif;
}
select,
input {
    min-height: 28px;
}
.empty {
    min-height: 28px;
    display: flex;
    align-items: center;
    color: #a8adb5;
}
</style>
