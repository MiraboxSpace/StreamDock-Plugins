<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';
import { ref, watch } from 'vue';

// 事件侦听器
const i18n = useI18nStore();
const property = usePropertyStore();
const scenes = ref<any>([]);
const sources = ref<any>([]);
useWatchEvent({
  didReceiveSettings(data) {
    // console.log(data);
    property.getGlobalSettings();
  },
  sendToPropertyInspector(data) {
    if ("scenes" in data.payload) {
      scenes.value = data.payload.scenes;
      if (property.settings.scene == undefined || property.settings.scene == "") {
        property.settings.scene = scenes.value[0]?.sceneUuid;
      }
      scenes.value.forEach((item) => {
        if (item.sceneUuid == property.settings.scene) {
          sources.value = item.sources;
          if (property.settings.source == undefined || property.settings.source == "") {
            property.settings.source = sources.value[0]?.sourceUuid;
          }
        }
      });
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

watch(() => property.settings.scene, async (newScene) => {
  scenes.value.forEach((item) => {
    if (item.sceneUuid == newScene) {
      sources.value = item.sources;
    }
  });
});
</script>

<template>
  <div class="p-3">
    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Scene"] }}</label>
      <select
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.scene">
        <option :value="item.sceneUuid" v-for="item in scenes">{{ item.sceneName }}</option>
      </select>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Image Source Name"] }}</label>
      <select
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.source">
        <option :value="source.sourceUuid" v-for="source in sources">{{ source.sourceName }}</option>
      </select>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["File Name"] }}</label>
      <input type="file" accept=".jpeg, .png, .gif, .webp, .svg, .mp4, .ts, .mov, .flv, .mkv, .avi, .webm" id="filePath" class="hidden" multiple>
      <label for="filePath"
        class="inline-block w-full px-4 py-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded-md cursor-pointer text-center">{{
        property.settings.filePath ? property.settings.filePath : i18n["Choose File"]
      }}</label>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["AutoHideSources"] }}</label>
      <input type="number" min="0"
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.autoHide">
    </div>
    <div class="mt-4">
      <button @click="logout"
        class="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">{{
        i18n["Disconnect"] }}</button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
