// eventBus.js
const eventBus = {
    handlers: {},
  
    /**
     * 注册事件监听器。
     * @param {string} eventName 事件名称。
     * @param {function} handler 事件处理函数。
     */
    on: function(eventName, handler) {
      if (!this.handlers[eventName]) {
        this.handlers[eventName] = [];
      }
      this.handlers[eventName].push(handler);
    },
  
    /**
     * 移除事件监听器。
     * @param {string} eventName 事件名称。
     * @param {function} handler 事件处理函数。
     */
    off: function(eventName, handler) {
      if (this.handlers[eventName]) {
        this.handlers[eventName] = this.handlers[eventName].filter(h => h !== handler);
      }
    },
  
    /**
     * 触发事件。
     * @param {string} eventName 事件名称。
     * @param {any} payload 事件负载。
     */
    emit: function(eventName, payload) {
      if (this.handlers[eventName]) {
        this.handlers[eventName].forEach(handler => handler(payload));
      }
    },
  };
  
  module.exports = eventBus;