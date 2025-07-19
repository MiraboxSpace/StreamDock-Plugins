import { useI18nStore } from '@/hooks/i18n';
import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import axios from 'axios';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;
  const i18n = useI18nStore();
  type Settings = {
    refresh: any;
    custom: boolean;
    customName: string;
    palace: any;
    query: any;
    highCelsius: string;
    lowCelsius: string;
    tempList: string;
    displayName: string;
    mode: string;
    weatherName: string;
    temperature: string;
    temperatureSVG: string;
    wind: string;
    windSVG: string;
    humidity: string;
    humiditySVG: string;
    weatherSvg: string;
    placeId: any;
    placeIds: any;
    citys: any;
    displayNames: any;
    address: any;
    language: string;
    city: string;
  }

  // 事件侦听器
  const plugin = usePluginStore();
  useWatchEvent('action', {
    ActionID,
    willAppear({ context }) {
      const settings = plugin.getAction(context).settings as Settings;
      settings.language = window.argv[3].application.language;//zh_CN,en,pt,es,it,de,fr,ja,ru,ko,ar,pl
      if (!("query" in settings) || settings.query == "") {
        if (window.argv[3].application.language == "zh_CN") {
          settings.query = "北京";
        } else {
          settings.query = "New York";
        }
      }
      queryCity(context);
      plugin.Interval(context, settings.refresh, () => {
        queryCity(context);
      })
    },
    keyUp({ context }) {
      queryCity(context);
    },
    didReceiveSettings({ payload, context }) {
      draw(context);
    },
    sendToPlugin({ payload, context }) {
      if ("query" in payload) {
        if (payload.query.trim() == "") return;
        const settings = plugin.getAction(context).settings as Settings;
        settings.query = payload.query;
      }
      if ("palace" in payload) {
        const settings = plugin.getAction(context).settings as Settings;
        settings.palace = payload.palace;
      }
      if ("refresh" in payload) {
        const settings = plugin.getAction(context).settings as Settings;
        settings.refresh = payload.refresh;
        plugin.Unterval(context);
        plugin.Interval(context, settings.refresh, () => {
          queryCity(context);
        })
        plugin.getAction(context).setSettings(settings);
        return;
      }
      queryCity(context);
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    }
  });

  const queryCity = async (context: string) => {
    // console.log("更新了", new Date());

    plugin.getAction(context).setTitle("Lodding...");
    const settings = plugin.getAction(context).settings as Settings;
    const code = toLanguageCode(settings.language);
    const { data: res } = await axios.post('https://weather.com/api/v1/p/redux-dal', [{
      "name": "getSunV3LocationSearchUrlConfig",
      "params": {
        "query": settings.query,
        "language": code,
        "locationType": "locale"
      }
    }]);
    const dynamicKeyObject = res.dal.getSunV3LocationSearchUrlConfig;
    const data = (Object.values(dynamicKeyObject)[0] as any).data;
    // console.log(res);

    if (!("location" in data)) {
      plugin.getAction(context).setTitle(i18n["未找到"]);
      return;
    }
    settings.displayNames = data.location.displayName;

    settings.address = data.location.address;
    settings.placeIds = data.location.placeId;
    if (data.location.address.filter(item => item == settings.palace).length == 0) {
      settings.palace = data.location.address[0];
      settings.placeId = data.location.placeId[0];
      settings.displayName = data.location.displayName[0];
    } else {
      settings.placeId = data.location.placeId[data.location.address.indexOf(settings.palace)]
      settings.displayName = data.location.displayName[data.location.address.indexOf(settings.palace)]
    }

    plugin.getAction(context).setSettings(settings);
    queryWather(context);
    // console.log(data);
  }

  const queryWather = async (context: string) => {
    const settings = plugin.getAction(context).settings as Settings;
    const code = toLanguageCode(settings.language);
    const res = await axios.get(`https://weather.com/${code}/weather/today/l/${settings.placeId}`);
    const parser = new DOMParser();
    const html = parser.parseFromString(res.data, 'text/html');
    // console.log('weather=======>', html)
    //天气名称
    const weatherName = html.querySelector('div[class*="CurrentConditions--phraseValue"]').textContent.trim();
    //获取每小时预报的div
    const targetDiv = html.querySelector('div[class*="HourlyWeatherCard--TableWrapper"]');
    //获取当前天气的li
    const weather = targetDiv.querySelector('li[class*="Column--active"]');
    const svg = weather.querySelector('svg');
    //获取温度
    const temperature = weather.querySelector('span[data-testid="TemperatureValue"]').firstChild.textContent.trim();
    //获取今日天气div
    const todayDetails = html.querySelector('#todayDetails');
    //温度最低温最高温
    const temperatureMinToMax = todayDetails.children[0].children[1].children[1].children[0].children[2].textContent.trim()
    //拆分出最低温和最高温
    const [highCelsius, lowCelsius] = temperatureMinToMax.split('/').map(temp => parseFloat(temp).toFixed(0));
    // console.log(temperatureMinToMax.split('/').map(temp => parseFloat(temp).toFixed(0)));
    // console.log(temperatureMinToMax);
    const temperatureSVG = todayDetails.children[0].children[1].children[1].children[0].children[0].children[0]
    //风速
    const wind = todayDetails.children[0].children[1].children[1].children[1].children[2].textContent.trim().replace(/^Wind Direction/, '').trim()
    const windSVG = todayDetails.children[0].children[1].children[1].children[1].children[0].children[0]
    //湿度
    const humidity = todayDetails.children[0].children[1].children[1].children[2].children[2].textContent.trim()
    const humiditySVG = todayDetails.children[0].children[1].children[1].children[2].children[0].children[0]

    // 将 SVG DOM 转换为字符串
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svg);

    // 把所有的symbol全塞进 svg里面
    const symbols = html.querySelectorAll('symbol');
    symbols.forEach(symbol => {
      const symbolString = serializer.serializeToString(symbol);
      svgString = svgString.replace('</svg>', symbolString + '</svg>');
    });
    //替换 svg 的 css 变量
    svgString = replaceCssVariables(svgString);
    const base64Svg = `data:image/svg+xml;base64,${btoa(svgString)}`;

    // console.log(base64Svg);
    settings.weatherName = weatherName;
    settings.temperature = temperature;
    settings.highCelsius = highCelsius;
    settings.lowCelsius = lowCelsius;

    if (settings.language == "en") {//美国用的华氏度统一先转成摄氏度
      settings.temperature = ((parseFloat(temperature) - 32) * 5 / 9).toFixed(0);
      settings.highCelsius = ((parseFloat(highCelsius) - 32) * 5 / 9).toFixed(0);
      settings.lowCelsius = ((parseFloat(lowCelsius) - 32) * 5 / 9).toFixed(0);
    }
    settings.temperatureSVG = `data:image/svg+xml;base64,${btoa(serializer.serializeToString(temperatureSVG))}`;
    const regex = new RegExp(`公里/小时`, 'g');
    settings.wind = wind.replace(regex, "km/h");
    settings.windSVG = `data:image/svg+xml;base64,${btoa(serializer.serializeToString(windSVG))}`;
    settings.humidity = humidity;
    settings.humiditySVG = `data:image/svg+xml;base64,${btoa(serializer.serializeToString(humiditySVG))}`;
    settings.weatherSvg = base64Svg;
    plugin.getAction(context).setSettings(settings);
    draw(context);
  }

  const draw = async (context: string) => {
    try {
      plugin.getAction(context).setTitle("");
      const settings = plugin.getAction(context).settings as Settings;
      // console.log(settings);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = canvas.height = 128;
      if (settings.mode == "icon") {//图标模式
        const image = new Image();
        image.src = settings.weatherSvg;
        image.onload = function () {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.drawImage(image, canvas.width * 0.2, 0, canvas.width * 0.6, canvas.height * 0.6);
          ctx.font = `${18}px sans-serif`;
          ctx.fillStyle = "#fff";
          let text = settings.temperature + settings.tempList + " " + settings.weatherName;
          if (settings.tempList == "℃") {//摄氏度
            if (ctx.measureText(text).width > canvas.width) {//超出分两行
              ctx.font = `${16}px sans-serif`;
              ctx.fillText(settings.temperature + settings.tempList, canvas.width * 0.5, canvas.height * 0.65);
              ctx.fillText(settings.weatherName, canvas.width * 0.5, canvas.height * 0.8);
            } else {
              ctx.fillText(text, canvas.width * 0.5, canvas.height * 0.7);
            }
          } else {//华氏度
            text = ((parseFloat(settings.temperature) * 9 / 5) + 32) + settings.tempList + " " + settings.weatherName
            if (ctx.measureText(text).width > canvas.width) {//超出分两行
              ctx.font = `${16}px sans-serif`;
              ctx.fillText(((parseFloat(settings.temperature) * 9 / 5) + 32) + settings.tempList, canvas.width * 0.5, canvas.height * 0.65);
              ctx.fillText(settings.weatherName, canvas.width * 0.5, canvas.height * 0.8);
            } else {
              ctx.fillText(text, canvas.width * 0.5, canvas.height * 0.7);
            }
          }
          const title = settings.custom ? settings.customName : settings.displayName
          ctx.font = `${18}px sans-serif`;
          if (ctx.measureText(text).width > canvas.width) {
            ctx.font = `${16}px sans-serif`;
            ctx.fillText(title, canvas.width * 0.5, canvas.height * 0.95);
          } else {
            ctx.fillText(title, canvas.width * 0.5, canvas.height * 0.9);
          }
          plugin.getAction(context).setImage(canvas.toDataURL("image/png"));
        }
      } else {//文本模式
        // console.log(settings);

        const temperatureSVG = await loadSvgImage(settings.temperatureSVG);
        const humiditySVG = await loadSvgImage(settings.humiditySVG);
        const windSVG = await loadSvgImage(settings.windSVG);
        ctx.fillStyle = '#8cb1c4';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${16}px sans-serif`;
        ctx.fillStyle = "#000";
        if (settings.tempList == "℃") {//摄氏度
          ctx.fillText(settings.temperature + settings.tempList + " " + settings.weatherName, canvas.width * 0.05, canvas.height * 0.2);
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${settings.lowCelsius == "NaN" ? "--" : settings.lowCelsius + "°"}/${settings.highCelsius == "NaN" ? "--" : settings.highCelsius + "°"}`, canvas.width * 0.9, canvas.height * 0.4);
        } else {//华氏度
          ctx.fillText(((parseFloat(settings.temperature) * 9 / 5) + 32) + settings.tempList + " " + settings.weatherName, canvas.width * 0.05, canvas.height * 0.2);
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${settings.lowCelsius == "NaN" ? "--" : ((parseFloat(settings.lowCelsius) * 9 / 5) + 32) + "°"}/${settings.highCelsius == "NaN" ? "--" : ((parseFloat(settings.highCelsius) * 9 / 5) + 32) + "°"}`, canvas.width * 0.9, canvas.height * 0.4);
        }
        ctx.fillText(settings.humidity, canvas.width * 0.9, canvas.height * 0.6);
        ctx.fillText(settings.wind, canvas.width * 0.9, canvas.height * 0.8);
        ctx.drawImage(temperatureSVG as any, canvas.width * 0.1, canvas.height * 0.3, canvas.width * 0.2, canvas.height * 0.2);
        ctx.drawImage(humiditySVG as any, canvas.width * 0.1, canvas.height * 0.5, canvas.width * 0.2, canvas.height * 0.2);
        ctx.drawImage(windSVG as any, canvas.width * 0.1, canvas.height * 0.7, canvas.width * 0.2, canvas.height * 0.2);
        plugin.getAction(context).setImage(canvas.toDataURL("image/png"));
      }
    } catch (error) {
      console.log(error);
      plugin.getAction(context).setTitle("error");
    }
  }

  const toLanguageCode = (language: string) => {
    switch (language) {
      case "ru": return "ru-RU";
      case "en": return "en-US";
      case "pt": return "pt-PT";
      case "es": return "es-ES";
      case "it": return "it-IT";
      case "de": return "de-DE";
      case "fr": return "fr-FR";
      case "ja": return "ja-JP";
      case "ko": return "ko-KR";
      case "ar": return "ar-SA";
      case "pl": return "pl-PL";
      default: return "zh-CN"
    }
  }

  const replaceCssVariables = (svgString: any) => {
    const replacements = {
      '--sun-lightning': '#ffbc09',
      '--moon': '#b081e1',
      '--hot-1': '#e15d5d',
      '--hot-2': '#ffe2e2',
      '--snow': '#70c8f9',
      '--wind-rain': '#c1c1c1',
      '--wind': '#c1c1c1',
      "--cloud": "#a1b6c3",
      "--rain": "#3f95b2",
      "--severe": "#ba0d00",
      '--cloud-1': '#cce4ff',
      '--cloud-2': '#c2ddf9',
      '--cloud-3': '#e0e0e0',
      '--cloud-4': '#d1d1d1',
      '--cloud-5': '#dadada',
      '--color-moon': '#e3e3e3',
      '--color-star': '#e3e3e3',
      '--color-cloud': '#d3d3d3',
      '--color-na': '#d3d3d3',
      '--color-fog': '#d3d3d3',
      '--color-hail': '#d3d3d3',
      '--color-tornado': '#d3d3d3',
      '--color-wind': '#d3d3d3',
      '--color-storm': '#d3d3d3',
      '--color-lightning': '#ebdb00',
      '--color-sun': '#ebdb00',
      '--color-drop': '#6adef8',
      '--color-snowflake': '#d3d3d3',
      '--color-thunderstorm-mask': '#2b2b2b'
    };

    // 替换css变量
    Object.keys(replacements).forEach(variable => {
      const regex = new RegExp(`var\\(${variable}\\)`, 'g');
      svgString = svgString.replace(regex, replacements[variable]);
    });
    return svgString;
  }
  const loadSvgImage = (url: string) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => {
        console.error(err);
        reject(err);
      }
      img.src = url;
    });
  }
}