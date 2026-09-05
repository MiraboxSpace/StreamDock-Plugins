const path = require("path");
const fs = require("fs");
/**
 * 读取 JSON 文件
 */
function readJsonSync(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
}
/**
 * 写入 JSON 文件
 */
function writeJsonSync(filePath, data, options) {
    const spaces = options?.spaces ?? 2;
    const content = JSON.stringify(data, null, spaces);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
}
/**
 * 加载 .env 文件到 process.env
 */
function loadEnv(envPath) {
    const filePath = envPath || path.join(__dirname, "../.env");
    if (!fs.existsSync(filePath)) {
        return;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
        // 跳过空行和注释
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }
        // 解析 KEY=VALUE
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (!match) {
            continue;
        }
        const key = match[1].trim();
        let value = match[2].trim();
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        // 只在环境变量不存在时设置
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}
loadEnv();
class OpenAIClient {
    baseURL;
    apiKey;
    constructor(options = {}) {
        this.baseURL = options.baseURL || "https://api.deepseek.com/";
        this.apiKey = options.apiKey || "sk-4dbc53b1c4194d6d9a998e0f2a794a28";
    }
    async chatCompletionsCreate(params) {
        const url = `${this.baseURL}/chat/completions`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }
        return await response.json();
    }
}
// 单例实例
let _client = null;
function getOpenAIClient() {
    if (!_client) {
        _client = new OpenAIClient({
            baseURL: process.env.OPENAI_BASE_URL,
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return _client;
}
const target_language = [
    { name: "Simplified Chinese", value: "zh_CN" },
    { name: "Traditional Chinese", value: "zh_HK" },
    { name: "English", value: "en" },
    { name: "German", value: "de" },
    { name: "Spanish", value: "es" },
    { name: "French", value: "fr" },
    { name: "Japanese", value: "ja" },
    { name: "Korean", value: "ko" },
    { name: "Italian", value: "it" },
    { name: "Portuguese", value: "pt" },
    { name: "Polish", value: "pl" },
    { name: "Russian", value: "ru" },
    { name: "Arabic", value: "ar" },
];
const MAX_CONCURRENCY = 3;
const BATCH_SIZE = 10;
function checkPlaceholders(original, translated) {
    const orig = original.match(/\{\d+\}/g) || [];
    const trans = translated.match(/\{\d+\}/g) || [];
    return orig.length === trans.length && orig.every((p) => trans.includes(p));
}
function createLimiter(max) {
    let activeCount = 0;
    const queue = [];
    const next = () => {
        activeCount--;
        if (queue.length > 0) {
            const { fn, resolve, reject } = queue.shift();
            run(fn).then(resolve).catch(reject);
        }
    };
    const run = async (fn) => {
        activeCount++;
        try {
            const result = await fn();
            next();
            return result;
        } catch (err) {
            next();
            throw err;
        }
    };
    return async (fn) => {
        if (activeCount < max) {
            return run(fn);
        }
        return new Promise((resolve, reject) => {
            queue.push({ fn, resolve, reject });
        });
    };
}
async function translateBatch(texts, target) {
    let tries = 0;
    while (tries < 3) {
        tries++;
        try {
            const chatCompletion = await getOpenAIClient().chatCompletionsCreate({
                model: process.env.OPENAI_MODEL || "deepseek-v4-flash",
                messages: [
                    {
                        role: "user",
                        content: `You are a translation assistant.
Translate the following texts into ${target}.
The text may include placeholders in the format {0}, {1}, etc.
Your translation must:
1. Keep all placeholders exactly as they appear, without changing numbers or braces.
2. Adjust the position of placeholders to match Chinese grammar if necessary, but do not remove them.
3. Only output translation results as an array of strings in the same order as input.
Texts: ${JSON.stringify(texts)}`,
                    },
                ],
            });
            const result = JSON.parse(chatCompletion.choices[0].message.content || "{}");
            const translations = result;
            let allValid = true;
            for (let k = 0; k < texts.length; k++) {
                if (!checkPlaceholders(texts[k], translations[k])) {
                    console.log(`Placeholder mismatch: ${texts[k]} -> ${translations[k]}`);
                    allValid = false;
                    break;
                }
            }
            if (allValid) {
                return translations;
            }
        } catch (err) {
            console.error("Batch translation error", err);
        }
    }
    return texts.map(() => "(translation failed)");
}
async function Maintranslate(source) {
    const sourcePath = path.resolve(source);
    if (!fs.existsSync(sourcePath)) {
        console.error(`Source file not found: ${sourcePath}`);
        process.exit(1);
    }
    const sourceData = readJsonSync(sourcePath);
    const sourceName = path.basename(sourcePath, ".json");
    const outputDir = path.dirname(sourcePath);
    console.log(`Source file: ${sourcePath}`);
    console.log(`Source language: ${sourceName}`);
    console.log(`Output directory: ${outputDir}`);
    // 找到源语言
    const sourceLang = target_language.find((l) => l.value === sourceName);
    if (!sourceLang) {
        console.error(`Unknown source language: ${sourceName}`);
        console.error(`Supported languages: ${target_language.map((l) => l.value).join(", ")}`);
        process.exit(1);
    }
    // 收集需要翻译的文本
    const localizationTexts = [];
    const localizationKeys = [];
    if (sourceData.Localization) {
        for (const [key, value] of Object.entries(sourceData.Localization)) {
            if (typeof value === "string") {
                localizationKeys.push(key);
                localizationTexts.push(value);
            }
        }
    }
    const manifestTexts = [];
    const manifestKeys = [];
    if (sourceData.Name) {
        manifestKeys.push("Name");
        manifestTexts.push(sourceData.Name);
    }
    if (sourceData.Description) {
        manifestKeys.push("Description");
        manifestTexts.push(sourceData.Description);
    }
    if (sourceData.Category) {
        manifestKeys.push("Category");
        manifestTexts.push(sourceData.Category);
    }
    // 收集 Action 相关文本
    const actionKeys = [];
    const actionTexts = [];
    for (const [key, value] of Object.entries(sourceData)) {
        if (key !== "Localization" && key !== "Name" && key !== "Description" && key !== "Category" && typeof value === "object" && value !== null) {
            if (value.Tooltip) {
                actionKeys.push(`${key}.Tooltip`);
                actionTexts.push(value.Tooltip);
            }
            if (value.Name) {
                actionKeys.push(`${key}.Name`);
                actionTexts.push(value.Name);
            }
        }
    }
    console.log(`Found ${localizationKeys.length} localization entries`);
    console.log(`Found ${manifestKeys.length} manifest entries`);
    console.log(`Found ${actionKeys.length} action entries`);
    const limit = createLimiter(MAX_CONCURRENCY);
    // 翻译到其他语言
    const targetLanguages = target_language.filter((l) => l.value !== sourceName);
    await Promise.all(
        targetLanguages.map((lang) =>
            limit(async () => {
                console.log(`Translating to ${lang.name} (${lang.value})...`);
                const outputFile = {};
                // 翻译 Localization
                if (localizationKeys.length > 0) {
                    outputFile.Localization = {};
                    for (let k = 0; k < localizationKeys.length; k += BATCH_SIZE) {
                        const batchKeys = localizationKeys.slice(k, k + BATCH_SIZE);
                        const batchTexts = localizationKeys.slice(k, k + BATCH_SIZE).map((key) => sourceData.Localization[key]);
                        const translated = await translateBatch(batchTexts, lang.name);
                        batchKeys.forEach((key, idx) => {
                            outputFile.Localization[key] = translated[idx];
                        });
                    }
                }
                // 翻译 manifest 字段
                if (manifestKeys.length > 0) {
                    const translated = await translateBatch(manifestTexts, lang.name);
                    manifestKeys.forEach((key, idx) => {
                        outputFile[key] = translated[idx];
                    });
                }
                // 翻译 Action 字段
                if (actionKeys.length > 0) {
                    for (let k = 0; k < actionKeys.length; k += BATCH_SIZE) {
                        const batchKeys = actionKeys.slice(k, k + BATCH_SIZE);
                        const batchTexts = actionKeys.slice(k, k + BATCH_SIZE).map((key) => {
                            const lastDotIndex = key.lastIndexOf(".");
                            const actionKey = key.substring(0, lastDotIndex); // "com.mirabox.streamdock.templates"
                            const field = key.substring(lastDotIndex + 1); // "action1"
                            return sourceData[actionKey][field];
                        });
                        const translated = await translateBatch(batchTexts, lang.name);
                        batchKeys.forEach((key, idx) => {
                            const lastDotIndex = key.lastIndexOf(".");
                            const actionKey = key.substring(0, lastDotIndex); // "com.mirabox.streamdock.templates"
                            const field = key.substring(lastDotIndex + 1); // "action1"
                            if (!outputFile[actionKey]) {
                                outputFile[actionKey] = {};
                            }
                            outputFile[actionKey][field] = translated[idx];
                        });
                    }
                }
                // 写入文件
                const outputPath = path.join(outputDir, `${lang.value}.json`);
                if (fs.existsSync(outputPath)) {
                    Object.assign(outputFile["Localization"], readJsonSync(outputPath)?.["Localization"]);
                }

                writeJsonSync(outputPath, outputFile, { spaces: 2 });
                console.log(`✓ Generated ${outputPath}`);
            }),
        ),
    );
    console.log("Translation completed!");
}
process.argv.push("./language/zh_CN.json");
if (process.argv.length > 2) {
    const temp = process.argv[2];
    if (temp.includes(":")) {
        Maintranslate(process.argv[2]);
    } else {
        const source = path.join(path.join(__dirname, "../"), process.argv[2]);
        Maintranslate(source);
    }
}
