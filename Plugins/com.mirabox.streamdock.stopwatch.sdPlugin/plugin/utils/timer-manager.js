const { Worker } = require('worker_threads');
const path = require('path');
const { TIME_STATE_ENUM } = require('./time-state-enum');

class TimerManager {
  constructor() {
    this.worker = new Worker(path.join(__dirname, 'timer-worker.js'), {
      workerData: {
        TIME_STATE_ENUM: TIME_STATE_ENUM
      }
    });
    this.callbacks = new Map();
    this.pendingRequests = new Map();
    this.requestId = 0;

    this.worker.on('message', (message) => {
      const { type, id, elapsedTime, state, requestId, timers } = message;

      if (type === 'update') {
        if (this.callbacks.has(id)) {
          this.callbacks.get(id)(elapsedTime, state);
        }
      } else if (type === 'response') {
        if (this.pendingRequests.has(requestId)) {
          const { resolve } = this.pendingRequests.get(requestId);
          resolve(timers || { id, elapsedTime, state });
          this.pendingRequests.delete(requestId);
        }
      }
    });
  }

  /**
   * 添加计时器
   * @param {string} id 计时器ID
   * @param {function} callback 更新回调
   */
  addTimer(id, callback) {
    this.callbacks.set(id, callback);
    this.worker.postMessage({
      type: 'add',
      id
    });
  }

  /**
   * 启动计时器
   * @param {string} id 计时器ID
   */
  startTimer(id) {
    this.worker.postMessage({
      type: 'start',
      id
    });
  }

  /**
   * 暂停计时器
   * @param {string} id 计时器ID
   */
  pauseTimer(id) {
    this.worker.postMessage({
      type: 'pause',
      id
    });
  }

  /**
   * 重置计时器
   * @param {string} id 计时器ID
   */
  resetTimer(id) {
    this.worker.postMessage({
      type: 'reset',
      id
    });
  }

  /**
   * 移除计时器
   * @param {string} id 计时器ID
   */
  removeTimer(id) {
    this.callbacks.delete(id);
    this.worker.postMessage({
      type: 'remove',
      id
    });
  }

  /**
   * 获取所有计时器状态
   * @returns {Promise<Array>} 包含所有计时器状态的数组
   */
  getAllTimers() {
    return new Promise((resolve) => {
      const requestId = this.requestId++;
      this.pendingRequests.set(requestId, { resolve });
      this.worker.postMessage({
        type: 'getAll',
        requestId
      });
    });
  }

  /**
   * 获取单个计时器状态
   * @param {string} id 计时器ID
   * @returns {Promise<Object>} 计时器状态
   */
  getTimer(id) {
    return new Promise((resolve) => {
      const requestId = this.requestId++;
      this.pendingRequests.set(requestId, { resolve });
      this.worker.postMessage({
        type: 'get',
        id,
        requestId
      });
    });
  }

  /**
   * 终止工作线程
   */
  terminate() {
    this.worker.terminate();
  }
}

module.exports = TimerManager;