import { usePluginStore, useWatchEvent } from '@/hooks/plugin';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;
  type Settings = {
    lastClick: number; select: string; status: boolean; start: number; deep: number; isBackgroundHidden: boolean 
};

  // 事件侦听器
  const plugin = usePluginStore();

  plugin.Interval('global', 100, () => {
    const Actions = plugin.getActions(ActionID);

    Actions.forEach((item) => {
      const settings = item.settings as Settings;
      settings.start = settings.start ?? Date.now();

      // 暂停
      if (!settings.status) {
        settings.start += 100;
        item.setSettings(settings);
        return;
      }

      // 开始
      const deep = Date.now() - settings.start;
      if (Math.floor(settings.deep / 1000) !== Math.floor(deep / 1000)) {
        settings.deep = deep;
        canvasFunc(item);
      }

      settings.deep = deep;
      item.setSettings(settings);
    });
  });

  // 绘制方法
  const canvasFunc = async (action: any) => {
    const titleParameters = action.titleParameters
    // console.log(titleParameters);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.height = 126;

    const settings = action.settings as Settings;
    const s = Math.floor(settings.deep / 1000);
    const m = String(Math.floor((s / 60) % 60)).padStart(2, '0');
    const h = String(Math.floor(s / 60 / 60)).padStart(2, '0');

    // 适配水冷屏 透明底图
    if (!settings.isBackgroundHidden) {
      const image = new Image();
      image.src = settings.status ? './images/T2.jpg' : './images/T1.jpg';
      await new Promise((resolve) => (image.onload = resolve));
      ctx.drawImage(image, 0, 0, 126, 126);
    }

    ctx.textAlign = 'center';

    // ctx.fillStyle = 'rgb(0,255,0)';
    ctx.fillStyle = titleParameters.titleColor;
    if (settings.select === '0') {
      // ctx.font = 'bold 27px sans-serif';
      ctx.font = `${titleParameters.fontStyle == "Regular" ? "" : titleParameters.fontStyle} ${titleParameters.fontSize + 11}px 'GEFORCE'`;
      ctx.fillText(`${h}:${m}:${String(s % 60).padStart(2, '0')}`, 63, 70);
      if (titleParameters.fontUnderline) {
        let textMetrics = ctx.measureText(`${h}:${m}:${String(s % 60).padStart(2, '0')}`);
        let underlineHeight = 1;
        ctx.fillRect(63 - (textMetrics.width / 2), 72 , textMetrics.width, underlineHeight);
      }
    } else {
      // ctx.font = 'bold 40px sans-serif';
      ctx.font = `${titleParameters.fontStyle == "Regular" ? "" : titleParameters.fontStyle} ${titleParameters.fontSize + 24}px 'GEFORCE'`;
      ctx.fillText(`${m}:${String(s % 60).padStart(2, '0')}`, 63, 70);
      if (titleParameters.fontUnderline) {
        let textMetrics = ctx.measureText(`${m}:${String(s % 60).padStart(2, '0')}`);
        let underlineHeight = 1;
        ctx.fillRect(63 - (textMetrics.width / 2), 72 , textMetrics.width, underlineHeight);
      }
    }

    action.setImage(canvas.toDataURL('image/png'));
  };

  //重置时间
  const Reset = (context: string) => {
    const instance = plugin.getAction(context);
    const settings = instance.settings as Settings;
    settings.start = Date.now();
    settings.deep = 0;
    settings.status = false;
    instance.setSettings(settings);
    canvasFunc(instance);
  };

  let isDbclick = false;
  useWatchEvent('action', {
    ActionID,
    willAppear({ context }) {
      const instance = plugin.getAction(context);
      const settings = instance.settings as Settings;
      settings.start = Date.now() - settings.deep;
      setTimeout(()=>{
        canvasFunc(instance);
      },100)
    },
    titleParametersDidChange({ context }) {
      canvasFunc(plugin.getAction(context));
    },
    keyUp({ context }) {
      if (isDbclick) {
        isDbclick = false;
        return;
      }
      const now = new Date().getTime()
      plugin.Unterval(context);
      const instance = plugin.getAction(context);
      const settings = instance.settings as Settings;

      if ((now - settings.lastClick) <= 300) {
        isDbclick = false;
        Reset(context);
        return
      }
      settings.lastClick = now;
      settings.status = !settings.status;
      canvasFunc(instance);
    },
    keyDown({ context }) {
      plugin.Interval(context, 500, () => {
        isDbclick = true;
        Reset(context);
        plugin.Unterval(context);
      });
    },
    sendToPlugin(data) {
      data.payload.event === 'dbclick' ? Reset(data.context) : this.keyUp(data as any);
    },
    didReceiveSettings(data) {
      const instance = plugin.getAction(data.context);
      canvasFunc(instance);
    }
  });
}
