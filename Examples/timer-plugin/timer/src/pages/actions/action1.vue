<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';
import { NButton, NRadioGroup, NRadio } from 'naive-ui';

// 事件侦听器
const i18n = useI18nStore();
const property = usePropertyStore();

useWatchEvent({
  didReceiveSettings(data) { },
  sendToPropertyInspector(data) { }
});

const radios = [
  {
    value: '0',
    label: i18n['常规']
  },
  {
    value: '1',
    label: i18n['放大']
  }
];

// 单双击
let lastClick = 0;
const click = () => {
  const now = Date.now();
  property.sendToPlugin({ event: now - lastClick <= 300 ? 'dbclick' : 'click' });
  lastClick = now;
};
</script>

<template>
  <TabView :label="i18n['显示方式']">
    <n-radio-group v-model:value="property.settings.select" name="radiogroup">
      <n-radio v-for="radio in radios" :key="radio.value" :value="radio.value">
        {{ radio.label }}
      </n-radio>
    </n-radio-group>
  </TabView>
  <div class="btn-box">
    <NButton style="width: 100%" @click="click" size="small">{{ i18n['开始或暂停 双击重新开始'] }}</NButton>
  </div>
</template>

<style lang="scss" scoped>
.btn-box {
  width: 50%;
  margin: 10px auto;
}
</style>
