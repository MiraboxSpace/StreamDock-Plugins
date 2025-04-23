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
      console.log(context);

      const action = plugin.getAction(context);
      getData(action, context)
    },
    willDisappear({ context }) {
      plugin.Unterval(context)
      plugin.Unterval(context + 1)
    },
    sendToPlugin({ context, payload }) {
    },
    keyUp({ context, payload: { settings } }) {
      const action = plugin.getAction(context);
      action.openUrl('https://www.bitstamp.net/')
    },
    didReceiveSettings({ context, payload: { settings } }) {
    }
  });


  //获取最新行情
  const getData = (action: any, context: any) => {
    // https://www.bitstamp.net/api/ticker
    try {
      const options = {
        method: 'GET',
        url: 'https://www.bitstamp.net/api/ticker',
        // url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
        headers: {
          accept: 'application/json'
        }
      };
      async function fn() {
        axios.request(options).then((res) => {
          action.setTitle(`BTC\n${i18n.涨跌}:${res.data.percent_change_24}%\n${i18n.价格}:${res.data.last}`);
        }).catch((e) => {
          action.setTitle('Error');
        })
      }
      plugin.Unterval(context)
      plugin.Unterval(context + 1)
      fn()
      //查询分时数据
      getMinData(action)
      plugin.Interval(context, 3000, () => {
        fn()
      })
      plugin.Interval(context + 1, 25000, () => {
        //查询分时数据
        getMinData(action)
      })
    } catch (error) {
      action.setTitle('Error');
    }
  }

  //获取近一天的分时数据
  const getMinData = async (action: any) => {

    // 获取比特币的分时数据
    axios.get('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart', {
      params: {
        vs_currency: 'usd',
        days: '1', // 获取最近1天的分时数据
      }
    }).then(response => {
      // 处理返回的数据
      if (response.status) {
        const timestamps = [];
        const prices = [];
        response.data.prices.forEach((entry, index) => {
          timestamps.push(entry[0]);
          if (index > 0) {
            prices.push(entry[1] - prices[0]);//以最开始的那个数据为基准
          } else {
            prices.push(entry[1]);
          }
        });
        prices[0] = 0;//全部都减去最开始的数据后把最开始的数据置为0

        var canvas = document.createElement('canvas');
        canvas.width = 500; // 设置宽度
        canvas.height = 500; // 设置高度

        // 注册所需要的组件
        echarts.use([GridComponent, LineChart, CanvasRenderer, UniversalTransition]);
        type EChartsOption = echarts.ComposeOption<
          GridComponentOption | LineSeriesOption
        >;
        const option: EChartsOption = {
          animation: false, // 禁用动画效果
          xAxis: {
            type: 'category',
            data: timestamps
          },
          yAxis: {
            type: 'value'
          },
          series: [
            {
              data: prices,
              type: 'line',
              lineStyle: {
                width: 5, // 设置线条的宽度
                color: 'yellow'
              }
            }
          ]
        };

        var myChart = echarts.init(canvas);

        myChart.setOption(option);

        action.setImage(canvas.toDataURL())

        // console.log(canvas.toDataURL());
      }
    })
  }
}
