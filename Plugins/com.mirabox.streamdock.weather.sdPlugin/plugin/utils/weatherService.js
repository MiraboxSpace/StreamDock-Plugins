/**
 * weatherService.js - 封装天气查询服务，支持多个天气提供商。
 *
 * 该文件定义了天气服务接口和具体的天气提供商实现，
 * 并提供了一个工厂函数用于创建天气服务实例。
 */
var { pinyin } = pinyinPro;
// console.log(pinyin('呼和浩特',{"toneType": "none",separator: ''}));

(function () {
  const WeatherApiEnum = {
    qweather: 'qweather',
    weatherapi: 'weatherapi'
  }
  /**
   * @class WeatherServiceInterface
   * @classdesc 定义天气服务接口，所有天气提供商的服务类都应继承此类。
   */
  class WeatherServiceInterface {
    /**
     * @async
     * @function WeatherServiceInterface#queryLocation
     * @param {string} query - 查询关键字（如城市名称）。
     * @param {string} lang - 语言代码。
     * @returns {Promise<[Error | null, Array<object> | null]>} - Promise，resolve 包含 [错误, 地区列表]。
     * @throws {Error} 如果子类没有实现该方法。
     */
    async queryLocation(query, lang) {
      throw new Error("Method 'queryLocation' must be implemented.");
    }

    /**
     * @async
     * @function WeatherServiceInterface#queryWeather
     * @param {string} locationId - 地区ID。
     * @param {string} lang - 语言代码。
     * @returns {Promise<[Error | null, object | null]>} - Promise，resolve 包含 [错误, 天气数据]。
     * @throws {Error} 如果子类没有实现该方法。
     */
    async queryWeather(locationId, lang) {
      throw new Error("Method 'queryWeather' must be implemented.");
    }
  }

  /**
   * @class QWeatherService
   * @classdesc 和风天气服务类，继承自 WeatherServiceInterface。
   */
  class QWeatherService extends WeatherServiceInterface {
    /**
     * @param {string} apiKey - 和风天气的 API 密钥。
     */
    constructor(apiKey) {
      super();
      this.apiKey = apiKey;
    }

    /**
     * @async
     * @function QWeatherService#queryLocation
     * @inheritdoc
     */
    async queryLocation(query, lang) {
      try {
        const res = await axios(
          `https://geoapi.qweather.com/v2/city/lookup?location=${query}&key=${this.apiKey}&lang=${lang}`,
          { timeout: 3000 }
        );
        if (res.data.code === "200") {
          return [null, res.data.location];
        } else {
          return [new Error(`QWeather API Error: ${res.data.code}`), null];
        }
      } catch (error) {
        console.error("QWeatherService - queryLocation error:", error);
        return [error, null];
      }
    }

    /**
     * @async
     * @function QWeatherService#queryWeather
     * @inheritdoc
     */
    async queryWeather(locationId, lang) {
      try {
        const res = await axios(
          `https://www.qweather.com/v2/current/condition/s/x-${locationId}.html`,
          { timeout: 3000 }
        );
        if (res.data.code === "0") {
          return [null, res.data.data];
        } else {
          return [new Error(`QWeather API Error: ${res.data.code}`), null];
        }
      } catch (error) {
        console.error("QWeatherService - queryWeather error:", error);
        return [error, null];
      }
    }
  }

  /**
   * @class WeatherApiComService
   * @classdesc WeatherAPI.com 天气服务类，继承自 WeatherServiceInterface。
   */
  class WeatherApiComService extends WeatherServiceInterface {
    /**
     * @param {string} apiKey - WeatherAPI.com 的 API 密钥。
     */
    constructor(apiKey) {
      super();
      this.apiKey = apiKey;
    }

    /**
     * @async
     * @function WeatherApiComService#queryLocation
     * @inheritdoc
     */
    async queryLocation(query, lang) {
      try {
        let pinyinQuery = pinyin(query,{"toneType": "none",separator: ''})
        const res = await axios(
          `http://api.weatherapi.com/v1/search.json?key=${this.apiKey}&q=${pinyinQuery}&lang=${lang}`,
          { timeout: 3000 }
        );
        let result = res.data.map(i => {
          i.id = `${i.id}`;
          return i;
        })
        return [null, result]; // 根据 WeatherAPI.com 的响应结构调整
      } catch (error) {
        console.error("WeatherApiComService - queryLocation error:", error);
        return [error, null];
      }
    }

    /**
     * @async
     * @function WeatherApiComService#queryWeather
     * @inheritdoc
     */
    async queryWeather(locationId, lang) {
      try {
        const res = await axios(
          `http://api.weatherapi.com/v1/current.json?key=${this.apiKey}&q=id:${locationId}&lang=${lang}`,
          { timeout: 3000 }
        );
        return [null, res.data]; // 根据 WeatherAPI.com 的响应结构调整
      } catch (error) {
        console.error("WeatherApiComService - queryWeather error:", error);
        return [error, null];
      }
    }
  }

  /**
 * @namespace WeatherServiceFactory
 * @description 用于创建具体天气服务实例的工厂。
 */
  const WeatherServiceFactory = (function () {
    const providers = {
      qweather: (apiKey) => new QWeatherService(apiKey),
      weatherapi: (apiKey) => new WeatherApiComService(apiKey),
      // 可以添加更多的天气提供商
    };
    const apiKeys = {
      qweather: () => window.QWEATHER_API_KEY || 'xxxxxxxx',
      weatherapi: () => window.WEATHERAPI_COM_API_KEY || 'xxxxxxxx',
      // 配置其他提供商的 API 密钥 (使用函数延迟读取)
    };

    return {
      /**
       * @function WeatherServiceFactory.createWeatherService
       * @returns {WeatherServiceInterface} - 当前配置的天气服务实例。
       * @throws {Error} 如果不支持指定的天气提供商或 API 密钥未配置。
       */
      createWeatherService: function (WEATHER_PROVIDER_TYPE) {
        const WEATHER_PROVIDER = WEATHER_PROVIDER_TYPE || 'qweather'; // 每次调用时读取
        const providerName = WEATHER_PROVIDER.toLowerCase();
        const getApiKey = apiKeys[providerName];

        if (!providers[providerName]) {
          throw new Error(`Unsupported weather provider: ${providerName}`);
        }
        if (!getApiKey || typeof getApiKey !== 'function') {
          throw new Error(`API key getter for ${providerName} is not configured.`);
        }
        const apiKey = getApiKey();
        if (!apiKey) {
          throw new Error(`API key for ${providerName} is not set.`);
        }

        return providers[providerName](apiKey);
      }
    };
  })();

  // 将 WeatherServiceFactory 暴露到全局作用域
  window.WeatherServiceFactory = WeatherServiceFactory;
  window.QWeatherService = QWeatherService; // 确保这行存在
  window.WeatherApiComService = WeatherApiComService; // 确保这行存在
  window.WeatherApiEnum = WeatherApiEnum;
})();