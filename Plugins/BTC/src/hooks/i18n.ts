export const useI18nStore = () => {
  const language = window.argv[3].application.language;
  const localString = {
    en: {
      涨跌: 'RiseFall',
      价格: 'Price',
    },
    zh_CN: {
      涨跌: '涨跌',
      价格: '价格',
    },
    de: {
      涨跌: 'Veränderung',
      价格: 'Preis',
    },
    es: {
      涨跌: 'Cambio',
      价格: 'Precio',
    },
    fr: {
      涨跌: 'Changement',
      价格: 'Prix',
    },
    ja: {
      涨跌: '変える',
      价格: '価格',
    },
    ko: {
      涨跌: '잔돈',
      价格: '값',
    }
  };
  return localString[language] || localString['en'];
};
