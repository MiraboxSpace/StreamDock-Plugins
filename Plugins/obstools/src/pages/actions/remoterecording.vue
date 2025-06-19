<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';
import { ref, watch } from 'vue';
import Slider from '@/components/slider.vue'; // 确保路径正确
const sliderValue = ref(100);
// 事件侦听器
const i18n = useI18nStore();
const property = usePropertyStore();
const type = ref([
  {
    key: i18n["Start/Stop"],
    value: "Start/Stop"
  },
  {
    key: i18n["Pause/Resume"],
    value: "Pause/Resume"
  }
])
useWatchEvent({
  didReceiveSettings(data) {
    console.log(data);
    property.getGlobalSettings();
  },
  sendToPropertyInspector(data) {
    console.log(data.payload);
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
      <label class="block  font-medium text-white mb-1">{{ i18n["Short Press"] }}</label>
      <select
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.shortPress">
        <option :value="item.value" v-for="item in type">{{ item.key }}</option>
      </select>
    </div>
    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Long Press"] }}</label>
      <select
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.longPress">
        <option :value="item.value" v-for="item in type">{{ item.key }}</option>
      </select>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Long Keypress Time"] }}</label>
      <div class="relative w-full">
        <Slider v-model="property.settings.longKeypressTime" :min="150" :max="1000" unit="ms"/>
      </div>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Start Icon"] }}</label>
      <input
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.startIcon">
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Stopped Icon"] }}</label>
      <input
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.stoppedIcon">
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Paused Icon"] }}</label>
      <input
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.pausedIcon">
    </div>

    <div class="mt-4">
      <button @click="logout"
        class="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">{{
        i18n["Disconnect"] }}</button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
