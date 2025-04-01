import { defineStore } from 'pinia';

interface EventHandler<T> {
  (payload: T): void;
}

interface EventHandlers {
  [eventName: string]: EventHandler<any>[];
}

export const useEventStore = defineStore('events', {
  state: () => ({
    handlers: {} as EventHandlers,
  }),
  actions: {
    on(eventName: string, handler: EventHandler<any>) {
      if (!this.handlers[eventName]) {
        this.handlers[eventName] = [];
      }
      this.handlers[eventName].push(handler);
    },
    off(eventName: string, handler: EventHandler<any>) {
      if (this.handlers[eventName]) {
        this.handlers[eventName] = this.handlers[eventName].filter(h => h !== handler);
      }
    },
    emit(eventName: string, payload: any) {
      if (this.handlers[eventName]) {
        this.handlers[eventName].forEach(handler => handler(payload));
      }
    },
  },
});



