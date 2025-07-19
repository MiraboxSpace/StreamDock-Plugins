import { usePluginStore, useWatchEvent } from '@/hooks/plugin';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();
  let cpuUsage = 0;
  let lastTime = 0;
  const getCpuUsage = async () => {
    //间隔小于1.5秒返回旧数据
    if (Date.now() - lastTime < 1500) {
      return cpuUsage;
    }
    await plugin.obs.call('GetStats').then((data) => {
      console.log(data);
      
      if (data.cpuUsage != null) {
        lastTime = Date.now();
        cpuUsage = data.cpuUsage;
      }
    });
    return cpuUsage;
  }
  const timer = {};
  useWatchEvent('action', {
    ActionID,
    willAppear({ context }) {
      // console.log('创建:', data);
      plugin.Interval(context, 1000, async () => {
        const cpuUsage = await getCpuUsage();
        plugin.getAction(context).setTitle(cpuUsage.toFixed(2) + '%');
      })
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    },
    async keyUp({ payload, context }) {
    },
    propertyInspectorDidAppear(data) {
    },
    async sendToPlugin({ payload, context }) {
    },
    didReceiveSettings({ payload }) {
    }
  });
}