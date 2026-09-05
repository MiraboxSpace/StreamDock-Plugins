<script setup lang="ts">
import ChannelPanel from "./_ChannelPanel.vue";
import { Property } from "@mirabox/streamdock-sdk/property";
const i18n = Property.getI18n();
</script>
<template><ChannelPanel :channel-label="i18n['语音通道'] || 'Voice Channel'" show-icon-mode /></template>
