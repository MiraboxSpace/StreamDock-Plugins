<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';
import { ref, watch } from 'vue';

// 事件侦听器
const i18n = useI18nStore();
const property = usePropertyStore();
const sources = ref<any>([]);
const monitorTypeEnum = ref<any>([
  {
    key: i18n['None'],
    value: 'OBS_MONITORING_TYPE_NONE'
  },
  {
    key: i18n['Monitor Only'],
    value: 'OBS_MONITORING_TYPE_MONITOR_ONLY'
  },
  {
    key: i18n['Monitor And Output'],
    value: 'OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT'
  }
]);
useWatchEvent({
  didReceiveSettings(data) {
    console.log(data);
    property.getGlobalSettings();
  },
  sendToPropertyInspector(data) {
    console.log(data.payload);
    if ("sources" in data.payload) {
      sources.value = data.payload.sources;
      if (property.settings.inputUuid == undefined || property.settings.inputUuid == "") {
        property.settings.inputUuid = sources.value[0]?.inputUuid;
      }

    }
  },
  didReceiveGlobalSettings(data) {
    didReceiveGlobalSettings(data);
  }
});

const didReceiveGlobalSettings = (data) => {
  const { payload: { settings } } = data;
  window.property = property;
  // 获取缩放比例
  const ratio = window.devicePixelRatio || 1;

  // 原始（视觉设计）尺寸
  const visualWidth = 800;
  const visualHeight = 550;

  // 实际用于打开窗口的像素尺寸（缩放后）
  const popupWidth = visualWidth * ratio;
  const popupHeight = visualHeight * ratio;

  // 获取屏幕的逻辑尺寸（CSS 像素）
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;

  // 计算居中位置（仍然用 CSS 像素）
  const left = (screenWidth - popupWidth) / 2;
  const top = (screenHeight - popupHeight) / 2;

  if (settings == undefined || !("ip" in settings)) {
    window.open(
      "./index.html?childWindow=" + true,
      "_blank",
      `width=${popupWidth},height=${popupHeight},top=${top},left=${left}`
    );
  } else if (settings.connected == false) {
    window.open(
      "./index.html?childWindow=" + true+"&settings="+JSON.stringify(settings),
      "_blank",
      `width=${popupWidth},height=${popupHeight},top=${top},left=${left}`
    );
  }
}

const logout = () => {
  property.setGlobalSettings({});
  didReceiveGlobalSettings({ payload: { settings: {} } });
}

window.onFilePickerReturn = (files: string) => {
  property.settings.filePath = JSON.parse(files)[0];
};

</script>

<template>
  <div class="p-3">
    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Input Name"] }}</label>
      <select
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.inputUuid">
        <option :value="item.inputUuid" v-for="item in sources">{{ item.inputName }}</option>
      </select>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Monitor Type"] }}</label>
      <select
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.monitorType">
        <option :value="item.value" v-for="item in monitorTypeEnum">{{ item.key }}</option>
      </select>
    </div>

    <div class="mt-4">
      <button @click="logout"
        class="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">{{
        i18n["Disconnect"] }}</button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
