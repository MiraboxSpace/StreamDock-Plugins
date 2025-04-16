import { useI18nStore } from '@/hooks/i18n';
import { usePluginStore, useWatchEvent } from '@/hooks/plugin';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;
  type Settings = {
    flash: boolean; select: string;
  }

  // 事件侦听器
  const plugin = usePluginStore();
  const i18n = useI18nStore()
  useWatchEvent('action', {
    ActionID,
    willAppear({ context }) {
      const action = plugin.getAction(context)
      if (!('select' in action.settings)) {
        const settings = action.settings as Settings;
        settings.select = 'default'
        action.setSettings(action.settings)
      }
      if (!('flash' in action.settings)) {
        const settings = action.settings as Settings;
        settings.flash = false
        action.setSettings(action.settings)
      }
      updateTimer(context)
    },
    didReceiveSettings({ context }) {
      updateTimer(context);
    },
    willDisappear({ context }) {
      plugin.Unterval(context)
      plugin.Unterval(context + 1)
    }
  });

  const month_name = [
    i18n.January, i18n.February, i18n.March, i18n.April, i18n.May, i18n.June, i18n.July, i18n.August, i18n.September, i18n.October, i18n.November, i18n.December
  ];

  const month_sx = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const updateTimer = (context: string) => {
    let date = new Date();
    const action = plugin.getAction(context)
    const settings = action.settings as Settings
    // console.log(settings);

    action.setTitle(formatDateTime(date, settings.select))
    plugin.Unterval(context + 1)
    if (settings.select === 'colon' && settings.flash === true) {
      // setTimeout(()=>{
      //   action.setTitle('')
      // },500)
      plugin.Interval(context + 1, 500, () => {
        action.setTitle('')
      })
    }
    plugin.Unterval(context)
    plugin.Interval(context, 1000, () => updateTimer(context))
  }

  const getCurrentDayOfWeek = () => {
    const daysOfWeek = [i18n.Sunday, i18n.Monday, i18n.Tuesday, i18n.Wednesday, i18n.Thursday, i18n.Friday, i18n.Saturday];
    const currentDate = new Date();
    const dayIndex = currentDate.getDay();
    return daysOfWeek[dayIndex];
  }

  const formatDateTime = (date: Date, select: string) => {
    let title = "";
    switch (select) {
      case "date":
        title = date.toLocaleDateString('en-US');
        break;
      case "date_time_no_am":
        title = date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(", ", "\n");
        break;
      case "date_no_year":
        title = date.toLocaleDateString('en-US').replace(/\/\d{4}$/, "");
        break;
      case "time":
        title = date.toLocaleTimeString('en-US');
        break;
      case "time_24":
        title = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        break;
      case "time_no_s":
        title = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        break;
      case "time_no_s_24":
        title = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: false });
        break;
      case "time_no_s_am":
        title = date.toLocaleTimeString('en-US').slice(0, -6);
        break;
      case "week":
        title = getCurrentDayOfWeek();
        break;
      case "day":
        title = date.getDate().toString().padStart(2, "0");
        break;
      case "month":
        title = (date.getMonth() + 1).toString().padStart(2, "0");
        break;
      case "month_name":
        title = month_name[date.getMonth()];
        break;
      case "month_sx":
        title = month_sx[date.getMonth()];
        break;
      case "year":
        title = date.getFullYear().toString();
        break;
      case "h12":
        let hours = date.getHours();
        if (hours > 12) {
          hours -= 12;
        }
        title = hours.toString().padStart(2, "0");
        break;
      case "h24":
        title = date.getHours().toString().padStart(2, "0");
        break;
      case "m":
        title = date.getMinutes().toString().padStart(2, "0");
        break;
      case "s":
        title = date.getSeconds().toString().padStart(2, "0");
        break;
      case "am":
        title = date.getHours() < 12 ? "AM" : "PM";
        break;
      case "colon":
        title = '∶';
        break;
      default:
        title = date.toLocaleDateString() + "\n" + date.toLocaleTimeString('en-US');
        break;
    }
    return title;
  }
}
