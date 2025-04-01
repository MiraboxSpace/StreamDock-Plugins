import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { useI18nStore } from '@/hooks/i18n';
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { debounce } from 'lodash';
import hljs from 'highlight.js';
import { useEventStore } from '@/hooks/event';
import { useWindowUtil, useOpenAiSdk } from '@/hooks/useAiUtil';

// action 实例
const instances: { [key: string]: AiType.apiConfig } = {};
const windowList: { [key: string]: WindowProxy | null } = {}

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;
  const i18n = useI18nStore();
  // 事件侦听器
  const plugin = usePluginStore();
  const eventStore = useEventStore();
  const windowUtil = useWindowUtil(windowList);
  const openAiSdk = useOpenAiSdk(instances);
  // const apiConfig = { 'baseUrl': '', 'modelId': '', 'apiKey': '' };
  useWatchEvent('action', {
    ActionID,
    willAppear({ context, payload }) {
      console.log('创建:', context, payload.settings);
      if ('baseUrl' in payload.settings) {
        instances[context] = (payload.settings as AiType.apiConfig);
      } else {
        // 默认值
        instances[context] = {
          baseUrl: 'https://api.deepseek.com',
          modelId: 'deepseek-chat',
          apiKey: ''
        };
        plugin.getAction(context).setSettings(instances[context])
      }

      (window as any).deepseekApp = {
        requestAi: openAiSdk.requestAi,
        marked: (str: string) => marked.parse(str),
        getData: (context: string) => {
          return (plugin.getAction(context).settings as any).data ? (plugin.getAction(context).settings as any).data : []
        },
        setData: (context: string, str: string) => {
          let settings = plugin.getAction(context).settings
          plugin.getAction(context).setSettings({ ...settings, data: str })
        },
        openUrl: (url: string) => {
          plugin.getAction(context).openUrl(url)
        },
        i18n: i18n,
        eventStore: eventStore
      }
    },
    didReceiveSettings({ context, payload }) {
      console.log(payload.settings)
      Object.keys(instances[context]).forEach(key => {
        instances[context][key] = payload.settings[key]
      })
      console.log(instances[context])
    },
    sendToPlugin({ context, payload }) {
      if(payload.action == 'guide') {
        windowUtil.openCenteredWindow(context, `./deepseek-info.html`, 1200, 800);
      }
      if (payload.action == 'open') {
        openAiWindow(context);
      }
    },
    keyDown({ context, event }) {
      if(!windowUtil.isWindowClosed(context)) {
        eventStore.emit('keyDown', 'voice');
      }
    },
    keyUp({ context, event }) {
      if(windowUtil.isWindowClosed(context)) {
        openAiWindow(context);
      }else {
        eventStore.emit('keyUp', 'voice');
      }
    }
  });
  
  const marked = new Marked(
    markedHighlight({
      emptyLangClass: 'hljs',
      langPrefix: 'hljs language-',
      highlight(code, lang, info) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
    })
  );
  const openAiWindow = debounce((context: string) => {
    let valueFlag = true
    console.log(instances[context], context, instances)
    Object.keys(instances[context]).forEach(key => {
      if (instances[context][key] == '') {
        valueFlag = false
        return
      }
    })

    if (valueFlag) {
      windowUtil.openCenteredWindow(context, `./index.html?appName=deepseekApp&context=${context}`, 1200, 800);
    } else {
      plugin.getAction(context).showAlert(context)
    }

  }, 500, true)
}
