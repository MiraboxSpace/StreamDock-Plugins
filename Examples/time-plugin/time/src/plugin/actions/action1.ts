import { useI18nStore } from '@/hooks/i18n';
import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { ledSetValue } from '@/utils';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;
  type Settings = {
    title: string; select: string; zone: string; theme: string; amplify: boolean; showType: string; isBackgroundHidden: boolean
  };

  const i18n = useI18nStore()

  // 返回指定时区时间并格式化
  const Times = {} as { [k: string]: { Y: string; M: string; D: string; h: string; m: string; s: string } };
  const getZoneTime = (zone: string) => {
    const offest = new Date().getTimezoneOffset();
    const diff = zone === 'system' ? -(offest / 60) : +zone;
    const date = new Date(Date.now() + offest * 60 * 1000 + diff * 3600 * 1000);
    const Y = date.getFullYear().toString().replace(/^\d{2}/, "");
    const M = (date.getMonth() + 1 + '').padStart(2, '0');
    const D = (date.getDate() + '').padStart(2, '0');
    const h = (date.getHours() + '').padStart(2, '0');
    const m = (date.getMinutes() + '').padStart(2, '0');
    const s = (date.getSeconds() + '').padStart(2, '0');
    return { Y, M, D, h, m, s };
  };

  const getCurrentDayOfWeek = () => {
    const daysOfWeek = [i18n.Sunday, i18n.Monday, i18n.Tuesday, i18n.Wednesday, i18n.Thursday, i18n.Friday, i18n.Saturday];
    const currentDate = new Date();
    const dayIndex = currentDate.getDay();
    return daysOfWeek[dayIndex];
  }

  // 绘制图片
  const canvasFunc = (context: string) => {
    const instance = plugin.getAction(context);
    const titleParameters = instance.titleParameters

    const settings = instance.settings as Settings;
    const { Y, M, D, h, m, s } = Times[context] || getZoneTime(settings.zone);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.height = 126;
    // let size = 8;

    const themeFunc = {
      async theme1() {
        const image = new Image();
        image.src = './images/index.jpg';
        await new Promise((resolve) => (image.onload = resolve));
        ctx.drawImage(image, 0, 0, 126, 126);

        ctx.textAlign = 'center';
        ctx.fillStyle = instance.titleParameters.titleColor;

        const offset = instance.titleParameters.showTitle ? 0 : 13;
        if (settings.select === '1') {
          ctx.font = `${titleParameters.fontStyle == "Regular" ? "" : titleParameters.fontStyle} ${titleParameters.fontSize + 17}pt 'GEFORCE'`;
          ctx.fillText(`${h}:${m}`, 63, 70 + offset);
          if (titleParameters.fontUnderline) {
            let textMetrics = ctx.measureText(`${h}:${m}`);
            let underlineHeight = 1;
            ctx.fillRect(63 - (textMetrics.width / 2), 72 + offset, textMetrics.width, underlineHeight);
          }
        } else if (settings.select === '0') {
          ctx.font = `${titleParameters.fontStyle == "Regular" ? "" : titleParameters.fontStyle} ${titleParameters.fontSize + 8}pt 'GEFORCE'`;
          ctx.fillText(`${h}:${m}:${s}`, 63, 80 + offset);
          if (titleParameters.fontUnderline) {
            let textMetrics = ctx.measureText(`${h}:${m}:${s}`);
            let underlineHeight = 1;
            ctx.fillRect(63 - (textMetrics.width / 2), 82 + offset, textMetrics.width, underlineHeight);
          }
          ctx.font = `${titleParameters.fontStyle == "Regular" ? "" : titleParameters.fontStyle} ${titleParameters.fontSize + 8}pt 'GEFORCE'`;
          ctx.fillText(`${Y}/${M}/${D}`, 63, 50 + offset);
          if (titleParameters.fontUnderline) {
            let textMetrics = ctx.measureText(`${Y}/${M}/${D}`);
            let underlineHeight = 1;
            ctx.fillRect(63 - (textMetrics.width / 2), 52, textMetrics.width, underlineHeight);
          }
        } else {
          ctx.font = `${titleParameters.fontStyle == "Regular" ? "" : titleParameters.fontStyle} ${titleParameters.fontSize + 8}pt 'GEFORCE'`;
          let week = getCurrentDayOfWeek()
          ctx.fillText(week, 63, 70 + offset);
          if (titleParameters.fontUnderline) {
            let textMetrics = ctx.measureText(week);
            let underlineHeight = 1;
            ctx.fillRect(63 - (textMetrics.width / 2), 72, textMetrics.width, underlineHeight);
          }
        }
      },
      async theme2() {

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 126, 126);

        ctx.textAlign = 'center';
        ctx.fillStyle = instance.titleParameters.titleColor;

        const offset = instance.titleParameters.showTitle ? 0 : 13;
        ctx.font = `${titleParameters.fontStyle == "Regular" ? "" : titleParameters.fontStyle} ${titleParameters.fontSize + 8}pt 'GeForce'`;
        ledSetValue(ctx, [h, m], offset);
      }
    };

    (async () => {
      await themeFunc[settings.theme]?.();
      ctx.font = `${titleParameters.fontStyle == "Regular" ? "" : titleParameters.fontStyle} ${titleParameters.fontSize + 8}pt 'GeForce'`;
      let title = settings.title
      ctx.fillText(title, 63, 120);
      if (titleParameters.fontUnderline) {
        let textMetrics = ctx.measureText(title);
        let underlineHeight = 1;
        ctx.fillRect(63 - (textMetrics.width / 2), 122, textMetrics.width, underlineHeight);
      }
      instance.setImage(canvas.toDataURL('image/png'));
    })();
  };

  // 事件侦听器
  const plugin = usePluginStore();
  let zones = {};
  useWatchEvent('action', {
    ActionID,
    titleParametersDidChange({ context }) {
      canvasFunc(context);
    },
    keyUp({ context }) {
      const instance = plugin.getAction(context);
      const settings = instance.settings as Settings;
      settings.select = settings.select === '0' ? '1' : settings.select === '1' ? '2' : '0';
      instance.setSettings(settings);
      canvasFunc(context);
    },
    willAppear({ context }) {
      const settings = plugin.getAction(context).settings as Settings;
      if (settings.select == undefined) {
        settings.select = '1'
        plugin.getAction(context).setSettings(settings)
      }
      if (settings.title == undefined) {
        settings.title = settings.zone === 'system' ? 'SYS' : `UTC${settings.zone}`
        plugin.getAction(context).setSettings(settings)
      }
      plugin.Unterval(context);
      plugin.Interval(context, 100, () => {
        const settings = plugin.getAction(context).settings as Settings;
        const temp = getZoneTime(settings.zone);
        if (JSON.stringify(temp) !== JSON.stringify(Times[context])) {
          Times[context] = temp;
          canvasFunc(context);
        }
      });
    },
    didReceiveSettings({ context }) {
      const settings = plugin.getAction(context).settings as Settings;
      if (settings.zone != zones[context]) {
        settings.title = settings.zone === 'system' ? 'SYS' : `UTC${settings.zone}`;
      }
      zones[context] = settings.zone;
      plugin.getAction(context).setSettings(settings)
      canvasFunc(context);
    },
    willDisappear({ context }) {
      delete Times[context];
      plugin.Unterval(context);
    }
  });
}
