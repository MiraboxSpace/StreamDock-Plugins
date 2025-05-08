/**
 * 基础参数说明:
 *      @plugin 全局插件行动 - 策略模式
 *      @plugin .default 行动默认数据
 *      @plugin _willAppear 在 willAppear 方法之后立即执行
 *      @plugin _willDisappear 在 willDisappear 方法之前立即执行
 *      @common sendToPlugin keyUp propertyInspectorDidAppear
 * =========================================================================>
 */
//key可以从 WeatherAPI.com 和 https://www.qweather.com 获取
window.QWEATHER_API_KEY = 'xxxxxxxx';
window.WEATHERAPI_COM_API_KEY = 'xxxxxxxx';
const $local = false,
  $plugin = {
    name: "weather",
    action1: new Action({
      default: {
        inputCity: "", // 输入框
        tempList: "0", // 
        cityId: "",
        city: "",
        title: "",
        radio: "0",
        radio2: "0",
        radioUseApi: window.WeatherApiEnum.qweather,
        searchList: [],
        theme: "Modern",
        wdata: { tmp: "20", code: "101", name: '', img: '', cityName: '' },
        titleParameters: {
          titleColor: "#ffffff",
        },
        count: 0,
        Localization: {}
      },
      /**
       *和风官方网页查询数据: https://www.qweather.com/v2/current/condition/s/x-cityId.html
       */
      async queryLocation(context, device) {
        console.log("queryLocation");
        const data = this.data[context];
        const langMap = {
          'zh_CN': 'zh', 'en': 'en', 'ja': 'ja', 'fr': 'fr',
          'it': 'it', 'ru': 'ru', 'es': 'es', 'pt': 'pt', 'de': 'de'
        };
        const lang = langMap[$lang] || 'en';
        const weatherService = window.WeatherServiceFactory.createWeatherService(data.radioUseApi); // 获取天气服务实例

        try {
          if (data.inputCity) {
            console.log("inputCity");
            $websocket.setTitle(context, "Loading");
            const [error, locationList] = await weatherService.queryLocation(data.inputCity, lang);

            if (error) {
              console.error("queryLocation failed:", error);
              data.searchList = [];
              this.canvasFunc(context, device, "error");
              $websocket.setSettings(context, data);
            } else if (locationList && locationList.length > 0) {
              // **需要根据不同服务商的返回数据结构进行适配**
              // 和风天气返回的是一个包含城市信息的数组 (res.data.location)
              // WeatherAPI.com 返回的也是一个数组 (res.data)
              data.searchList = locationList;
              this.queryWeather(context, device);
              data.count = 0;
            } else {
              data.searchList = [];
              this.canvasFunc(context, device, "404");
              $websocket.setSettings(context, data);
            }
          }
        } catch (e) {
          console.error("queryLocation general error:", e);
          if (++data.count <= 3) {
            this.queryLocation(context, device);
            $websocket.setTitle(context, "Try again");
            return;
          }
          this.canvasFunc(context, device, "error");
        }
      },
      async queryWeather(context, device) {
        const data = this.data[context];
        const weatherService = window.WeatherServiceFactory.createWeatherService(data.radioUseApi); // 获取天气服务实例
        const langMap = {
          'zh_CN': 'zh', 'en': 'en', 'ja': 'ja', 'fr': 'fr',
          'it': 'it', 'ru': 'ru', 'es': 'es', 'pt': 'pt', 'de': 'de'
        };
        const lang = langMap[$lang] || 'en';
        try {
          clearTimeout(data.timer);
          console.log(data, data.cityId, data.searchList)
          // 过滤出用户选择的城市
          data.cityId = (
            data.searchList.filter((item) => item.id === data.cityId)[0] ||
            data.searchList[0]
          )?.id;
          data.city = data.searchList.filter(
            (item) => item.id === data.cityId
          )[0]?.name;

          if (data.cityId) {
            $websocket.setTitle(context, "Loading");
            const [error, weatherData] = await weatherService.queryWeather(data.cityId, lang);

            if (error) {
              console.error("queryWeather failed:", error);
              this.canvasFunc(context, device, "error");
            } else if (weatherData) {
              // **需要根据不同服务商的返回数据结构进行适配**
              let tmp, code, img, name, cityName;
              if (weatherService instanceof window.QWeatherService) {
                tmp = weatherData.tmp;
                code = weatherData.code; // 需要查阅和风天气的 icon 对应关系
              } else if (weatherService instanceof window.WeatherApiComService) {
                tmp = weatherData.current.temp_c; // 或 temp_f，根据需求
                code = weatherData.current.condition.code; // 需要查阅 WeatherAPI.com 的 code 对应关系
                img = 'https:' + weatherData.current.condition.icon;
                name = weatherData.current.condition.text;
                cityName = weatherData.location.name;
              }

              data.wdata = { tmp, code, img, name, cityName };
              data.count = 0;
              data.timer = setTimeout(
                () => this.queryWeather(context, device),
                1000 * 60 * 60 * 1
              );
              $websocket.setSettings(context, data);
              this.canvasFunc(context, device);
            } else {
              this.canvasFunc(context, device, "error");
            }
          }
        } catch (e) {
          console.error("queryWeather general error:", e);
          if (++data.count <= 3) {
            this.queryWeather(context, device);
            $websocket.setTitle(context, "Try again");
            return;
          }
          this.canvasFunc(context, device, "error");
        }
      },
      // 绘制
      async canvasFunc(context, device, status = "success") {
        if (status === "error") {
          $websocket.setImage(
            context,
            this.data[context].isBackgroundHidden
              ? "../static/img/tm.png"
              : "../static/img/default.jpg"
          );
          $websocket.setTitle(context, "Timeout");
          return;
        } else if (status === "404") {
          $websocket.setImage(
            context,
            this.data[context].isBackgroundHidden
              ? "../static/img/tm.png"
              : "../static/img/default.jpg"
          );
          $websocket.setTitle(context, "Not found");
          return;
        }
        if (!this.data[context].cityId) return;

        // 主题配置
        const data = this.data[context];
        const { tmp, code, img, name, cityName } = data.wdata;
        // 摄氏度/华氏度
        const unit = data.tempList === "0" ? "℃" : "℉";
        const tmps = data.tempList === "0" ? tmp : tmp * 1.8 + 32;

        // 设置gif背景
        // if (data.theme == "dynamic") {
        //   $websocket.setImage(context,`${dynamicEnum[101]}`, true);
        //   $websocket.setTitle(
        //     context,
        //     data.radio == "0" ? `${Number(tmps).toFixed(1)}${unit}\n${data.city}` : `${Number(tmps).toFixed(1)}${unit}\n${data.title}`
        //   );
        //   return
        // }

        console.log(this.data[context].radioUseApi, window.WeatherApiEnum, data.wdata);
        const image = new Image();
        switch (this.data[context].radioUseApi) {
          case window.WeatherApiEnum.qweather:
            if (data.theme == "Modern")
              image.src = `../static/img/Modern/${code}-fill.svg`;
            if (data.theme == "Luxury")
              image.src = `../static/img/Luxury/${LuxuryEnum[code]}.png`;
            break;
          case window.WeatherApiEnum.weatherapi:
            image.src = img
            break;
          default:
        }


        /* 加载完毕后开始 */
        image.onload = async function () {
          let canvas = document.createElement("canvas");
          canvas.width = canvas.height = 512;
          let ctx = canvas.getContext("2d");

          // 是否隐藏背景 适配 296
          if (!data.isBackgroundHidden) {
            ctx.fillStyle = "rgb(25,25,25)";
            ctx.fillRect(0, 0, 512, 512);
            ctx.save();
          }

          if (data.theme == "Modern") ctx.drawImage(this, (512 - 260) / 2, 20, 260, 260);
          if (data.theme == "Luxury") ctx.drawImage(this, -2, -2, 516, 516);

          // ctx.fillStyle = data.titleParameters.titleColor;
          // ctx.font = `${data.titleParameters.fontStyle == "Regular" ? "" : data.titleParameters.fontStyle} ${data.titleParameters.fontSize + 10}px '${data.titleParameters.fontFamily}'`;
          // ctx.shadowColor = "white";
          // ctx.shadowBlur = 1;
          // ctx.shadowOffsetX = 1;
          // ctx.shadowOffsetY = 1;


          // ctx.fillText(`${Number(tmps).toFixed(1)}${unit}`, 14, 29);

          // if (data.titleParameters.fontUnderline) {
          //   let textMetrics = ctx.measureText(`${Number(tmps).toFixed(1)}${unit}`);
          //   let underlineHeight = 1;
          //   ctx.fillRect(14, 29 + 2, textMetrics.width, underlineHeight);
          // }

          let weatherName;
          switch (data.radioUseApi) {
            case window.WeatherApiEnum.qweather:
              weatherName = data.radio2 == "0" ? data.Localization[code == 154 ? 153 : code] + "\n" : '';
              data.Localization[code == 154 ? 153 : code] + "\n"
              $websocket.setTitle(
                context,
                weatherName + (data.radio == "0" ? `${Number(tmps).toFixed(1)}${unit}\n${data.city}` : `${Number(tmps).toFixed(1)}${unit}\n${data.title}`)
              );
              break;
            case window.WeatherApiEnum.weatherapi:
              weatherName = data.radio2 == "0" ? name + "\n" : '';
              $websocket.setTitle(
                context,
                weatherName + (data.radio == "0" ? `${Number(tmps).toFixed(1)}${unit}\n${cityName}` : `${Number(tmps).toFixed(1)}${unit}\n${data.title}`),
              );
              break;
            default:
          }

          // 国际化json文件里面没有154，154与153是一样的夜间多云
          $websocket.setImage(context, canvas.toDataURL("image/png"));
        };
      },
      titleParametersDidChange({ context, payload, device }) {
        this.data[context].titleParameters = payload.titleParameters;
        this.canvasFunc(context, device);
      },
      didReceiveSettings({ context, payload, device }) {
        this.data[context].isBackgroundHidden = payload.settings.isBackgroundHidden;
        this.canvasFunc(context, device);
      },
      async _willAppear({ context, device, payload }) {
        console.log("willAppear", payload);

        this.data[context].Localization = await new Promise(resolve => {
          const req = new XMLHttpRequest();
          req.open('GET', `../${$lang}.json`);
          req.send();
          req.onreadystatechange = () => {
            if (req.readyState === 4) {
              resolve(JSON.parse(req.responseText).Localization)
            }
          };
        })
        const { radioUseApi } = payload.settings;
        this.data[context].radioUseApi = radioUseApi !== undefined ? window.WeatherApiEnum[radioUseApi] : window.WeatherApiEnum.qweather;
        this.queryLocation(context, device);
      },
      _willDisappear({ context }) {
        clearTimeout(this.data[context].timer);
      },
      sendToPlugin({ context, payload, device }) {
        const data = this.data[context];
        const { inputCity, cityId, title, theme, radio, radio2, tempList, radioUseApi } = payload;
        // 切换提供商
        if (radioUseApi !== undefined) {
          data.radioUseApi = radioUseApi;
          this.data[context].radioUseApi = window.WeatherApiEnum[radioUseApi];
          this.data[context].count = 0;
          return this.queryLocation(context, device);
        }

        // 输入城市
        if (inputCity !== undefined) {
          data.inputCity = inputCity;
          this.data[context].count = 0;
          return this.queryLocation(context, device);
        }
        // 更新天气
        if (cityId !== undefined) {
          data.cityId = cityId;
          this.data[context].count = 0;
          return this.queryWeather(context, device);
        }
        // 更新选项
        if (title !== undefined) data.title = title;
        if (theme !== undefined) data.theme = theme;
        if (radio !== undefined) data.radio = radio;
        if (radio2 !== undefined) data.radio2 = radio2;
        if (tempList !== undefined) data.tempList = tempList;
        this.canvasFunc(context, device);
      },
      keyUp({ context, device }) {
        this.data[context].count = 0;
        this.queryWeather(context, device);
      },
    }),
  };
