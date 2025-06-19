import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import defaultBg from '/public/images/OBS/0-03.jpg';
export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();
  let stats = {};
  let lastTime = 0;
  const GetStats = async () => {
    //间隔小于1.5秒返回旧数据
    if (Date.now() - lastTime < 1500) {
      return stats;
    }
    await plugin.obs.call('GetStats').then((data) => {
      console.log(data);
      
      if (data.cpuUsage != null) {
        lastTime = Date.now();
        stats = data;
      }
    });
    return stats;
  }
  const createColorImage = (width: number, height: number, hexColor: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // 支持透明度（如 #RRGGBBAA 格式）
    ctx.fillStyle = hexColor; 
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL('image/png');
  }
  const timer = {};
  useWatchEvent('action', {
    ActionID,
    willAppear({ context }) {
      // console.log('创建:', data);
      plugin.Interval(context, 500, async () => {
        const settings = plugin.getAction(context).settings as any;
        const stats = await GetStats() as any;
        let title = stats[settings.framesType] != undefined ? stats[settings.framesType]: "";//outputSkippedFrames,renderSkippedFrames
        plugin.getAction(context).setTitle(title + '');

        if(Number.parseInt(settings.minimum_threshold) < Number.parseInt(title)) {
          if((new Date()).getTime() % 500 > 500) {
            let img = createColorImage(256, 256, settings.color)
            plugin.getAction(context).setImage(img);
          }else {
            plugin.getAction(context).setImage(defaultBg);
          }
        }else {
          plugin.getAction(context).setImage(defaultBg);
        }
      })
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    },
    async keyUp({ payload, context }) {
    },
    propertyInspectorDidAppear(data) {
      plugin.getAction(data.context).sendToPropertyInspector({
        framesTypeList: [
          {
            name: "outputSkippedFrames",
            value: "outputSkippedFrames"
          },
          {
            name: "renderSkippedFrames",
            value: "renderSkippedFrames"
          }
        ] 
      })
    },
    async sendToPlugin({ payload, context }) {
    },
    didReceiveSettings({ payload }) {
      const settings = payload.settings as any
    }
  });
}