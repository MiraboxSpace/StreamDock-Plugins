import { useI18nStore } from '@/hooks/i18n';
import axios from 'axios';
import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, LineSeriesOption } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { GridComponent, GridComponentOption } from 'echarts/components';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();
  const i18n = useI18nStore();

  useWatchEvent('action', {
    ActionID,
    willAppear({ context, payload }) {
      const action = plugin.getAction(context);
      getData(action, context)
    },
    willDisappear({ context }) {
      plugin.Unterval(context)
    },
    sendToPlugin({ context, payload }) {
      const action = plugin.getAction(context);
      if ('select' in payload) {
        action.setSettings({ select: payload.select });
        getData(action, context)
      }
    },
    keyUp({ context, payload: { settings } }) {
      const action = plugin.getAction(context);
      action.openUrl('https://www.huilvbiao.com/gold')
    },
    didReceiveSettings({ context, payload: { settings } }) {
    }
  });


  //获取最新行情
  const getData = (action: any, context: any) => {
    try {
      async function fn() {
        axios.get(`https://www.huilvbiao.com/api/gold_indexApi?t=${new Date().getTime()}`).then((res) => {
          // console.log(res.data);
          const arr = res.data.split(';')

          const dataArray = arr[0].split('="')[1].split(",");
          const gold1 = {
            price: 0,
            closingPrice: 0,
            name: ''
          }
          gold1.price = parseFloat(dataArray[0])
          gold1.closingPrice = parseFloat(dataArray[7])
          gold1.name = dataArray[dataArray.length - 1].replace(/"/g, '')

          const dataArray2 = arr[1].split('="')[1].split(",");
          const gold2 = {
            price: 0,
            closingPrice: 0,
            name: ''
          }
          gold2.price = parseFloat(dataArray2[0])
          gold2.closingPrice = parseFloat(dataArray2[7])
          gold2.name = dataArray2[dataArray2.length - 2]

          const dataArray3 = arr[2].split('="')[1].split(",");
          const gold3 = {
            price: 0,
            closingPrice: 0,
            name: ''
          }
          gold3.price = parseFloat(dataArray3[0])
          gold3.closingPrice = parseFloat(dataArray3[7])
          gold3.name = dataArray3[dataArray3.length - 1].replace(/"/g, '')

          if ('select' in action.settings) {
            action.setSettings({ select: action.settings.select });
          } else {
            action.setSettings({ select: '1' });
          }

          let title = ''
          let url = ''

          switch (action.settings.select) {
            case '1':
              title = `${i18n.name1}\n${i18n.涨跌}:${(((gold1.price - gold1.closingPrice) / gold1.closingPrice) * 100).toFixed(2)}%\n${i18n.价格}:${gold1.price}`;
              url = 'https://image.sinajs.cn/newchart/v5/futures/mins/AU0.gif'
              break;
            case '2':
              title = `${i18n.name2}\n${i18n.涨跌}:${(((gold2.price - gold2.closingPrice) / gold2.closingPrice) * 100).toFixed(2)}%\n${i18n.价格}:${gold2.price}`;
              url = 'https://image.sinajs.cn/newchart/v5/futures/global/mins/GC.gif'
              break;
            case '3':
              title = `${i18n.name3}\n${i18n.涨跌}:${(((gold3.price - gold3.closingPrice) / gold3.closingPrice) * 100).toFixed(2)}%\n${i18n.价格}:${gold3.price}`;
              url = 'https://image.sinajs.cn/newchart/v5/futures/global/mins/XAU.gif'
              break;
          }

          action.setImage(url)
          action.setTitle(title);
        }).catch((e) => {
          action.setTitle('Error');
        })
      }
      plugin.Unterval(context)
      fn()
      plugin.Interval(context, 20000, () => {
        fn()
      })
    } catch (error) {
      action.setTitle('Error');
    }
  }
}
