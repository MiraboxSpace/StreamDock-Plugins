const path = require('path');
const fs = require('fs-extra');

console.log('开始执行自动化构建...');
function getDateYYMMDD() {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;
  return `${year}${month}${day}`;
}
let PluginName;
const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../manifest.json'), 'utf-8'));
if (manifest['Actions'].length > 0) {
  let temp = manifest['Actions'][0]['UUID'];
  PluginName = `${temp.substring(0, temp.lastIndexOf('.'))}.sdPlugin`;
} else {
  if (manifest['Name'].includes('com')) {
    PluginName = `${manifest['Name']}.sdPlugin`;
  } else {
    PluginName = `com.mirabox.streamdock.${manifest['Name']}.sdPlugin`;
  }
}

manifest['Version'] = manifest['Version'].replaceAll('auto', getDateYYMMDD());
const PluginPath = path.join(process.env.APPDATA, '/HotSpot/StreamDock/plugins/', PluginName);

try {
  fs.ensureDirSync(path.dirname(PluginPath));
  fs.ensureDirSync(path.join(PluginPath, 'plugin'));
  fs.copySync(path.resolve(__dirname, '../build'), path.join(PluginPath, 'plugin'));
  fs.copySync(path.resolve(__dirname, '../build'), path.join(PluginPath, 'plugin'));
  fs.copySync(path.resolve(__dirname, '..'), PluginPath, {
    filter: (src) => {
      const relativePath = path.relative(path.resolve(__dirname, '..'), src);
      // 排除 'node_modules' 和 '.git' 目录及其子文件
      return (
        !relativePath.startsWith('node_modules') &&
        !relativePath.startsWith('docs') &&
        !relativePath.startsWith('plugin') &&
        !relativePath.startsWith('.git') &&
        !relativePath.startsWith('.vscode') &&
        !relativePath.startsWith('package-lock.json') &&
        !relativePath.startsWith('package.json') &&
        !relativePath.startsWith('.prettierrc') &&
        !relativePath.startsWith('build') &&
        !relativePath.startsWith('script')
      );
    },
  });
  const sourceDir = path.resolve(__dirname, '../');
  fs.writeJsonSync(path.join(PluginPath, 'manifest.json'), manifest, { spaces: 2, encoding: 'utf-8' });
  console.log(`插件 "${PluginName}" 已成功复制到 "${PluginPath}"`);
  console.log('构建成功-------------');
} catch (err) {
  console.error(`复制出错 "${PluginName}":`, err);
}
