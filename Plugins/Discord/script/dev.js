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
  fs.removeSync(PluginPath);

  // 确保目标目录存在
  fs.ensureDirSync(path.dirname(PluginPath));

  // 复制当前目录到目标路径，排除 node_modules
  fs.copySync(path.resolve(__dirname, '..'), PluginPath, {
    filter: (src) => {
      const relativePath = path.relative(path.resolve(__dirname, '..'), src);
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
  fs.mkdirSync(path.join(PluginPath, 'plugin'), { recursive: true });
  const content = `import { spawnSync } from 'node:child_process';
const target = '${path.join(process.cwd(), 'plugin', 'index.mjs').replaceAll('\\', '\\\\')}';
const args = [
  target,
  ...process.argv.slice(2),
  '-dev'
];
const ret = spawnSync("node.exe", args, { stdio: 'inherit', windowsHide: true,cwd:"${process.cwd().replaceAll('\\', '\\\\')}" });
process.exit(ret.status ?? 1);`;
  fs.writeFileSync(path.join(PluginPath, 'plugin', 'index.mjs'), content, {
    encoding: 'utf8',
    flag: 'w',
  });
  // fs.copySync( path.join(__dirname, "build"), path.join(PluginPath,'plugin'))

  console.log(`插件 "${PluginName}" 已成功复制到 "${PluginPath}"`);
  console.log('构建成功-------------');
} catch (err) {
  console.error(`复制出错 "${PluginName}":`, err);
}
