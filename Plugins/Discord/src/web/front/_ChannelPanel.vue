<script setup lang="ts">
import { computed } from "vue";
import { Property } from "@mirabox/streamdock-sdk/property";
import AuthPanel from "./_AuthPanel.vue";
import SelectField from "./_SelectField.vue";

const props = defineProps<{ channelLabel: string; showIconMode?: boolean }>();
const property = Property.getReactiveInstance();
const i18n = Property.getI18n();

function refresh() {
    property.sendToPlugin({ refresh: true });
}

const showChannel = computed(() => property.settings.select !== "__disconnect__");
</script>

<template>
    <AuthPanel />
    <section class="panel">
        <button @click="refresh">{{ i18n["刷新"] || "Refresh" }}</button>
        <SelectField :label="i18n['服务器'] || 'Server'" :options="property.settings.guilds" :value="property.settings.select" @change="property.settings.select = $event" />
        <SelectField v-if="showChannel" :label="props.channelLabel" :options="property.settings.channels" :value="property.settings.channel" @change="property.settings.channel = $event" />
        <div v-if="props.showIconMode" class="row">
            <label>{{ i18n["图标显示"] || "Icon Display" }}</label>
            <select v-model="property.settings.iconDisplayMode">
                <option value="static">{{ i18n["静态"] || "Static" }}</option>
                <option value="dynamic">{{ i18n["动态"] || "Dynamic" }}</option>
            </select>
        </div>
    </section>
</template>

<style scoped>
.panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 16px 16px;
    font: 13px system-ui, sans-serif;
}
button {
    min-height: 28px;
}
.row {
    display: grid;
    grid-template-columns: 110px 1fr;
    align-items: center;
    gap: 8px;
}

/* ---- 暗色主题下拉框 ---- */
:deep(select) {
    background: #2c2f33;
    color: #dcddde;
    border-color: #40444b;
}
:deep(select option) {
    background: #2c2f33;
    color: #dcddde;
}
</style>
