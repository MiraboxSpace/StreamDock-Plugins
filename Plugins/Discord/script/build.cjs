const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync, execSync } = require("child_process");
const ROOT = path.resolve(__dirname, "../");
console.log("开始执行自动化构建...");
let PluginName, PluginPath;
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

let buildWeb = false;
let buildNode = false;
let buildNative = false;
if (process.argv.length <= 2) {
    buildWeb = true;
    buildNode = true;
    buildNative = false;
}
if (process.argv.some((ele) => ele == "-web")) {
    buildWeb = true;
}
if (process.argv.some((ele) => ele == "-node")) {
    buildNode = true;
}
if (process.argv.some((ele) => ele == "-native")) {
    buildNative = true;
}
try {
    fs.rmSync(path.resolve(__dirname, "../build"), { recursive: true });
} catch {}

const SRC_FILE = path.join(ROOT, "./src/node/index.ts");
if (!fs.existsSync(SRC_FILE)) {
    buildNode = false;
}
if (!fs.existsSync(path.join(__dirname, "../src/native"))) {
    buildNative = false;
}
function runNodeScript(script, args = []) {
    execFileSync(process.execPath, [script, ...args], { stdio: "inherit", cwd: ROOT });
}

if (buildWeb) runNodeScript(path.join(ROOT, "node_modules/vite/bin/vite.js"), ["build"]);
if (buildNode) {
    runNodeScript(path.join(ROOT, "node_modules/typescript/bin/tsc"), ["-p", path.join(ROOT, "./tsconfig.ncc.json")]);
    runNodeScript(path.join(ROOT, "node_modules/@vercel/ncc/dist/ncc/cli.js"), [
        "build",
        "-m",
        "--no-cache",
        path.join(ROOT, "./build/tsc_build/index.js"),
        "-o",
        path.join(ROOT, "./build/ncc_build"),
    ]);
}
if (buildNative) {
    let nativeModules = [];
    const items = fs.readdirSync(path.join(__dirname, "../src/native"), {
        withFileTypes: true,
    });
    items.forEach((item) => {
        if (item.isDirectory() && item.name !== "shared") {
            nativeModules.push(item.name);
        }
    });
    for (const module of nativeModules) {
        try {
            execSync("node-gyp configure build", {
                cwd: path.join(__dirname, "../src/native", module),
                stdio: "inherit",
            });
            console.log(`✓ ${module} built successfully`);
        } catch (error) {
            console.error(`✗ Failed to build ${module}`);
        }
    }
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
    if (buildWeb) fs.cpSync(path.resolve(__dirname, "../build/vite_build"), PluginPath, { recursive: true });
    if (buildNode) fs.cpSync(path.resolve(__dirname, "../build/ncc_build"), path.join(PluginPath, "plugin"), { recursive: true });
    fs.writeFileSync(path.join(PluginPath, "manifest.json"), JSON.stringify(manifest, null, 2), { encoding: "utf-8" });
    if (fs.existsSync(path.join(__dirname, "../src/native"))) {
        let nativeModules = [];
        let sourcePath = path.join(__dirname, "../src/native");
        let targetPath = path.join(PluginPath, "plugin");
        const items = fs.readdirSync(sourcePath, { withFileTypes: true });
        items.forEach((item) => {
            if (item.isDirectory()) {
                nativeModules.push(item.name);
            }
        });
        for (const module of nativeModules) {
            if (module == "shared") continue;
            console.log(path.join(sourcePath, module, "build/Release"));
            console.log(path.join(targetPath, "build/Release"));
            fs.copySync(path.join(sourcePath, module, "build/Release"), path.join(targetPath, "build/Release"), {
                filter: (src) => {
                    return src.endsWith(".node") || src.endsWith("Release");
                },
            });
        }
    }
    const tempPath = path.resolve(__dirname, "../language");
    if (fs.existsSync(tempPath)) fs.cpSync(tempPath, PluginPath, { recursive: true });
    console.log(`插件 "${PluginName}" 已成功复制到 "${PluginPath}"`);
    console.log("构建成功-------------");
} catch (err) {
    console.error(`复制出错 "${PluginName}":`, err);
}
