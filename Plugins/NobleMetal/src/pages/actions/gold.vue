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

const options = [
  {
    label: i18n.中国金价,
    value: '1'
  },
  {
    label: i18n.纽约期货国际金价,
    value: '2'
  },
  {
    label: i18n.伦敦现货黄金价格,
    value: '3'
  }
]

const select = (value: string) => {
  property.sendToPlugin({ select: value });
};

</script>

<template>
  <n-config-provider :theme="darkTheme" class="outside">
    <n-flex justify="center">
      <n-form size="small" :style="{
        marginTop: '10px'
      }" label-placement="left" :show-feedback="true" :model="property.settings">
        <n-form-item :label="i18n.选择 + '：'" path="" label-style="--n-feedback-height:10px;">
          <n-space vertical>
            <n-select :value="property.settings.select" :options="options" @update:value="select" />
          </n-space>
        </n-form-item>
      </n-form>
      <n-collapse> </n-collapse>
    </n-flex>
  </n-config-provider>
</template>

<style lang="scss" scoped>
.n-space {
  width: 100%;
  min-width: 200px;
}
</style>
