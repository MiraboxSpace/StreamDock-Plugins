const path = require('path');
const fs = require('fs-extra');

console.log('开始执行自动化构建...');

const currentDir = __dirname;

// 获取父文件夹的路径
const parentDir = path.join(currentDir, '..');
// 获取父文件夹的名称
const PluginName = path.basename(parentDir);

const PluginPath = path.join(process.env.APPDATA, 'HotSpot/StreamDock/plugins', PluginName);

try {
  // 删除旧的插件目录
  fs.removeSync(path.join(PluginPath, 'propertyInspector'));

  // 确保目标目录存在
  fs.ensureDirSync(path.dirname(PluginPath));

  // 复制当前目录到目标路径，排除 node_modules
  fs.copySync(path.join(path.resolve(__dirname, '..'), 'propertyInspector'), path.join(PluginPath, 'propertyInspector'));

  console.log(`插件 "${PluginName}" 已成功复制到 "${PluginPath}"`);
  console.log('构建成功-------------');
} catch (err) {
  console.error(`复制出错 "${PluginName}":`, err);
}
