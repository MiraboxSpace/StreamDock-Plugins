<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';
import { ref, watch } from 'vue';
import Slider from '@/components/slider.vue';
import { NDivider } from "naive-ui";
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

/**
 * 下载 JSON 字符串到本地文件，后缀为 .obsvplay
 * @param {string} jsonString 要下载的 JSON 字符串
 * @param {string} [filename='data.obsvplay'] 下载文件的文件名，默认为 'config.obsvplay'
 */
function downloadObsvplayFile(jsonString, filename = 'config.obsvplay') {
  console.log(jsonString,filename)
    // 确保文件名以 .obsvplay 结尾
    if (!filename.toLowerCase().endsWith('.obsvplay')) {
        // 如果没有 .obsvplay 后缀，就加上
        filename += '.obsvplay';
    }
  console.log(11111111111)

    // MIME 类型可以根据 .obsvplay 文件的实际内容来确定。
    // 如果它本质上是 JSON，只是扩展名不同，那么 'application/json' 是可以的。
    // 如果它是一个自定义格式，可以尝试使用 'application/octet-stream' (通用二进制流)
    // 或者一个自定义的 MIME 类型，例如 'application/x-obsvplay'（如果注册了的话）
    // 为了兼容性，这里暂时使用 'application/json' 或 'application/octet-stream'。
    // 如果你确定它内部就是 JSON 格式，'application/json' 更好。
    const mimeType = 'application/json'; // 或者 'application/octet-stream'

    const blob = new Blob([jsonString], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename; // 设置下载文件名，已确保后缀
  console.log(22222222222222222)

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  console.log(333333333333333)

    URL.revokeObjectURL(url);
}

function exportConfig() {
  // scene: "",
  // source: "",
  // filePath: "",
  // isMute: false,
  // autoHide: 20,
  // speed: 100

  const tempJson = {}
  Object.assign(tempJson, property.settings);
  downloadObsvplayFile(JSON.stringify(tempJson));
}
onMounted(() => {
  // importConfig();
})
function importConfig() {
  document.getElementById('Import').addEventListener('change', function(event: any) {
    const file = event.target.files[0];
    if (file) {
        // 确保文件类型是 JSON 或 .obsvplay
        if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.obsvplay')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const jsonContent = e.target.result; // 这是文件的文本内容
                    const parsedData = JSON.parse(jsonContent); // 解析 JSON 字符串
                    console.log('成功读取并解析上传的 JSON 数据:', parsedData);
                    document.getElementById('Import').textContent = JSON.stringify(parsedData, null, 2);
                    // 在这里，你可以将 parsedData 赋值给你的应用程序状态，例如：
                    // myApp.currentObsvplayConfig = parsedData;
                    Object.assign(property.settings, parsedData);
                } catch (error) {
                    console.error('解析上传文件为 JSON 失败:', error);
                    alert('文件内容不是有效的 JSON 格式。');
                }
            };
            reader.readAsText(file); // 读取文件为文本
        } else {
            alert('请上传 JSON 或 .obsvplay 文件。');
            event.target.value = ''; // 清空选择
        }
    }
});
}
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
      <label class="block  font-medium text-white mb-1">{{ i18n["Media Source Name"] }}</label>
      <select
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.source">
        <option :value="source.sourceUuid" v-for="source in sources">{{ source.sourceName }}</option>
      </select>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["File Name"] }}</label>
      <input type="file" accept=".mp4,.ts,.mov,.flv,.mkv,.avi,.gif,.webm" id="filePath" class="hidden" multiple>
      <label for="filePath"
        class="inline-block w-full px-4 py-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded-md cursor-pointer text-center">{{
        property.settings.filePath ? property.settings.filePath : i18n["Choose File"]
      }}</label>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Mute"] }}</label>
      <div class="flex">
        <input type="checkbox" id="mute"
        class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
        v-model="property.settings.isMuted">
      <label for="mute" class="ml-2 block  text-white">{{ i18n["Mute replay video"] }}</label>
      </div>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["AutoHideSources"] }}</label>
      <input type="number" min="0"
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.autoHide">
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Speed"] }}</label>
      <div class="relative w-full">
        <Slider v-model="property.settings.speed" unit="%"/>
      </div>
    </div>
    
    <!-- <n-divider />
    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Export"] }}</label>
      <div
        @click="exportConfig()"
        class="inline-block w-full px-4 py-2 hover:bg-violet-600 bg-[#3d3d3d] border border-[#4a4a4a] rounded-md cursor-pointer text-center">{{
        i18n["Exprot Settings"]
      }}</div>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Import"] }}</label>
      <input type="file" accept=".obsvplay" id="Import" class="hidden" multiple>
      <label for="Import"
        class="inline-block w-full px-4 py-2 hover:bg-violet-600 bg-[#3d3d3d] border border-[#4a4a4a] rounded-md cursor-pointer text-center">{{
        i18n["Import Settings"]
      }}</label>
    </div> -->

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1"></label>
      <div>
        {{ i18n["Note: Importing will overwrite all existing settings"] }}
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
