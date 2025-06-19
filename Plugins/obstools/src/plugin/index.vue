<script setup lang="ts">
import { useWatchEvent, usePluginStore } from '@/hooks/plugin';
import { OBSWebSocket } from 'obs-websocket-js';

Object.entries(import.meta.glob('@/plugin/actions/*.ts', { eager: true, import: 'default' })).forEach(([path, fn]) =>
  (fn as Function)(path.replace('/src/plugin/actions/', '').replace('.ts', ''))
);

const plugin = usePluginStore();
window.addEventListener('unhandledrejection', (event) => {
  // console.error('Unhandled Promise Rejection:', event.reason.message);
  if (event.reason.message == "Not connected") {
    // console.log("断开连接");
    if (!("connected" in plugin.globalSettings)) {
      plugin.globalSettings.connected = false;
      plugin.setGlobalSettings(plugin.globalSettings);
    }
  } else {
    console.error('Unhandled Promise Rejection:', event.reason.message);
  }
});
window.addEventListener('error', (event) => {
  console.error('Uncaught Error:', event.error); // 或 event.message
});

// 事件侦听器
useWatchEvent('plugin', {
  deviceDidConnect(data) {
    console.log("deviceDidConnect:", data);

  },
  deviceDidDisconnect(data) {
    console.log("deviceDidDisconnect:", data);

  },
  didReceiveGlobalSettings(data) {
    const settings = data.payload.settings as any;
    console.log("====================", data.payload.settings);
    if (settings != undefined && "ip" in settings) {
      plugin.obs = new OBSWebSocket();
      plugin.obs.connect(`ws://${settings.ip}:${settings.port}`, settings.password).then(() => {
        console.log('OBS连接成功');
      }).catch((err) => {
        console.error('OBS连接错误:', err);
        settings.connected = false;
        plugin.setGlobalSettings(settings);
      });
    } else {
      plugin.obs?.disconnect();
      plugin.obs = null;
    }
  },
  systemDidWakeUp(data) { },
  applicationDidTerminate(data) {
    console.log(data);
  },
  applicationDidLaunch(data) {
    console.log(data);
  }
});
</script>

<template></template>

<style lang="scss" scoped></style>
