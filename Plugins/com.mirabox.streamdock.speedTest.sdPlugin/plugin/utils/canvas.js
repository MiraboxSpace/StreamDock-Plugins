const { log } = require('./plugin');
const { resolve, join, extname } = require('path');
const fs = require('fs');
const { launch } = require('puppeteer');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
async function getDefaultBrowserPath() {
    try {
      const { stdout: progIdStdout } = await execAsync(
        'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v ProgId'
      );
  
      const progIdMatch = progIdStdout.match(/ProgId\s+REG_SZ\s+(\S+)/);
      if (!progIdMatch) {
        throw new Error('无法找到 ProgId');
      }
  
      const progId = progIdMatch[1];
  
      const { stdout: browserPathStdout } = await execAsync(
        `reg query "HKEY_CLASSES_ROOT\\${progId}\\shell\\open\\command" /v ""`
      );
  
      const browserPathMatch = browserPathStdout.match(/"(.*?)"/);
      if (!browserPathMatch) {
        throw new Error('无法找到浏览器路径');
      }
  
      const browserPath = browserPathMatch[1];
      return browserPath;
    } catch (error) {
      throw error;
    }
}

async function getCanvasImage(browserPath, htmlPath, params) {
    const browser = await launch({
        executablePath: browserPath,
        headless: true
    });
    const page = await browser.newPage();

    await page.goto(`file://${resolve(htmlPath)}`, { 
        waitUntil: 'networkidle0' 
    });
    page.on('console', msg => log.info('PAGE LOG:', msg.text()));
    page.on('pageerror', error => log.info('Page error:', error.message));
    // 设置参数并等待绘图完成
    await page.evaluate((params) => {
        window.myParams = params; // 这会触发我们定义的 setter
    }, params);

    // 等待 canvas 有内容
    await page.waitForFunction(() => {
        const canvas = document.querySelector('canvas');
        return canvas && canvas.width > 0 && canvas.height > 0;
    });

    const imageData = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) throw new Error('Canvas not found');
        return canvas.toDataURL('image/png');
    });

    await browser.close();
    return imageData.replace(/^data:image\/\w+;base64,/, '');
}

async function  test() {
    try {
        const htmlPath = join(__dirname, 'utils.html');
        const params = {
            width: 800,
            height: 600,
            text: "Hello Canvas",
            color: "#000000"
        };
        const browserPath = await getDefaultBrowserPath();

        log.info(browserPath);
        const imageBase64 = await getCanvasImage(browserPath, htmlPath, params);

        const imageBuffer = Buffer.from(imageBase64, 'base64');
        fs.writeFileSync(`output.png`, imageBuffer);
        log.log('Canvas图片已保存为output.png');
    } catch (err) {
        log.error('发生错误:', err);
    }
}

async function renderWithCustomFonts(drawDate) {
  log.info('开始渲染带自定义字体的图像');
  let browser = null;
  
  try {
    const browserPath = await getDefaultBrowserPath();
    log.info('获取到浏览器路径:', browserPath);
    
    log.info('启动浏览器...');
    browser = await launch({
      executablePath: browserPath,
      args: ['--disable-web-security', '--allow-file-access-from-files'], 
      headless: true 
    });
    log.info('浏览器启动成功');
    
    log.info('创建新页面...');
    const page = await browser.newPage();
    log.info('页面创建成功');
    
    // 设置控制台监听
    log.info('设置页面控制台监听...');
    page.on('console', msg => {
      log.info('浏览器控制台:', msg.text());
    });
    
    // 创建HTML内容
    log.info('准备设置页面内容...');
// sdtools.common.js:106 Load: timeColor=#ffffff
// sdtools.common.js:106 Load: uploadColor=#800080
// sdtools.common.js:146 Save: backgroundColor<=#aa3c3c
// sdtools.common.js:146 Save: latencyColor<=#808080
// sdtools.common.js:146 Save: downloadColor<=#008000
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
      <title>Performance Info</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: ${drawDate.backgroundColor};
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 256px;
          width: 256px;
          margin: 0;
        }

        .row {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 10px;
          width: 100%;
          white-space: nowrap;
        }

        .latency {
          margin-top: 20px;
          font-size: 42px;
          font-weight: bold;
          color: ${drawDate.latencyColor}
        }

        .unit-ms {
          font-size: 24px;
          margin-left: 10px;
        }

        .download {
          font-size: 42px;
          font-weight: bold;
          color: ${drawDate.downloadColor};
        }

        .upload {
          font-size: 42px;
          font-weight: bold;
          color: ${drawDate.uploadColor};
        }

        .unit-m {
          font-size: 24px;
          margin-left: 10px;
        }

        .time {
          font-size: 48px;
          margin-top: 20px;
          color: ${drawDate.timeColor};
        }
      </style>
      </head>
      <body>
        <div class="row">
          <span class="latency">&#x23F2; ${drawDate.latency}</span><span class="unit-ms"></span>
        </div>
        <div class="row">
          <span class="download">&#x25BC; ${drawDate.download}</span><span class="unit-m"></span>
        </div>
        <div class="row">
          <span class="upload">&#x25B2; ${drawDate.upload}</span><span class="unit-m"></span>
        </div>
        <div class="row">
          <span class="time">${drawDate.time}</span>
        </div>
      </body>
      </html>
    `;

    log.info('开始设置页面内容...');
    await page.setContent(htmlContent).catch(err => {
      log.error('设置页面内容失败:', err);
      throw err;
    });

    // 获取 body 元素的 bounding box (尺寸和位置)
    const body = await page.$('body');
    if (!body) {
      throw new Error('<body> element not found.');
    }
    
    const boundingBox = await body.boundingBox();
    if (!boundingBox) {
      throw new Error('Could not get bounding box of <body>.');
    }

    log.info('开始截图 body为 Base64...');
    const base64String = await page.screenshot({
      clip: {
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
      },
      encoding: 'base64',
    });

    // log.info('截图为 Base64 成功', 'data:image/png;base64,' + base64String);
    return 'data:image/png;base64,' + base64String;
  } catch (err) {
    log.error('渲染过程出错:', err);
    return null;
  } finally {
    if (browser) {
      log.info('正在关闭浏览器...');
      try {
        await browser.close();
        log.info('浏览器已关闭');
      } catch (err) {
        log.error('关闭浏览器时出错:', err);
      }
    }
  }
}

// 修改fontToBase64函数以添加更多日志和错误处理
function fontToBase64(path) {
  if (!path) {
    log.error("fontToBase64: 路径为空!");
    return ""; 
  }
  
  log.info("读取字体文件:", path);
  
  try {
    // 检查文件是否存在
    if (!fs.existsSync(path)) {
      log.error(`字体文件不存在: ${path}`);
      return "";
    }
    
    // 获取文件大小
    const stats = fs.statSync(path);
    log.info(`字体文件大小: ${stats.size} 字节`);
    
    if (stats.size === 0) {
      log.error("字体文件大小为零!");
      return "";
    }
    
    // 读取文件
    const data = fs.readFileSync(path);
    const base64 = data.toString('base64');
    
    log.info(`成功读取字体文件，Base64长度: ${base64.length}`);
    
    return base64;
  } catch (err) {
    log.error("读取字体文件失败:", err);
    return "";
  }
}
  
// renderWithCustomFonts({
//   backgroundColor: 'black',
//   latencyColor: 'white',
//   downloadColor: 'green',
//   uploadColor: 'blue',
//   timeColor: 'pink',
//   latency: '78 ms',
//   download: '3.3 M',
//   upload: '4.4 M',
//   time: '15:13'

// }).catch((e) => {log.error(e)});

module.exports = {
    test,
    renderWithCustomFonts
}