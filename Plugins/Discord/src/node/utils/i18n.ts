type I18nTable = Record<string, string>;

function getLocalization(): I18nTable {
    const i18n = global.i18n as { Localization?: I18nTable } | undefined;
    return i18n?.Localization || {};
}

export function t(key: string, fallback = key): string {
    return getLocalization()[key] || fallback;
}
