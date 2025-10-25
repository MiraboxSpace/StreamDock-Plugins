import { createPinia } from 'pinia';
import Plugin from '@/plugin/index.vue';
import Property from '@/pages/index.vue';

// 软件接口
window.connectSocket = function () {
  window.argv = [arguments[0], arguments[1], arguments[2], JSON.parse(arguments[3]), arguments[4] && JSON.parse(arguments[4])];
  const app = arguments[4] ? createApp(Property) : createApp(Plugin);
  app.use(createPinia()).mount('#app');
};

// 适配接口
window.connectElgatoStreamDeckSocket = window.connectSocket;
