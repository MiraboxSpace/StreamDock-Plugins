import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { log } from 'node:console';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();
  const getSourceFilterList = async (sourceUuid: string) => {
    const filters = await plugin.obs.call('GetSourceFilterList', {
      sourceUuid
    });
    return filters.filters
  }
  const setSourceFilterEnabled = async (sourceUuid: string, filterName: string, filterEnabled: boolean) => {
    await plugin.obs.call('SetSourceFilterEnabled', {
      sourceUuid,
      filterName,
      filterEnabled
    });
  }
  const timer = {};
  useWatchEvent('action', {
    ActionID,
    willAppear(data) {
      // console.log('创建:', data);
      plugin.Interval(data.context, 1000, async () => {
        const settings = plugin.getAction(data.context).settings as any;
        if ("filter" in settings) {
          let filterList = await getSourceFilterList(settings.source);
          let item = filterList.find((i: any) => i.filterName == settings.filter);
          if (item) {
            settings.filterEnabled = item.filterEnabled;
            plugin.getAction(data.context).setSettings(settings);
          }
          if (item && item.filterEnabled) {
            plugin.getAction(data.context).setState(1);
          } else {
            plugin.getAction(data.context).setState(0);
          }
        }
      })
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    },
    async keyUp({ payload, context }) {
      const settings = payload.settings;
      console.log(settings);
      if ("source" in settings && "filter" in settings) {
        if ("filterEnabled" in settings) {
          setSourceFilterEnabled(settings.source, settings.filter, !settings.filterEnabled)
          settings.filterEnabled = !settings.filterEnabled;
          plugin.getAction(context).setSettings(settings);
        } else {
          settings.filterEnabled = true;
          plugin.getAction(context).setSettings(settings);
          setSourceFilterEnabled(settings.source, settings.filter, settings.filterEnabled)
        }
      }
    },
    propertyInspectorDidAppear(data) {
      const { context } = data;
      const arr = []
      // 获取场景信息
      // console.log(plugin.obs);
      if (plugin.obs) {
        plugin.obs?.call('GetSceneList').then(async (data) => {
          // console.log(data);
          let tempScenes = data.scenes.map((_: any) => {
            return {
              "sourceName": _.sceneName,
              "sourceUuid": _.sceneUuid
            }
          })
          arr.push(...tempScenes)
          for (const scene of data.scenes) {
            const sceneItems = await plugin.obs.call('GetSceneItemList', {
              sceneName: scene.sceneName
            });
            console.log(sceneItems);
            let tempSceneItems = sceneItems.sceneItems.map((_: any) => {
              return {
                "sourceName": _.sourceName,
                "sourceUuid": _.sourceUuid
              }
            })
            arr.push(...tempSceneItems)
          }
          plugin.getAction(context).sendToPropertyInspector({ sourceList: arr.reverse() })
        }).catch(err => {
          console.log(err);
          setTimeout(() => {
            this.propertyInspectorDidAppear(data)
          }, 500);
        });
      } else {
        setTimeout(() => {
          this.propertyInspectorDidAppear(data)
        }, 500);
      }

    },
    async sendToPlugin({ payload, context }) {

    },
    async didReceiveSettings({ context, payload }) {
      const settings = (payload.settings as any);
      console.log(settings);
      if ("source" in settings) {
        let filterList = await getSourceFilterList(settings.source);
        plugin.getAction(context).sendToPropertyInspector({ filterList: filterList })
      }
      if ("filter" in settings) {
        let filterList = await getSourceFilterList(settings.source);
        let item = filterList.find((i: any) => i.filterName == settings.filter);
        if (item) {
          settings.filterEnabled = item.filterEnabled;
          plugin.getAction(context).setSettings(settings);
        }
        if (item && item.filterEnabled) {
          plugin.getAction(context).setState(1);
        } else {
          plugin.getAction(context).setState(0);
        }
      }
    }
  });
}
