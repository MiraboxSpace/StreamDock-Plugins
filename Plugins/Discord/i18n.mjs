import fs from 'fs';
let useI18nStore;
let localString = null;
useI18nStore = () => {
  if (!localString) {
    const language = globalThis.language || 'en';
    const filePath = `${language}.json`;
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    localString = json.Localization;
  }
  return localString;
};
export { useI18nStore };
