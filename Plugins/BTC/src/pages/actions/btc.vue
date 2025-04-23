<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';
import { FormItemRule, FormRules, darkTheme } from 'naive-ui';

// 事件侦听器
const i18n = useI18nStore();
const property = usePropertyStore();
useWatchEvent({
  didReceiveSettings(data) { },
  sendToPropertyInspector(data) { }
});

</script>

<template>
  <n-config-provider :theme="darkTheme" class="outside">
    <n-flex justify="center">
      <n-form size="small" :style="{
        marginTop: '10px'
      }" label-placement="left" :show-feedback="true" :model="property.settings">

      </n-form>
      <n-collapse> </n-collapse>
    </n-flex>
  </n-config-provider>
</template>

<style lang="scss" scoped>
.n-space {
  width: 100%;
}

.n-button{
  min-width: 300px;
}
</style>
