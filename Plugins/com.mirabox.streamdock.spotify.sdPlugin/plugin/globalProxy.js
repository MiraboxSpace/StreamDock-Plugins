const { log } = require('./utils/plugin');
const { execSync } = require('child_process');
const os = require('os');
function getSystemProxy() {
  const platform = os.platform();
  if (platform === 'darwin') {
    try {
      const output = execSync('scutil --proxy', { encoding: 'utf8' });
      const settings = {};
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/(\w+)\s*:\s*(.+)/);
        if (match) {
          settings[match[1]] = match[2].trim();
        }
      }
      if (settings.HTTPEnable === '1' && settings.HTTPProxy && settings.HTTPPort) {
        return `http://${settings.HTTPProxy}:${settings.HTTPPort}`;
      }
      if (settings.HTTPSEnable === '1' && settings.HTTPSProxy && settings.HTTPSPort) {
        return `https://${settings.HTTPSProxy}:${settings.HTTPSPort}`;
      }
      // PAC 文件
      //   if (settings.ProxyAutoConfigEnable === '1' && settings.ProxyAutoConfigURLString) {
      //     return settings.ProxyAutoConfigURLString; // PAC URL
      //   }
    } catch (err) {
      return null;
    }
  } else if (platform === 'win32') {
    try {
      const output = execSync('powershell -Command "(Get-ItemProperty \\"HKCU:\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Internet Settings\\").ProxyServer"', {
        encoding: 'utf8',
      }).trim();
      const enable = execSync('powershell -Command "(Get-ItemProperty \\"HKCU:\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Internet Settings\\").ProxyEnable"', {
        encoding: 'utf8',
      }).trim();
      if (enable === '1' && output) {
        // ProxyServer 可能是 "http=127.0.0.1:7890;https=127.0.0.1:7891"
        const matchHttp = output.match(/http=(\S+)/);
        const matchHttps = output.match(/https=(\S+)/);
        if (matchHttp) return `http://${matchHttp[1]}`;
        if (matchHttps) return `https://${matchHttps[1]}`;
        return `http://${output}`; // 单一代理格式
      }
      //   // 获取 PAC URL
      //   const pacUrl = execSync(
      //     'powershell -Command "(Get-ItemProperty \\"HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\\").AutoConfigURL"',
      //     { encoding: 'utf8' }
      //   ).trim();
      //   if (pacUrl) return pacUrl;
    } catch (err) {
      return null;
    }
  } else {
    if (process.env.HTTPS_PROXY) return process.env.HTTPS_PROXY;
    if (process.env.https_proxy) return process.env.https_proxy;
    if (process.env.HTTP_PROXY) return process.env.HTTP_PROXY;
    if (process.env.http_proxy) return process.env.http_proxy;
  }
  return null;
}
const { bootstrap } = require('global-agent');
function startAutoRefreshProxy(intervalMs = 5000) {
  const timer = setInterval(update, intervalMs);
  let currentProxy = null;
  function update() {
    try {
      let temp = getSystemProxy();
      if (temp != currentProxy) {
        currentProxy = temp;
        if (temp != null) {
          process.env.GLOBAL_AGENT_HTTP_PROXY = temp;
          process.env.GLOBAL_AGENT_NO_PROXY = '127.0.0.1';
          bootstrap();
          log.info('[代理已启用] 检测到系统代理:', temp);
        } else {
          process.env.GLOBAL_AGENT_HTTP_PROXY = '';
          bootstrap();
          log.info('[代理已禁用] 没有检测到系统代理');
        }
      }
    } catch (error) {
      log.error('[代理设置失败] 无法设置系统代理', error);
    }
  }
  update();
}

module.exports = {
  startAutoRefreshProxy,
};
