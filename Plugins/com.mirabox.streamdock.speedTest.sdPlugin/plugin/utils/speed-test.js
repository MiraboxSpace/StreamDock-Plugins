// speedtest.js
const { spawn } = require('child_process');
const path = require('path');

/**
 * 执行 speedtest 测速并返回结果
 * @param {Object} [options={}] 配置选项
 * @param {string} [options.serverId] 测速服务器ID（可选）
 * @param {string} [options.exePath] speedtest.exe 自定义路径，默认是 ./bin/speedtest.exe
 * @returns {Promise<Object>} 返回包含测速结果的对象
 */
function runSpeedTest(options = {}) {
  return new Promise((resolve, reject) => {
    const { serverId, exePath } = options;
    const finalExePath = exePath || path.join(__dirname, 'bin', 'speedtest.exe');
    
    // 构建命令参数（serverId 为可选）
    const args = [];
    if (serverId !== '') args.push('-s', serverId);

    const speedtest = spawn(finalExePath, args);
    let output = '';
    const result = {
      latency: null,
      download: null,
      upload: null,
      url: null
    };

    speedtest.stdout.on('data', (data) => {
      output += data.toString();
    });

    speedtest.stderr.on('data', (data) => {
      console.error('Error:', data.toString());
    });

    speedtest.on('error', (err) => {
      resolve([`Failed to start speedtest: ${err.message}`, null]);
    });

    speedtest.on('close', (code) => {
      if (code !== 0) {
        resolve([`speedtest exited with code ${code}`, null]);
        return;
      }

      try {
        const latencyMatch = output.match(/Idle Latency:\s+([\d.]+)\s*([^\s]+)/);
        const downloadMatch = output.match(/Download:\s+([\d.]+)\s*([^\s]+)/);
        const uploadMatch = output.match(/Upload:\s+([\d.]+)\s*([^\s]+)/);
        const urlMatch = output.match(/Result URL:\s*(https:\/\/[^\s]+)/);

        if (latencyMatch) result.latency = `${latencyMatch[1]} ${latencyMatch[2]}`;
        if (downloadMatch) result.download = `${downloadMatch[1]} ${downloadMatch[2][0]}`;
        if (uploadMatch) result.upload = `${uploadMatch[1]} ${uploadMatch[2][0]}`;
        if (urlMatch) result.url = urlMatch[1];

        resolve([null, result]);
      } catch (err) {
        resolve([`Failed to parse results: ${err.message}`, null]);
      }
    });
  });
}

/**
 * 执行 speedtest 测速并返回结果
 * @param {Object} [options={}] 配置选项
 * @param {string} [options.serverId] 测速服务器ID（可选）
 * @param {string} [options.exePath] speedtest.exe 自定义路径，默认是 ./bin/speedtest.exe
 * @returns {Promise<Object>} 返回包含测速结果的对象
 */
function runLibreSpeedTest(options = {}) {
  return new Promise((resolve, reject) => {
    const { serverId, exePath, serversPath } = options;
    const finalExePath = exePath || path.join(__dirname, 'bin', 'librespeed-cli.exe');
    console.log(finalExePath);
    // 构建命令参数（serverId 为可选）
    const args = ['--simple'];
    if (serverId !== '') args.push('--local-json', serversPath, '--server', serverId);
    console.log(args);
    const speedtest = spawn(finalExePath, args);
    let output = '';
    const result = {
      latency: null,
      download: null,
      upload: null,
      url: null
    };

    speedtest.stdout.on('data', (data) => {
      output += data.toString();
    });
    // liberSpeed 会输出到stderr；
    speedtest.stderr.on('data', (data) => {
      output += data.toString();
      console.error('Error:', data.toString());
    });

    speedtest.on('error', (err) => {
      resolve([`Failed to start speedtest: ${err.message}`, null]);
    });

    speedtest.on('close', (code) => {
      if (code !== 0) {
        resolve([`speedtest exited with code ${code}`, null]);
        return;
      }

      try {
        const latencyMatch = output.match(/Ping:\s+([\d.]+)\s*([^\s]+)/);
        const downloadMatch = output.match(/Download rate:\s+([\d.]+)\s*([^\s]+)/);
        const uploadMatch = output.match(/Upload rate:\s+([\d.]+)\s*([^\s]+)/);
        const urlMatch = output.match(/Result URL:\s*(https:\/\/[^\s]+)/);

        if (latencyMatch) result.latency = `${latencyMatch[1]} ${latencyMatch[2]}`;
        if (downloadMatch) result.download = `${downloadMatch[1]} ${downloadMatch[2][0]}`;
        if (uploadMatch) result.upload = `${uploadMatch[1]} ${uploadMatch[2][0]}`;
        if (urlMatch) result.url = urlMatch[1];
        resolve([null, result]);
      } catch (err) {
        resolve([`Failed to parse results: ${err.message}`, null]);
      }
    });
  });
}

async function getAvailableServers(dataList) {
  const promises = dataList.map(async (item) => {
    const serverBaseURL = item.server;
    const checkURL = `https:${serverBaseURL}/empty.php?cors=true`;

    try {
      const response = await fetch(checkURL, {
        mode: 'cors',
        method: 'HEAD',
        cache: 'no-store'
      });

      if (response.ok) {
        return item; // 如果可用，返回完整的原始数据项
      } else {
        return null; // 如果不可用，返回 null
      }
    } catch (error) {
      return null; // 如果发生错误，也返回 null
    }
  });

  const results = await Promise.all(promises);

  // 过滤掉 null 值，只保留可用的服务器数据
  const availableServers = results.filter(item => item !== null);

  console.log("可用的服务器数据：", availableServers);
  return availableServers;
}

// CJS 导出
module.exports = {
  runSpeedTest,
  runLibreSpeedTest,
  getAvailableServers
};

// async function main() {
//   let [err, result] = await runLibreSpeedTest({
//     serverId: ''
//   });
//   console.log(err, result);
// }
// main();