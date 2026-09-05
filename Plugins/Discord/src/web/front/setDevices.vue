<script setup lang="ts">
import AuthPanel from "./_AuthPanel.vue";
import { Property } from "@mirabox/streamdock-sdk/property";
const property = Property.getReactiveInstance();
const i18n = Property.getI18n();
</script>
<template>
    <AuthPanel />
    <section class="panel">
        <label>{{ i18n["模式"] || "Mode" }}</label>
        <select v-model="property.settings.mode">
            <option value="input">{{ i18n["设置输入设备"] || "Input" }}</option>
            <option value="output">{{ i18n["设置输出设备"] || "Output" }}</option>
            <option value="both">{{ i18n["设置二者"] || "Both" }}</option>
        </select>
        <label v-if="property.settings.mode === 'input' || property.settings.mode === 'both'">{{ i18n["输入"] || "Input" }}</label>
        <select v-if="property.settings.mode === 'input' || property.settings.mode === 'both'" v-model="property.settings.input">
            <option v-for="item in property.settings.inputDevices || []" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <label v-if="property.settings.mode === 'output' || property.settings.mode === 'both'">{{ i18n["输出"] || "Output" }}</label>
        <select v-if="property.settings.mode === 'output' || property.settings.mode === 'both'" v-model="property.settings.output">
            <option v-for="item in property.settings.outputDevices || []" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
    </section>
</template>
<style scoped>.panel{display:grid;grid-template-columns:110px 1fr;gap:8px;padding:0 16px 16px;font:13px system-ui,sans-serif}select{min-height:28px}</style>
