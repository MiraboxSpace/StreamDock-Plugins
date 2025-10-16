const axios = require("axios");
const { getProxySettings } = require("get-proxy-settings");
const { HttpsProxyAgent } = require("https-proxy-agent");
const fs = require("fs-extra");
const { log } = require("../utils/plugin");

// 导入指定文件
const getUserInfo = async () => {
  try {
    const data = await fs.promises.readFile(
      "plugin/json/authToken.json",
      "utf8"
    );
    return JSON.parse(data);
  } catch (error) {
    console.error("读取文件时发生错误:", error.message);
    throw error;
  }
};
const getConfig = async () => {
  try {
    const data = await fs.promises.readFile(
      "plugin/configuration/config.json",
      "utf8"
    );
    return JSON.parse(data);
  } catch (error) {
    console.error("读取文件时发生错误:", error.message);
    throw error;
  }
};

//=============================================axios实例化================================================
// 代理请求走的路径
const proxy = axios.create({
  baseURL: "",
  timeout: 5000,
});
// 代理且需要添加上授权信息的请求走的路径
const proxyToken = axios.create({
  baseURL: "",
  timeout: 5000,
});
//==================================================axios 实例化的封装========================================
/**
 * 走代理的get请求
 * @param {String} url 请求全路径
 * @param {Object} param 参数{headers:{},data:{}}
 * @returns throw error 或者是 响应体中的数据
 */
async function proxyGet(url, param) {
  // 创建 axios 实例，并设置全局代理
  try {
    const proxySettings = await getProxySettings();
    // 检查代理设置是否为空，并且是否有https属性
    if (
      proxySettings &&
      proxySettings.https &&
      proxySettings.https.host &&
      proxySettings.https.port
    ) {
      // param.proxy = proxySettings.https;
      const agent = new HttpsProxyAgent(proxySettings.https);
      param.httpsAgent = agent;
    }

    const response = await proxy.get(url, param);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * 走代理的get请求
 * @param {String} url 请求全路径
 * @param {Object} param 参数
 * @returns throw error 或者是 响应体中的数据
 */
async function proxyPost(url, param, headers) {
  // 创建 axios 实例，并设置全局代理
  try {
    const proxySettings = await getProxySettings();
    // 检查代理设置是否为空，并且是否有https属性
    let options = {
      headers: {
        ...(headers || {}),
      },
    };

    if (
      proxySettings &&
      proxySettings.https &&
      proxySettings.https.host &&
      proxySettings.https.port
    ) {
      // options.proxy = proxySettings.https;
      const agent = new HttpsProxyAgent(proxySettings.https);
      options.httpsAgent = agent;
    }

    const response = await proxy.post(url, { ...param }, options);
    return response;
  } catch (error) {
    throw error;
  }
}
//======================= 授权内容======================================================
/**
 * 走代理并且封装token的请求
 * @param {String} url 请求全路径
 * @param {Object} param 参数{headers:{},data:{}}
 * @returns throw error 或者是 响应体中的数据
 */
async function twitchProxyGet(url, param) {
  try {
    // 设置请求选项，包括头信息和认证令牌
    let options = {
      headers: {
        ...param.headers, // 将传入的 headers 合并到默认 headers 中
        Authorization: `Bearer ${(await getUserInfo()).access_token}`,
      },
      params: param.params,
    };
    const proxySettings = await getProxySettings();
    // 设置请求选项，包括头信息和认证令牌
    // 检查代理设置是否为空，并且是否有https属性
    if (
      proxySettings &&
      proxySettings.https &&
      proxySettings.https.host &&
      proxySettings.https.port
    ) {
      // options.proxy = proxySettings.https;
      const agent = new HttpsProxyAgent(proxySettings.https);
      options.httpsAgent = agent;
    }

    const response = await proxyToken.get(url, options);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * 走代理并且封装token的请求
 * @param {String} url 请求全路径
 * @param {Object} param 参数{headers:{},data:{}}
 * @returns throw error 或者是 响应体中的数据
 */
async function twitchProxyPost(url, param, config) {
  try {
    const proxySettings = await getProxySettings();
    // 设置请求选项，包括头信息和认证令牌
    let options = {
      ...config,
      headers: {
        ...config.headers, // 将传入的 headers 合并到默认 headers 中
        Authorization: `Bearer ${(await getUserInfo()).access_token}`,
      },
    };
    // 检查代理设置是否为空，并且是否有https属性
    if (
      proxySettings &&
      proxySettings.https &&
      proxySettings.https.host &&
      proxySettings.https.port
    ) {
      // options.proxy = proxySettings.https;
      const agent = new HttpsProxyAgent(proxySettings.https);
      options.httpsAgent = agent;
    }

    const response = await proxyToken.post(url, { ...param }, options);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * 走代理并且封装token的请求
 * @param {String} url 请求全路径
 * @param {Object} param 参数{headers:{},data:{}}
 * @returns throw error 或者是 响应体中的数据
 */
async function twitchProxyDelete(url, param) {
  try {
    const proxySettings = await getProxySettings();
    // 设置请求选项，包括头信息和认证令牌
    let options = {
      headers: {
        ...param.headers, // 将传入的 headers 合并到默认 headers 中
        Authorization: `Bearer ${(await getUserInfo()).access_token}`,
      },
      params: param.params,
    };

    // 检查代理设置是否为空，并且是否有https属性
    if (
      proxySettings &&
      proxySettings.https &&
      proxySettings.https.host &&
      proxySettings.https.port
    ) {
      // options.proxy = proxySettings.https;
      const agent = new HttpsProxyAgent(proxySettings.https);
      options.httpsAgent = agent;
    }

    const response = await proxyToken.delete(url, options);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * 走代理并且封装token的请求
 * @param {String} url 请求全路径
 * @param {Object} param 参数{headers:{},data:{}}
 * @returns throw error 或者是 响应体中的数据
 */
async function twitchProxyPatch(url, param, config) {
  try {
    const proxySettings = await getProxySettings();
    // 设置请求选项，包括头信息和认证令牌
    let options = {
      ...config,
      headers: {
        ...config.headers, // 将传入的 headers 合并到默认 headers 中
        Authorization: `Bearer ${(await getUserInfo()).access_token}`,
      },
    };

    // 检查代理设置是否为空，并且是否有https属性
    if (
      proxySettings &&
      proxySettings.https &&
      proxySettings.https.host &&
      proxySettings.https.port
    ) {
      // options.proxy = proxySettings.https;
      const agent = new HttpsProxyAgent(proxySettings.https);
      options.httpsAgent = agent;
    }

    const response = await proxyToken.patch(url, { ...param }, options);
    return response.data;
  } catch (error) {
    throw error;
  }
}
/**
 * 走代理并且封装token的请求
 * @param {String} url 请求全路径
 * @param {Object} param 参数{headers:{},data:{}}
 * @returns throw error 或者是 响应体中的数据
 */
async function twitchProxyPut(url, param, config) {
  try {
    const proxySettings = await getProxySettings();
    // 设置请求选项，包括头信息和认证令牌
    let options = {
      ...config,
      headers: {
        ...config.headers, // 将传入的 headers 合并到默认 headers 中
        Authorization: `Bearer ${(await getUserInfo()).access_token}`,
      },
    };

    // 检查代理设置是否为空，并且是否有https属性
    if (
      proxySettings &&
      proxySettings.https &&
      proxySettings.https.host &&
      proxySettings.https.port
    ) {
      // options.proxy = proxySettings.https;
      const agent = new HttpsProxyAgent(proxySettings.https);
      options.httpsAgent = agent;
    }

    const response = await proxyToken.put(url, { ...param }, options);
    return response.data;
  } catch (error) {
    throw error;
  }
}

//======================================对axios请求的监听

module.exports = {
  twitchProxyGet,
  proxyGet,
  proxyPost,
  getUserInfo,
  getConfig,
  twitchProxyPost,
  twitchProxyDelete,
  twitchProxyPatch,
  twitchProxyPut,
};
