export const useI18nStore = () => {
  const language = window.argv[3].application.language;
  const localString = {
    en: {
      '开始或暂停 双击重新开始': 'Start or pause, dbclick to restart',
      常规: 'Routine',
      放大: 'Enlargement',
      显示方式: 'Display mode',
    },
    zh_CN: {
      '开始或暂停 双击重新开始': '开始或暂停 双击重新开始',
      常规: '常规',
      放大: '放大',
      显示方式: '显示方式',
    }
  };
  return localString[language] || localString['en'];
};
