<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';
import { ref, watch } from 'vue';
import { NButton, NDivider, NCollapse, NCollapseItem } from 'naive-ui';
import Slider from "@/components/slider.vue";
// 事件侦听器
const i18n = useI18nStore();
const property = usePropertyStore();
const sourceList = ref<any>([]);
let activePhase = ref<any>("");
const propertyList = ref<any>([
  {
    "key": "alignment",
    "value": "对齐"
  },
  {
    "key": "brightness",
    "value": "亮度"
  },
  {
    "key": "contrast",
    "value": "对比度"
  },
  {
    "key": "cropBottom",
    "value": "底部裁剪"
  },
  {
    "key": "cropLeft",
    "value": "左侧裁剪"
  },
  {
    "key": "cropRight",
    "value": "右侧裁剪"
  },
  {
    "key": "cropTop",
    "value": "顶部裁剪"
  },
  {
    "key": "gamma",
    "value": "伽马"
  },
  // {
  //   "key": "scaleY",
  //   "value": "高度"
  // },
  {
    "key": "height",
    "value": "高度"
  },
  {
    "key": "hue",
    "value": "色相"
  },
  {
    "key": "opacity",
    "value": "不透明度"
  },
  {
    "key": "rotation",
    "value": "旋转"
  },
  { "key": "saturation", "value": "饱和度" },
  // { "key": "scaleX", "value": "宽度" },
  { "key": "width", "value": "宽度" },
  { "key": "positionX", "value": "X 坐标" },
  { "key": "positionY", "value": "Y 坐标" }
])
useWatchEvent({
  didReceiveSettings(data) {
    // console.log(data);
    property.getGlobalSettings();
  },
  sendToPropertyInspector(data) {
    // console.log(data);
    if ("sourceList" in data.payload) {
      sourceList.value = data.payload.sourceList;
    }
    if("recordComplete" in data.payload) {
      console.log(data.payload);
      findPhaseIndex
      let index = findPhaseIndex(property.settings.phaseActive.id);
      property.settings.phaseActive = property.settings.phases[index];
      console.log(property.settings.phaseActive, property.settings.phases[0])
      property.settings.phaseActive.animations.push(...data.payload.animations);
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

const findPhaseIndex = (id) => {
  return property.settings.phases.findIndex(i => i.id === id)
}

watch(activePhase, (newVal) => {
  let index = findPhaseIndex(newVal);
  property.settings.phaseActive = property.settings.phases[index];
})

const init = () => {
  if(property.settings.phases?.length) {
    activePhase.value = property.settings.phaseActive.id;
    let index = findPhaseIndex(property.settings.phaseActive.id);
    property.settings.phaseActive = property.settings.phases[index];
  }else {
    let temp = JSON.parse(JSON.stringify(property.settings.phaseTemplate));
    temp.id = new Date().getTime();
    temp.name = "phase 0"
    property.settings.phases.push(temp);
    property.settings.phaseActive = property.settings.phases[property.settings.phases.length - 1];
    activePhase.value = temp.id;
  }
  console.log('-------------------', property.settings);
}
const addPhaseAbove = () => {
    let temp = JSON.parse(JSON.stringify(property.settings.phaseTemplate));
    temp.id = new Date().getTime();
    temp.name = property.settings.phaseActive.name + "p";
    let index = findPhaseIndex(property.settings.phaseActive.id);
    property.settings.phases.splice(index, 0, temp);
    property.settings.phaseActive = property.settings.phases[index + 1];
    activePhase.value = temp.id;

}
const addPhaseBelow = () => {
    let temp = JSON.parse(JSON.stringify(property.settings.phaseTemplate));
    temp.id = new Date().getTime();
    temp.name = "phase " + property.settings.phases.length;
    let index = findPhaseIndex(property.settings.phaseActive.id);
    property.settings.phases.splice(index + 1, 0, temp);
    property.settings.phaseActive = property.settings.phases[index + 2];
    activePhase.value = temp.id;

}

const deletePhase = () => {
  const index = findPhaseIndex(activePhase.value);
  property.settings.phases.splice(index, 1);
  if(property.settings.phases.length === 0) {
    init();
  }else {
    property.settings.phaseActive = property.settings.phases[0];
    activePhase.value = property.settings.phaseActive.id;
  }
}
let propertyName = ref("alignment");
let startValue = ref("");
let endValue = ref("");
let animationsCurrentIndex = ref(-1);
const addAnimations = () => {
  property.settings.phaseActive.animations.push({
    type: propertyName.value,
    startValue: startValue.value,
    endValue: endValue.value
  })
  console.log(property.settings.phaseActive.animations)
}

const deleteAnimations = () => {
  if(animationsCurrentIndex.value >= 0 && animationsCurrentIndex.value < property.settings.phaseActive.animations.length) {
    property.settings.phaseActive.animations.splice(animationsCurrentIndex.value, 1);
  }
}



onMounted(() => {
  setTimeout(() => {
      init();
  }, 1000)
})
</script>

<template>
  <div class="p-3" v-if="property.settings">
    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Source Name"] }}</label>
      <select
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.source">
        <option :value="item.sourceUuid" v-for="item in sourceList">{{ item.sourceName }}</option>
      </select>
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Repeat Animation(times)"] }}</label>
      <input type="number" min="0"
        class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
        v-model="property.settings.repeatAnimationCount">
    </div>

    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Phases"] }}</label>
      <div class="w-full flex">
        <select
          class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
          v-model="activePhase">
          <option :value="item.id" v-for="item in property.settings.phases">{{ item.name }}</option>
        </select>
        <n-button @click="deletePhase" class="ml-2">{{ i18n["Delete"] }}</n-button>
      </div>
    </div>

    <div class="mb-3 flex">
      <n-button @click="addPhaseAbove" class="mr-2">{{ i18n["Add Phase Above"] }}</n-button>
      <n-button @click="addPhaseBelow">{{ i18n["Add Phase Below"] }}</n-button>
    </div>

    <div class="mb-3" v-if="property.settings.phaseActive != null">
      {{ i18n['All settings below are relevant to the above phase:'] }}
      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["Phase Name"] }}</label>
        <input
          class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
          v-model="property.settings.phaseActive.name">
      </div>

      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["Aprox Time"] }}</label>
        <Slider v-model="property.settings.phaseActive.aproxTime" :min="100" :max="10000" unit="ms"></Slider>
      </div>

      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["Steps"] }}</label>
        <Slider v-model="property.settings.phaseActive.steps" :min="1" :max="600" unit="steps"></Slider>
      </div>

      <div class="mb-3">
        <p class="tip-content">{{ i18n["animation tip1"] }}</p>
        <br>
        <p>{{ i18n["(end value - start value) / steps"] }}</p>
        <br>
        <p>{{ i18n["^ The above must equal a whole number"] }}</p>
      </div>

      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["Set Defaults"] }}</label>
        <div class="flex">
          <input type="checkbox" id="setDefaults"
            class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            v-model="property.settings.phaseActive.setDefaults">
          <label for="setDefaults" class="ml-2 block  text-white">{{ i18n["Reset settings before animating"] }}</label>
        </div>
      </div>
      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["Start behaviour"] }}</label>
        <div class="flex">
          <input type="checkbox" id="startBehaviourHide"
            class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            v-model="property.settings.phaseActive.startBehaviourHide">
          <label for="startBehaviourHide" class="ml-2 block  text-white">{{ i18n["Hide source before phase starts"] }}</label>
        </div>
      </div>
      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["End behaviour"] }}</label>
        <div class="flex flex-col">
          <div class="flex">
            <input type="checkbox" id="endBehaviourHide"
              class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              v-model="property.settings.phaseActive.endBehaviourHide">
            <label for="endBehaviourHide" class="ml-2 block  text-white">{{ i18n["Hide source at end of phase"] }}</label>
          </div>

          <div class="flex">
            <input type="checkbox" id="endBehaviourRemove"
              class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              v-model="property.settings.phaseActive.endBehaviourRemove">
            <label for="endBehaviourRemove" class="ml-2 block  text-white">{{ i18n["Remove filter at end of phase"] }}</label>
          </div>
        </div>
      </div>
    </div>
    <n-divider></n-divider>
    <div class="mb-3">
      <label class="block  font-medium text-white mb-1">{{ i18n["Record Animation"] }}</label>
      <n-button @click="property.sendToPlugin({record: 'start'})" v-if="!property.settings.recordState">{{ i18n["Record"] }}</n-button>
      <n-button @click="property.sendToPlugin({record: 'end'})" v-else>{{ i18n["End Record"] }}</n-button>
    </div>
    <div class="mb-3 tip-content">
      {{ i18n["animation tip2"] }}
    </div>
    <n-divider></n-divider>
    <div class="mb-3" v-if="property.settings.phaseActive != null">
      {{ i18n["Manual Animation"] }}
      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["Phases"] }}</label>
        <div class="w-full flex">
          <select
            class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors"
            v-model="propertyName">
            <option :value="item.key" v-for="item in propertyList">{{ item.value }}</option>
          </select>
        </div>
      </div>
      <n-collapse>
        <n-collapse-item :title="i18n['For list of valid values *click here*']">
          <div class="tip-content">
            {{ i18n["animation tip3"] }}
            <br>
          </div>
        </n-collapse-item>
      </n-collapse>
      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["Start Value"] }}</label>
        <input type="number" min="0"
          v-model="startValue"
          class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors">
      </div>
      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["End Value"] }}</label>
        <input type="number" min="0"
          v-model="endValue"
          class="w-full p-2 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#505050] focus:outline-none transition-colors">
      </div>
      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["Save"] }}</label>
        <n-button @click="addAnimations">{{ i18n["Add Animation"] }}</n-button>
      </div>
    </div>
    <n-divider></n-divider>
    <div class="mb-3" v-if="property.settings.phaseActive != null">
      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["Animations"] }}</label>
        <div class="max-h-24 min-h-8 overflow-y-auto bg-[#2d2d2d] border border-gray-700 rounded-md p-2">
          <div @click="animationsCurrentIndex = index" v-for="item,index in property.settings.phaseActive.animations" :key="item"
            :class="{ 'bg-blue-500': animationsCurrentIndex == index }"
            class="py-1 px-2 text-gray-200 hover:bg-gray-700 rounded-sm cursor-pointer mb-1 last:mb-0">
            {{ item.type }}: {{ item.startValue }} -> {{ item.endValue }}
          </div>
        </div>
      </div>
      <div class="mb-3">
        <label class="block  font-medium text-white mb-1">{{ i18n["Remove"] }}</label>
        <n-button @click="deleteAnimations">{{ i18n["Remove Animation"] }}</n-button>
      </div>
    </div>
    <div class="mt-4">
      <button @click="logout"
        class="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">{{
          i18n["Disconnect"] }}</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tip-content {
  white-space: pre-wrap;
  /* 保留换行符和所有空格，并自动换行 */
  /* 或者 white-space: pre-line; 如果你希望合并连续空格 */
  font-family: sans-serif;
  /* 可以使用你喜欢的字体 */
  line-height: 1.6;
  /* 调整行高使文本更易读 */
}

/* 针对 Webkit 浏览器（Chrome, Safari 等）的自定义滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
  /* 滚动条宽度 */
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #3a3a3a;
  /* 滚动条轨道背景色，比主背景稍亮 */
  border-radius: 10px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #666;
  /* 滚动条滑块颜色 */
  border-radius: 10px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #888;
  /* 滚动条滑块 hover 颜色 */
}
</style>
