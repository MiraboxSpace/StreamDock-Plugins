<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';
import { ref } from 'vue';

// 事件侦听器
const i18n = useI18nStore();
const property = usePropertyStore();
const query = ref(property.settings.query);
const palace = ref(property.settings.palace);
const refresh = ref(property.settings.refresh);
if (!("query" in property.settings)) {//解决第一次拖出来搜索框没值的问题
  if (window.argv[3].application.language == "zh_CN") {
    query.value = "北京";
  } else {
    query.value = "New York";
  }
}
useWatchEvent({
  didReceiveSettings(data) {
    // query.value = property.settings.query;
    palace.value = property.settings.palace;
  },
  sendToPropertyInspector(data) { }
});
const send = () => {
  if (query.value.trim() == "") {
    return;
  }
  debouncedSendToPlugin();
}
const handleChange = () => {
  property.sendToPlugin({ palace: palace.value })
}

const handleChange2 = () => {
  property.sendToPlugin({ refresh: refresh.value })
}
const debounce = (fn: Function, delay: number) => {
  let timer: ReturnType<typeof setTimeout>;

  return function (...args: any[]) {
    if (timer) clearTimeout(timer); // 每次触发时，清除之前的定时器
    timer = setTimeout(() => {
      fn.apply(this, args); // 只执行最后一次触发后的操作
    }, delay);
  };
}

const debouncedSendToPlugin = debounce(() => {
  property.sendToPlugin({ query: query.value })
}, 500);
const refreshs = [
  {
    label: i18n["半小时"],
    value: 30 * 60 * 1000
  },
  {
    label: i18n["一小时"],
    value: 60 * 60 * 1000
  },
  {
    label: i18n["两小时"],
    value: 120 * 60 * 1000
  },
  {
    label: i18n["三小时"],
    value: 180 * 60 * 1000
  }
]
</script>

<template>
  <div class=" px-2 text-right main w-[350px]">
    <div class="flex items-center my-4 mt-0">
      <label class="text-white w-40">{{
        i18n['搜索'] + "：" }}</label>
      <div class="flex-1">
        <input @input="send" v-model="query" type="text" maxlength="255" placeholder="Enter text here..."
          class="w-full p-2 border-none outline-none bg-[#3d3d3d] text-white" />
      </div>
    </div>
    <div class="flex items-center my-4 mt-0">
      <label class="text-white w-40">{{
        i18n['搜索结果'] + "：" }}</label>
      <div class="flex-1">
        <select id="selectFont" v-model="palace" @change="handleChange"
          class="w-full p-2 border-none outline-none bg-[#3d3d3d] text-white">
          <option v-for="option in property.settings.address" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>
    </div>
    <div class="flex items-center my-4 mt-0">
      <label class="text-white w-40">{{
        i18n['更新频率'] + "：" }}</label>
      <div class="flex-1">
        <select id="selectFont" v-model="refresh" @change="handleChange2"
          class="w-full p-2 border-none outline-none bg-[#3d3d3d] text-white">
          <option v-for="option in refreshs" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>
    <div class="flex items-center my-4 mt-0">
      <label class="text-white w-40">{{ i18n['单位'] + '：' }}</label>
      <div class="flex">
        <label class="flex min-w-24 items-center">
          <input type="radio" name="tempList" value="℃" v-model="property.settings.tempList" class="mr-2" />
          ℃
        </label>
        <label class="flex min-w-24 items-center ml-2">
          <input type="radio" name="tempList" value="℉" v-model="property.settings.tempList" class="mr-2" />
          ℉
        </label>
      </div>
    </div>
    <div class="flex items-center my-4 mt-0">
      <label class="text-white w-40">{{ i18n['模式'] + '：' }}</label>
      <div class="flex">
        <label class="flex min-w-24 items-center">
          <input type="radio" name="mode" value="icon" v-model="property.settings.mode" class="mr-2" />
          {{ i18n["图标"] }}
        </label>
        <label class="flex min-w-24 items-center ml-2">
          <input type="radio" name="mode" value="text" v-model="property.settings.mode" class="mr-2" />
          {{ i18n["文本"] }}
        </label>
      </div>
    </div>
    <div class="flex items-center my-4 mt-0" v-show="property.settings.mode === 'icon'">
      <label class="text-white w-40">{{ i18n['城市名称'] + '：' }}</label>
      <div class="flex">
        <label class="flex min-w-24 items-center">
          <input type="radio" name="custom" :value="false" v-model="property.settings.custom" class="mr-2" />
          {{ i18n["默认"] }}
        </label>
        <label class="flex min-w-24 items-center ml-2">
          <input type="radio" name="custom" :value="true" v-model="property.settings.custom" class="mr-2" />
          {{ i18n["自定义"] }}
        </label>
      </div>
    </div>
    <div class="flex items-center my-4 mt-0" v-show="property.settings.custom && property.settings.mode === 'icon'">
      <label class="text-white w-40">{{
        i18n['自定义'] + "：" }}</label>
      <div class="flex-1">
        <input v-model="property.settings.customName" type="text" maxlength="255" placeholder="Enter text here..."
          class="w-full p-2 border-none outline-none bg-[#3d3d3d] text-white" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
input[type="radio"] {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid #6602fe;
  border-radius: 50%;
  position: relative;
  cursor: pointer;
  outline: none;
}

input[type="radio"]:checked::before {
  content: "";
  position: absolute;
  top: 1px;
  left: 1px;
  width: 10px;
  height: 10px;
  background-color: #6602fe;
  border-radius: 50%;
  display: block;
}
</style>
