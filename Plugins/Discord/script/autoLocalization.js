const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const fileExtension = '*.js;*.ts;*.vue;*.mjs;*.cjs;*.html';
const excludePath = 'node_modules;script;build';
const baseDir = path.dirname(__dirname);
const { parseDocument } = require('htmlparser2');
const render = require('dom-serializer').default;
const awaitToTranslate = {};
const MAX_CONCURRENCY = 3; // 同时进行翻译的语言任务数量
const BATCH_SIZE = 10; // 每次翻译的文本条数
const extensions = parseExtensions(fileExtension);
const excludeDirs = parseExcludePaths(excludePath);
const target_language = [
  { name: 'Simplified Chinese', value: 'zh_CN' },
  { name: 'Traditional Chinese', value: 'zh_HK' },
  { name: 'English', value: 'en' },
  { name: 'German', value: 'de' },
  { name: 'Spanish', value: 'es' },
  { name: 'French', value: 'fr' },
  { name: 'Japanese', value: 'ja' },
  { name: 'Korean', value: 'ko' },
  { name: 'Italian', value: 'it' },
  { name: 'Portuguese', value: 'pt' },
  { name: 'Polish', value: 'pl' },
  { name: 'Russian', value: 'ru' },
  { name: 'Arabic', value: 'ar' },
];
const OuputFile = {};
const openai = new OpenAI({ baseURL: 'https://www.vivaapi.cn/v1', apiKey: 'sk-hmyBL7tzES2q0XoSSxsfHackvHSrhBhBZiNUnT0jtnWkfsHp' });
function localizeTemplate(str, start = '${', end = '}') {
  let result = '';
  let index = 0;
  let replaceText = '';
  let i = 0;
  while (i < str.length) {
    // 判断当前位置是否是起始符
    if (str.startsWith(start, i)) {
      i += start.length; // 跳过起始符
      let placeholder = '';
      // 找结束符
      while (i < str.length && !str.startsWith(end, i)) {
        placeholder += str[i];
        i++;
      }
      if (str.startsWith(end, i)) {
        i += end.length; // 跳过结束符
      }
      // 占位符替换成 {index}
      result += `{${index}}`;
      replaceText += `.replaceAll('{${index++}}', ${placeholder})`;
    } else {
      result += str[i];
      i++;
    }
  }
  return [result, replaceText];
}
function genKeyFromText(text) {
  return text
    .toLowerCase()
    .replace(/[# ]+/g, '')
    .replace(/^_+|_+$/g, '');
}
function checkPlaceholders(original, translated) {
  const originalPlaceholders = original.match(/\{\d+\}/g) || [];
  const translatedPlaceholders = translated.match(/\{\d+\}/g) || [];
  const sameLength = originalPlaceholders.length === translatedPlaceholders.length;
  const sameSet = originalPlaceholders.every((p) => translatedPlaceholders.includes(p));
  return sameLength && sameSet;
}
function parseExtensions(extStr) {
  return extStr
    .split(';')
    .filter(Boolean)
    .map((e) => e.replace('*.', '').toLowerCase());
}
function parseExcludePaths(excludeStr) {
  return excludeStr
    .split(';')
    .filter(Boolean)
    .map((p) => p.trim());
}
function traverseDir(dir, fileList = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(baseDir, fullPath).replaceAll('\\', '/');

    if (item.isDirectory()) {
      if (excludeDirs.some((ex) => relativePath.startsWith(ex))) {
        continue;
      }
      traverseDir(fullPath, fileList);
    } else {
      const ext = path.extname(item.name).substring(1).toLowerCase();
      if (extensions.includes(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}
function isAllWhitespace(str) {
  return /^\s*$/.test(str);
}
function HTMLProcess(text, isvue = true) {
  const dom = parseDocument(text);
  function HTMLtraverse(node) {
    if (node.type === 'text' && !isAllWhitespace(node.data)) {
      if (node.parent) {
        if (node.parent.type == 'style') {
          return;
        } else if (node.parent.type == 'script') {
          node.data = JSProcess(node.data);
          return;
        }
      }
      let text = node.data.replace(/(\r\n|\r|\n)/g, '');
      if (isvue) {
        if (text.includes('i18n[') || !text.startsWith('##')) {
          return;
        }
        const [a, b] = localizeTemplate(text, '{{', '}}');
        const key = genKeyFromText(a);
        awaitToTranslate[key] = a;
        node.data = `{{ i18n['${key}']${b} }}`;
      } else {
        if (text.startsWith('@@@')) {
          return;
        }
        if (text in OuputFile['zh_CN']['Localization']) {
          return;
        }
        const key = genKeyFromText(text);
        awaitToTranslate[key] = text;
        node.data = key;
      }
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach(HTMLtraverse);
    }
  }
  dom.children.forEach(HTMLtraverse);
  text = render(dom, { decodeEntities: false });
  if (isvue) {
    let regex = / ([^\s:=]*?) *?= *?(['"])##(.*?)\2/g;
    text = text.replace(regex, (match, tag, quote, content) => {
      const key = genKeyFromText(content);
      awaitToTranslate[key] = content;
      return ` :${tag} = ${quote}i18n['${key}']${quote}`;
    });
    regex = / :([^\s:=]*?) *?= *?(['"])(.*?)\2/g;
    text = text.replace(regex, (match, tag, quote, content) => {
      content = JSProcess(content);
      return ` :${tag} = ${quote + content + quote}`;
    });
  }
  return text;
}
function JSProcess(text) {
  const regex = /(["'`])(.*?)\1/g;
  text = text.replace(regex, (match, quote, content) => {
    if (!content.startsWith('##')) {
      return quote + content + quote;
    }
    if (quote == '`') {
      const [a, b] = localizeTemplate(content);
      let c = a.slice(2);
      const key = genKeyFromText(c);
      awaitToTranslate[key] = c;
      const newContent = `i18n['${key}']${b}`;
      return newContent;
    } else {
      const key = genKeyFromText(content);
      awaitToTranslate[key] = content.slice(2);
      const newContent = `i18n['${key}']`;
      return newContent;
    }
  });
  return text;
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
      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `
You are a translation assistant.
Translate the following texts into ${target}.
The text may include placeholders in the format {0}, {1}, etc.
Your translation must:
1. Keep all placeholders exactly as they appear, without changing numbers or braces.
2. Adjust the position of placeholders to match Chinese grammar if necessary, but do not remove them.
3. Only output translation results as an array of strings in the same order as input.
Texts: ${JSON.stringify(texts)}
`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'translation_batch_schema',
            schema: {
              type: 'object',
              properties: {
                translations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '按顺序对应输入文本的翻译结果',
                },
              },
              required: ['translations'],
              additionalProperties: false,
            },
          },
        },
      });
      const result = JSON.parse(chatCompletion.choices[0].message.content);
      const translations = result.translations;
      let allValid = true;
      for (let i = 0; i < texts.length; i++) {
        if (!checkPlaceholders(texts[i], translations[i])) {
          console.log(`占位符不匹配: ${texts[i]} -> ${translations[i]}`);
          allValid = false;
          break;
        }
      }
      if (allValid) {
        return translations;
      }
    } catch (err) {
      console.error('批量翻译错误', err);
    }
  }
  return texts.map(() => '(翻译失败)');
}
function ruleMatching(text, ext) {
  if (ext == '.js' || ext == '.ts' || ext == '.mjs' || ext == '.cjs') {
    text = JSProcess(text);
  } else if (ext == '.vue') {
    const scriptRegex = /<script(.*?)>([\s\S]*?)<\/script>/i;
    text = text.replace(scriptRegex, (match, left, innerContent) => {
      return `<script${left}>${JSProcess(innerContent)}</script>`;
    });
    const templateRegex = /<template(.*?)>([\s\S]*?)<\/template>/i;
    text = text.replace(templateRegex, (match, left, innerContent) => {
      const temp = HTMLProcess(innerContent);
      return `<template${left}>${temp}</template>`;
    });
  } else if (ext == '.html') {
    return HTMLProcess(text, false);
  }
  return text;
}
async function addTask(file) {
  let text = fs.readFileSync(file, { encoding: 'utf-8' });
  let ext = path.extname(file);
  // const output = ASTProcess(text);
  const output = ruleMatching(text, ext);
  fs.writeFileSync(file, output, { encoding: 'utf-8' });
}
async function main() {
  const result = traverseDir(path.resolve(__dirname, '../'));
  for (let item of target_language) {
    OuputFile[item.value] = {};
    try {
      let temp = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../${item.value}.json`), { encoding: 'utf-8' }));
      if (temp) {
        OuputFile[item.value] = temp;
      }
    } catch {}
  }
  for (let item in OuputFile['zh_CN']['Localization']) {
    awaitToTranslate[item] = OuputFile['zh_CN']['Localization'][item];
  }
  for (let temp_path of result) {
    await addTask(temp_path);
  }
  const limit = createLimiter(MAX_CONCURRENCY);
  await Promise.all(
    target_language.map((lang) =>
      limit(async () => {
        if (!OuputFile[lang.value]['Localization']) {
          OuputFile[lang.value]['Localization'] = {};
        }
        const keys = Object.keys(awaitToTranslate);
        let toTranslateKeys = [];
        for (const k of keys) {
          if (!OuputFile[lang.value]['Localization'][k]) {
            toTranslateKeys.push(k);
          }
        }
        for (let i = 0; i < toTranslateKeys.length; i += BATCH_SIZE) {
          const batchKeys = toTranslateKeys.slice(i, i + BATCH_SIZE);
          const batchTexts = batchKeys.map((k) => awaitToTranslate[k]);

          const translated = await translateBatch(batchTexts, lang.name);

          batchKeys.forEach((key, idx) => {
            OuputFile[lang.value]['Localization'][key] = translated[idx];
          });
        }
      }),
    ),
  );
  let temp = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../manifest.json`), { encoding: 'utf-8' }));
  let awaitTranslateTest = {};
  awaitTranslateTest = {};
  for (let item of temp['Actions']) {
    awaitTranslateTest[item['UUID']] = {
      Tooltip: item['Tooltip'] || '空',
      Name: item['Name'] || '空',
    };
  }
  await Promise.all(
    target_language.map((lang) =>
      limit(async () => {
        const basicTranslated = await translateBatch([temp['Name'] || '', temp['Description'] || '', temp['Category'] || ''], lang.name);
        OuputFile[lang.value]['Name'] = basicTranslated[0];
        OuputFile[lang.value]['Description'] = basicTranslated[1];
        OuputFile[lang.value]['Category'] = basicTranslated[2];
        for (let i = 0; i < awaitTranslateTest.length; i += BATCH_SIZE) {
          const batchKeys = awaitTranslateTest.slice(i, i + BATCH_SIZE).filter((key) => {
            const existData = OuputFile[lang.value][key];
            return !(existData && existData.Tooltip && existData.Name);
          });
          if (batchKeys.length === 0) continue;
          const batchTexts = batchKeys.flatMap((k) => [awaitTranslateTest[k].Tooltip, awaitTranslateTest[k].Name]);
          const translated = await translateBatch(batchTexts, lang.name);
          batchKeys.forEach((key, idx) => {
            OuputFile[lang.value][key] = {
              Tooltip: translated[idx * 2],
              Name: translated[idx * 2 + 1],
            };
          });
        }
      }),
    ),
  );
  for (let item in OuputFile) {
    fs.writeFileSync(path.resolve(__dirname, `../${item}.json`), JSON.stringify(OuputFile[item], null, 2), { encoding: 'utf-8' });
  }
}
main();
// addTask('E:\\Work\\StreamDock-Plugins\\Plugins\\Discord\\plugin\\action1.vue');
