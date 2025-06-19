<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';
import { ref, watch } from 'vue';

// 事件侦听器
const i18n = useI18nStore();
const property = usePropertyStore();
const sceneList = ref<any>([]);
useWatchEvent({
  didReceiveSettings(data) {
    // console.log(data);
    property.getGlobalSettings();
  },
  sendToPropertyInspector(data) {
    console.log(data);
    if ("sceneList" in data.payload) {
      sceneList.value = data.payload.sceneList;
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
      "./index.html?childWindow=" + true + "&settings=" + JSON.stringify(settings),
      "_blank",
      `width=${popupWidth},height=${popupHeight},top=${top},left=${left}`
    );
  }
}

const logout = () => {
  property.setGlobalSettings({});
  didReceiveGlobalSettings({ payload: { settings: {} } });
}

// watch(() => property.settings.source, async (newSource) => {
//   try {
//     property.sendToPlugin({ source: newSource })
//   } catch (error) {
//     setTimeout(() => {
//       property.sendToPlugin({ source: newSource })
//     }, 1000);
//   }
// }, { immediate: true });

onMounted(() => {
  try {
    property.setSettings(property.settings);
  } catch (error) {
    setTimeout(() => {
      property.setSettings(property.settings);
    }, 1000)
  }
    document.getElementById('image').addEventListener('change', function (event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async function (e) {
        const base64String = e.target.result; // Data URL (data:image/png;base64,...)
        // console.log(base64String);
        const scale = await compressImage(base64String, file.type, 256, 0.7);
        console.log(scale)
        property.settings.imageBase64 = scale;
      };
      reader.readAsDataURL(file);
    }
  });
})

window.onFilePickerReturn = (files: string) => {
  property.settings.image = JSON.parse(files)[0];
};


/**
         * 压缩图片并返回 Base64 Data URL
         * @param {string} src Base64 或图片 URL
         * @param {string} mimeType 图片的 MIME 类型 (e.g., 'image/jpeg', 'image/png')
         * @param {number} [maxWidth=800] 最大宽度，按比例缩放，如果原始宽度小于此值则不缩放。
         * @param {number} [quality=0.8] JPEG/WebP 压缩质量 (0.1 - 1.0)。PNG 格式此参数通常无效，或仅影响色深/调色板。
         * @returns {Promise<string>} 压缩后的 Base64 Data URL
         */
function compressImage(src, mimeType, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let width = img.width;
      let height = img.height;

      // 根据最大宽度调整尺寸
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      // 导出为 Base64
      let outputMimeType = mimeType;
      // 如果是PNG，并且希望在不牺牲透明度的情况下减少大小，主要依赖maxWidth的缩放
      // 如果要转为JPEG以获得更小的文件大小（但会丢失透明度），可以修改outputMimeType
      // if (mimeType === 'image/png' && quality < 1.0) { outputMimeType = 'image/jpeg'; }

      try {
        const compressedDataUrl = canvas.toDataURL(outputMimeType, quality);
        resolve(compressedDataUrl);
      } catch (err) {
        reject(new Error("Failed to convert canvas to data URL: " + err.message));
      }
    };

    img.onerror = function (err: any) {
      reject(new Error("Failed to load image for compression: " + err.message));
    };

    img.src = src; // 加载图片
  });
}

</script>

<template>
  <div class="p-3">
    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Scene Name"] }}</label>
      <select
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.scene">
        <option :value="item.sceneUuid" v-for="item in sceneList">{{ item.sceneName }}</option>
      </select>
    </div>
    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Transition"] }}</label>
      <div class="flex">
        <input type="checkbox" id="transition"
          class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          v-model="property.settings.transition">
        <label for="transition" class="ml-2 block  text-white">{{ i18n["Override transition if already in scene"]
          }}</label>
      </div>
    </div>

    <!-- <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Preview Color"] }}</label>
      <div class="flex">
        <input type="color"
          class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          v-model="property.settings.previewColor">
      </div>
    </div> -->

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Live Color"] }}</label>
      <div class="flex">
        <input type="color"
          class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          v-model="property.settings.liveColor">
      </div>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Preview"] }}</label>
      <div class="flex">
        <input type="checkbox" id="preview"
          class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          v-model="property.settings.preview">
        <label for="preview" class="ml-2 block  text-white">{{ i18n["Preview Scene(Experimental)"] }}</label>
      </div>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Custom Image"] }}</label>
      <div class="flex">
        <input type="file" id="image" accept=".jpg, .jpeg, .png, .gif"
          class="hidden rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50">
        <label for="image"
          class="w-full block text-center text-white p-2 border border-gray-400 rounded-md bg-gray-700 cursor-pointer hover:bg-gray-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50">
          {{ property.settings.image || i18n["Choose File"] }}
        </label>
      </div>
    </div>

    <div class="mt-4">
      <button @click="logout"
        class="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">{{
          i18n["Disconnect"] }}</button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
