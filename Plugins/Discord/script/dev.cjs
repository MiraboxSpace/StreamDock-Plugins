const path = require("path");
const os = require("os");
const fs = require("fs");
let PluginName, PluginPath;
console.log("开始执行自动化构建...");
function getDateYYMMDD() {
    const formatter = new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === "year").value;
    const month = parts.find((p) => p.type === "month").value;
    const day = parts.find((p) => p.type === "day").value;
    return `${year}${month}${day}`;
}

const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../manifest.json"), "utf-8"));

if (manifest["Actions"].length > 0) {
    let temp = manifest["Actions"][0]["UUID"];
    PluginName = `${temp.substring(0, temp.lastIndexOf("."))}.sdPlugin`;
} else {
    if (manifest["Name"].includes("com")) {
        PluginName = `${manifest["Name"]}.sdPlugin`;
    } else {
        PluginName = `com.mirabox.streamdock.${manifest["Name"]}.sdPlugin`;
    }
}
manifest["Version"] = manifest["Version"].replaceAll("auto", getDateYYMMDD());
if (os.type() === "Windows_NT") {
    PluginPath = path.join(os.homedir(), "Appdata/Roaming/HotSpot/StreamDock/plugins", PluginName);
} else if (os.type() === "Darwin") {
    PluginPath = path.join(os.homedir(), "/Library/Application Support/HotSpot/StreamDock/plugins/", PluginName);
}
try {
    fs.mkdirSync(path.dirname(PluginPath), { recursive: true });
    fs.mkdirSync(path.dirname(PluginPath, "plugin"), { recursive: true });
} catch {}

try {
    fs.writeFileSync(path.join(PluginPath, "manifest.json"), JSON.stringify(manifest, null, 2), { encoding: "utf-8" });
    fs.cpSync(path.resolve(__dirname, "../build/vite_build"), path.join(PluginPath), { recursive: true });
    const content = `import { spawnSync, execSync } from 'node:child_process';
try {
  console.log('编译 TypeScript 文件...');
  execSync('npx tsc --project tsconfig.ncc.json', {
    stdio: 'inherit',
    cwd:"${process.cwd().replaceAll("\\", "\\\\")}"
  });
} catch (err) {
  console.error('TypeScript 编译失败:', err);
  process.exit(1);
}
const target = '${path.resolve(__dirname, "../build/tsc_build/index.js").replaceAll("\\", "\\\\")}';
const args = [
  target,
  ...process.argv.slice(2),
  "-dev"
];
const ret = spawnSync("node.exe", args, { stdio: 'inherit', windowsHide: true,cwd:"${process.cwd().replaceAll("\\", "\\\\")}" });
process.exit(ret.status ?? 1);`;
    fs.writeFileSync(path.join(PluginPath, "plugin", "index.js"), content, {
        encoding: "utf8",
        flag: "w",
    });

    console.log(`插件 "${PluginName}" 已成功复制到 "${PluginPath}"`);
    console.log("构建成功-------------");
} catch (err) {
    console.error(`复制出错 "${PluginName}":`, err);
}
