<script setup lang="ts">
import AuthPanel from "./_AuthPanel.vue";
import { Property } from "@mirabox/streamdock-sdk/property";
const property = Property.getReactiveInstance();
const i18n = Property.getI18n();
</script>
<template>
    <AuthPanel />
    <section class="panel">
        <label>{{ i18n["设备"] || "Device" }}</label>
        <select v-model="property.settings.rdio">
            <option value="input">{{ i18n["输入"] || "Input" }}</option>
            <option value="output">{{ i18n["输出"] || "Output" }}</option>
        </select>
        <label>{{ i18n["步长"] || "Step" }}</label>
        <input v-model.number="property.settings.adjustment" type="number" min="1" max="25" />
    </section>
</template>
<style scoped>.panel{display:grid;grid-template-columns:110px 1fr;gap:8px;padding:0 16px 16px;font:13px system-ui,sans-serif}select,input{min-height:28px}</style>
