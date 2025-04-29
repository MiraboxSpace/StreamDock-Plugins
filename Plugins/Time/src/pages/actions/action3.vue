<script setup lang="ts">
  import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
  import { useI18nStore } from '@/hooks/i18n';
  import { NButton, NRadioGroup, NRadio, NSelect, NColorPicker, NFlex, NInput } from 'naive-ui';
  import { ref } from 'vue';
  // 事件侦听器
  const i18n = useI18nStore();
  const property = usePropertyStore();
  useWatchEvent({
    didReceiveSettings(data) {},
    sendToPropertyInspector(data) {}
  });
  const timing = [
    {
      label: i18n['一分钟'],
      value: '60000'
    },
    {
      label: i18n['五分钟'],
      value: '300000'
    },
    {
      label: i18n['十分钟'],
      value: '600000'
    },
    {
      label: i18n['三十分钟'],
      value: '1800000'
    },
    {
      label: i18n['自定义'],
      value: 'custom'
    }
  ];

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

  window.onFilePickerReturn = (files) => {
    property.settings.musicUrl = JSON.parse(files)[0];
  };
</script>

<template>
  <TabView :label="i18n['闹铃选择']">
    <NButton style="width: 100%; overflow: hidden" onclick="Input.click()">{{ property.settings.musicUrl }}</NButton>
    <input id="Input" type="file" accept=".wav,.ogg,.mp3" style="display: none" />
  </TabView>
  <TabView :label="i18n['时间选择']">
    <n-flex>
      <!-- <NSelect v-model:value="property.settings.timing" :options="timing" style="flex: 1" @change="property.sendToPlugin({event:$event})" /> -->
      <NSelect :options="timing" style="flex: 1" @change="property.sendToPlugin({ event: 'counss', value: $event })" :value="property.settings.timing" />
      <n-color-picker style="width: 31px; height: 31px; margin-left: 8px" show:false size="small" v-model:value="property.settings.color">
        <template #label></template>
      </n-color-picker>
    </n-flex>
  </TabView>

  <TabView :label="i18n['自定时间']" v-if="property.settings.timing == 'custom'">
    <n-input
      placeholder="单位秒"
      :default-value="String(property.settings.inputTime / 1000)"
      id="CustomTime"
      type="text"
      :allow-input="(value: string) => !value || /^\d+$/.test(value)"
      @input="property.sendToPlugin({ event: 'input', value: Number($event) * 1000 })"
    />
  </TabView>

  <TabView :label="i18n['显示方式']">
    <n-radio-group v-model:value="property.settings.select" name="radiogroup">
      <n-radio v-for="radio in radios" :key="radio.value" :value="radio.value">
        {{ radio.label }}
      </n-radio>
    </n-radio-group>
  </TabView>
  <TabView :label="i18n['操作选项']">
    <NButton style="width: 100%" @click="click">{{i18n['开始或暂停 双击重新开始']}}</NButton>
  </TabView>
</template>

<style lang="scss" scoped></style>
