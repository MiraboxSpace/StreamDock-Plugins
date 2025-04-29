import { usePluginStore, useWatchEvent } from '@/hooks/plugin';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;
  type Settings = {
    lastClick: number; timing: number; status: boolean; select: string; isBackgroundHidden: boolean; surplus: number; musicUrl: string; color: string; inputTime: number
  };

  // 事件侦听器
  const plugin = usePluginStore();

  //全局扫描线程
  plugin.Interval('global_countdown', 100, () => {
    const Actions = plugin.getActions(ActionID);

    Actions.forEach((item) => {
      const settings = item.settings as Settings;
      // 暂停

      if (!settings.status || settings.surplus < -100) {
        return;
      }

      // 启动
      settings.surplus -= 100;
      if (Math.floor(settings.surplus / 1000) != Math.floor((settings.surplus + 100) / 1000)) {
        canvasFunc(item.context);
      }
      item.setSettings(settings);
    });
  });
  //画布
  const canvasFunc = async (context: string) => {
    const instance = plugin.getAction(context);
    const titleParameters = instance.titleParameters
    // console.log(titleParameters.fontFamily);

    const settings = instance.settings as Settings;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.height = 126;

    const s = Math.ceil(settings.surplus / 1000);
    const m = String(Math.floor((s / 60) % 60)).padStart(2, '0');
    const h = String(Math.floor(s / 60 / 60)).padStart(2, '0');
    if (!settings.isBackgroundHidden) {
      const image = new Image();
      image.src = settings.status ? './images/C2.jpg' : './images/C1.jpg';
      await new Promise((resolve) => (image.onload = resolve));
      ctx.drawImage(image, 0, 0, 126, 126);
    }
    if (!Audios[context].paused) Audios[context].pause();
    ctx.textAlign = 'center';
    if (settings.surplus < 0) {
      ctx.fillStyle = settings.color;
      ctx.fillRect(0, 0, 126, 126);
      // ctx.fillStyle = 'rgb(255,255,255)';
      ctx.fillStyle = titleParameters.titleColor;
      // ctx.font = 'bold 28px sans-serif';
      ctx.font = `${titleParameters.fontStyle == "Regular" ? "" : titleParameters.fontStyle} ${titleParameters.fontSize + 12}px 'GEFORCE'`;
      ctx.fillText(`TIMEOUT`, 63, 64);
      // if (titleParameters.fontUnderline) {
      //   let textMetrics = ctx.measureText(`TIMEOUT`);
      //   let underlineHeight = 1;
      //   ctx.fillRect(63 - (textMetrics.width / 2), 66 , textMetrics.width, underlineHeight);
      // }
      instance.setImage(canvas.toDataURL('image/png'));
      Audios[instance.context].src = settings.musicUrl;
      Audios[instance.context].play();
      return;
    }

    // ctx.fillStyle = 'rgb(225,44,203)';
    ctx.fillStyle = titleParameters.titleColor;
    if (settings.select === '0') {
      // ctx.font = 'bold 27px sans-serif';
      ctx.font = `${titleParameters.fontStyle == "Regular" ? "" : titleParameters.fontStyle} ${titleParameters.fontSize + 11}px 'GEFORCE'`;
      ctx.fillText(`${h}:${m}:${String(s % 60).padStart(2, '0')}`, 63, 70);
      if (titleParameters.fontUnderline) {
        let textMetrics = ctx.measureText(`${h}:${m}:${String(s % 60).padStart(2, '0')}`);
        let underlineHeight = 1;
        ctx.fillRect(63 - (textMetrics.width / 2), 72, textMetrics.width, underlineHeight);
      }
    } else {
      // ctx.font = 'bold 40px sans-serif';
      ctx.font = `${titleParameters.fontStyle == "Regular" ? "" : titleParameters.fontStyle} ${titleParameters.fontSize + 24}px 'GEFORCE'`;
      ctx.fillText(`${m}:${String(s % 60).padStart(2, '0')}`, 63, 70);
      if (titleParameters.fontUnderline) {
        let textMetrics = ctx.measureText(`${m}:${String(s % 60).padStart(2, '0')}`);
        let underlineHeight = 1;
        ctx.fillRect(63 - (textMetrics.width / 2), 72, textMetrics.width, underlineHeight);
      }
    }

    instance.setImage(canvas.toDataURL('image/png'));
  };

  //重置时间
  const Reset = (context: string) => {
    const instance = plugin.getAction(context);
    const settings = instance.settings as Settings;
    String(settings.timing) === 'custom' ? (settings.surplus = settings.inputTime) : (settings.surplus = settings.timing);
    settings.status = false;
    instance.setSettings(settings);
    canvasFunc(context);
  };

  let isDbclick = false;
  let changeTime: { [k: string]: number } = {};
  const Audios: { [k: string]: HTMLAudioElement } = {};
  useWatchEvent('action', {
    ActionID,
    titleParametersDidChange({ context }) {
      canvasFunc(context);
    },
    willAppear({ context }) {
      Audios[context]?.pause();
      delete Audios[context];
      Audios[context] = new Audio();
      Audios[context].loop = true;
      setTimeout(() => {
        canvasFunc(context);
      }, 100)
    },
    willDisappear({ context }) {
      Audios[context]?.pause();
    },
    keyUp({ context }) {
      if (isDbclick) {
        isDbclick = !isDbclick;
        return;
      }

      //点击时启动或暂停
      const now = new Date().getTime()

      plugin.Unterval(context);
      const instance = plugin.getAction(context);
      const settings = instance.settings as Settings;
      if ((now - settings.lastClick) <= 300 || settings.surplus < 0) {
        isDbclick = false;
        Reset(context);
        return
      }
      settings.lastClick = now;
      settings.status = !settings.status;
      instance.setSettings(settings)
      changeTime[context] = settings.timing;
      canvasFunc(context);
    },
    keyDown({ context }) {
      // 长按重置
      plugin.Interval(context, 500, () => {
        isDbclick = !isDbclick;
        Reset(context);
        plugin.Unterval(context);
      });
    },
    sendToPlugin(data) {
      const instance = plugin.getAction(data.context);
      const settings = instance.settings as Settings;
      if (data.payload.event == 'dbclick') {
        Reset(data.context);
        return;
      } else if (data.payload.event == 'click') {
        this.keyUp(data as any);
        return;
      }

      if (data.payload.event === 'counss') {
        (settings.timing as unknown as string) = data.payload.value;
      }
      if (data.payload.event === 'input') {
        settings.inputTime = data.payload.value;
      }
      instance.setSettings(settings);
      Reset(data.context);
      return;
    },
    didReceiveSettings(data) {
      canvasFunc(data.context);
    }
  });
}
