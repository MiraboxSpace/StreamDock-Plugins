import { InjectionKey } from 'vue';

export const ContextKey: InjectionKey<string> = Symbol('context');
export const RequestAiKey: InjectionKey<(context: string, message: any) => Promise<any>> = Symbol('requestAi');
export const MarkedKey: InjectionKey<(markdown: string) => string> = Symbol('marked');
export const SetDataKey: InjectionKey<(key: string, value: any) => void> = Symbol('setData');
export const GetDataKey: InjectionKey<(key: string) => any> = Symbol('getData');
export const I18nKey: InjectionKey<Record<string, string>> = Symbol('i18n');
export const OpenUrlKey: InjectionKey<(url: string) => void> = Symbol('openUrl');
export const EventStoreKey: InjectionKey<any> = Symbol('eventStore');