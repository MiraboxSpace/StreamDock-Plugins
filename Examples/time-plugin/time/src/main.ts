import { createPinia } from 'pinia';
import Plugin from '@/plugin/index.vue';
import Property from '@/pages/index.vue';

// 软件接口 为了兼容Elgato我们使用和他们一样的函数名称这样您开发的插件可以兼容elgato的软件
window.connectElgatoStreamDeckSocket = function () {
  window.argv = [arguments[0], arguments[1], arguments[2], JSON.parse(arguments[3]), arguments[4] && JSON.parse(arguments[4])];
  const app = arguments[4] ? createApp(Property) : createApp(Plugin);
  app.use(createPinia()).mount('#app');
};

//添加字体
const font = new FontFace('GEFORCE', 'url(./fonts/GEFORCE-BOLD.TTF)');

font.load().then(function (loadedFont) {
  document.fonts.add(loadedFont);
  document.body.style.fontFamily = '"GEFORCE", sans-serif';
}).catch(function (error) {
  console.error('Failed to load font:', error);
});