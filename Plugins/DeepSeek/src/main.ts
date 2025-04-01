import { createPinia } from 'pinia';
import router from './router'
import Plugin from '@/plugin/index.vue';
import Property from '@/pages/index.vue';
import deepseekApp from '@/views/deepseek/deepseek-app.vue';
import hexagramsApp from '@/views/hexagrams/hexagrams-app.vue';
import { ContextKey, RequestAiKey, MarkedKey, SetDataKey, GetDataKey, I18nKey, OpenUrlKey, EventStoreKey } from '@/hooks/injectionKeys';
;(() => {
    // 获取查询字符串部分
  const queryString = window.location.search;

  // 使用 URLSearchParams 来解析查询字符串
  const urlParams = new URLSearchParams(queryString);

  // 获取单个参数
  const appName = urlParams.get('appName');

  if(appName == 'deepseekApp') {
    const app = createApp(deepseekApp)
    const { requestAi, marked, setData, getData, i18n, openUrl, eventStore } = window.opener.deepseekApp;
    app.provide(ContextKey, urlParams.get('context'));
    app.provide(RequestAiKey, requestAi);
    app.provide(MarkedKey, marked);
    app.provide(SetDataKey, setData);
    app.provide(GetDataKey, getData);
    app.provide(I18nKey, i18n);
    app.provide(OpenUrlKey, openUrl);
    app.provide(EventStoreKey, eventStore);
    app.use(router).use(createPinia()).mount('#app');
  }
  if(appName == 'hexagramsApp') {
    const app = createApp(hexagramsApp)
    const { requestAi, marked, setData, getData, i18n, openUrl, eventStore } = window.opener.hexagramsApp;
    app.provide(ContextKey, urlParams.get('context'));
    app.provide(RequestAiKey, requestAi);
    app.provide(MarkedKey, marked);
    app.provide(SetDataKey, setData);
    app.provide(GetDataKey, getData);
    app.provide(I18nKey, i18n);
    app.provide(OpenUrlKey, openUrl);
    app.provide(EventStoreKey, eventStore);
    app.use(router).use(createPinia()).mount('#app');
  }

})()

// 软件接口
window.connectElgatoStreamDeckSocket = function () {
  window.argv = [arguments[0], arguments[1], arguments[2], JSON.parse(arguments[3]), arguments[4] && JSON.parse(arguments[4])];
  const app = arguments[4] ? createApp(Property) : createApp(Plugin);
  app.use(createPinia()).mount('#app');
};