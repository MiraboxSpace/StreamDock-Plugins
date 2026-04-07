const path = require('path');
const fs = require('fs-extra');

console.log('开始执行自动化构建...');

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

const PluginPath = path.join(process.env.APPDATA, '/HotSpot/StreamDock/plugins/', PluginName);

try {
  // 删除旧的插件目录
  fs.removeSync(path.join(PluginPath, 'propertyInspector'));
  // 确保目标目录存在
  fs.ensureDirSync(path.join(PluginPath, 'propertyInspector'));
  // 复制当前目录到目标路径，排除 node_modules
  fs.copySync(path.resolve(__dirname, '../propertyInspector'), path.join(PluginPath, 'propertyInspector'));
  console.log(`插件 "${PluginName}" 已成功复制到 "${PluginPath}"`);
  console.log('构建成功-------------');
} catch (err) {
  console.error(`复制出错 "${PluginName}":`, err);
}
