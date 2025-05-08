const https = require('https');

async function getSpeedtestServers() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.speedtest.net',
      port: 443,
      path: '/api/js/servers?engine=js',
      method: 'GET'
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const servers = JSON.parse(data);
          resolve([null, servers]);
        } catch (error) {
          resolve([error, null]);
        }
      });
    });

    req.on('error', error => {
      resolve([error, null]);
    });

    req.end();
  });
}

async function  getLibreSpeedTestServers() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'librespeed.org',
      port: 443,
      path: '/backend-servers/servers.php',
      method: 'GET'
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const servers = JSON.parse(data);
          resolve([null, servers]);
        } catch (error) {
          resolve([error, null]);
        }
      });
    });

    req.on('error', error => {
      resolve([error, null]);
    });

    req.end();
  });
}

module.exports = {
  getSpeedtestServers,
  getLibreSpeedTestServers
}
// async function main() {
//   try {
//     const servers = await getLibreSpeedTestServers();
//     console.log('Speedtest Servers:', servers);
//     // 在这里处理获取到的服务器数据
//   } catch (error) {
//     console.error('Failed to fetch Speedtest servers:', error);
//   }
// }

// main();