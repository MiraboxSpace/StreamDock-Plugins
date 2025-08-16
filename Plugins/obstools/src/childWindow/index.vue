<!-- 请勿修改此文件 -->
<script setup lang="ts">
import { NConfigProvider, darkTheme, GlobalThemeOverrides, NCollapse, NCollapseItem } from 'naive-ui';
import { useI18nStore } from '@/hooks/i18n';
document.title = window.opener.argv[3].plugin.uuid + ' - 子窗口';
const i18n = useI18nStore();
const ip = ref("127.0.0.1")
const port = ref('4455');
const password = ref('');
const errorMessage = ref('');
const Theme: GlobalThemeOverrides = {
  Select: {
    peers: {
      InternalSelection: {
        color: '#2D2D2D',
        borderRadius: '0px',
        heightMedium: '30px',
        boxShadowFocus: 'none',
        boxShadowActive: 'none',
        border: '1px solid #7a7a7a',
        borderHover: '1px solid #7a7a7a',
        borderFocus: '1px solid #7a7a7a'
      },
      InternalSelectMenu: {
        height: '140px'
      }
    }
  },
  Input: {
    color: '#2D2D2D',
    borderRadius: '0px',
    heightMedium: '30px',
    boxShadowFocus: 'none',
    border: '1px solid #7a7a7a',
    borderHover: '1px solid #7a7a7a'
  },
  Checkbox: {
    boxShadowFocus: 'none'
  }
};

const close = () => {
  window.close()
}

const connect = () => {
  if (ip.value != "" && port.value != "") {
    window.opener.property.setGlobalSettings({
      ip: ip.value,
      port: port.value,
      password: password.value
    })
    window.close();
  } else {
    errorMessage.value = i18n["Please fill in IP and Port"];
  }
}

const open = () => {
  window.opener.property.openUrl('https://github.com/MiraboxSpace/StreamDock-Plugins/tree/main/Plugins/obstools#readme')
}

onMounted(() => {
  ip.value = window.settings.ip;
  port.value = window.settings.port;
  password.value = window.settings.password;
  if (window.settings.connected == false) {
    errorMessage.value = i18n["Connection failed"];
  }
})
</script>

<template>
  <NConfigProvider :theme="darkTheme" :theme-overrides="Theme">
    <div class="min-h-screen bg-[#2c2c2c] text-white p-5 font-sans">
      <div class="max-w-[600px] mx-auto">
        <div class="flex justify-center items-center gap-5 my-5">
          <img src="/images/obs.png" class="w-16 h-16" alt="OBS Logo">
          <div class="w-[30px] h-[2px] bg-[#666]"></div>
          <img src="/images/logo.png" class="w-16 h-16" alt="App Logo">
        </div>

        <hr class="border-[#4a4a4a]" />

        <div class="text-center my-8">
          <h1 class="text-2xl m-0">{{ i18n["Server Info"] }}</h1>
        </div>

        <div class="bg-[#333] p-8 rounded-lg">
          <div class="text-[#ccc] mb-5 leading-relaxed">
            {{ i18n["tips"] }}
            <!-- <span class="text-[#1DB954] cursor-pointer underline" id="open" @click="open">{{ i18n["Click here"] }}</span> -->
            <!-- <span class="text-[#1DB954] cursor-pointer underline" id="open">{{ i18n["Click here"] }}</span> -->
            <n-collapse>
              <n-collapse-item :title="i18n['Click here']" name="1">
                <div v-html="i18n['guide_content']"></div>
              </n-collapse-item>
            </n-collapse>
          </div>

          <div class="space-y-2.5">
            <input type="text" id="IP" placeholder="IP" v-model="ip"
              class="w-full p-3 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#1DB954] focus:outline-none transition-colors">
            <input type="text" id="Port" placeholder="Port" v-model="port"
              class="w-full p-3 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#1DB954] focus:outline-none transition-colors">
            <input type="password" id="Password" placeholder="Password" v-model="password"
              class="w-full p-3 bg-[#3d3d3d] border border-[#4a4a4a] rounded text-white placeholder-gray-400 focus:border-[#1DB954] focus:outline-none transition-colors">
          </div>

          <div class="flex gap-2.5 mt-8">
            <button id="Connect"
              class="flex-1 py-3 px-4 bg-[#1DB954] text-white font-medium rounded hover:brightness-110 transition-all"
              @click="connect">
              {{ i18n["Connect"] }}
            </button>
            <button id="Cancel"
              class="flex-1 py-3 px-4 bg-[#3d3d3d] text-white font-medium rounded hover:brightness-110 transition-all"
              @click="close">
              {{ i18n["Cancel"] }}
            </button>
          </div>

          <div id="errorMessage" class="text-[#ff4444] text-sm mt-2.5 text-center">{{ errorMessage }}</div>
        </div>
      </div>
    </div>
  </NConfigProvider>
</template>

<style>
/* 基本样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  font-size: 9pt;
  color: #e6e6e6;
  user-select: none;
  background-color: #2d2d2d;
  font-family: Arial, sans-serif;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 0;
}

::-webkit-scrollbar-track {
  border-radius: 8px;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
}

::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background-color: #6d6d71;
  outline: 1px solid slategrey;
}
</style>
