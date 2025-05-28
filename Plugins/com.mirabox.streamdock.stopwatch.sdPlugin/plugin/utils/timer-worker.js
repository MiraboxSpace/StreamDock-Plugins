const { parentPort, workerData } = require('worker_threads');
const TIME_STATE_ENUM = workerData.TIME_STATE_ENUM;
class Timer {
  constructor(id) {
    this.id = id;
    this.startTime = null;
    this.pausedTime = 0; // 累计暂停时间
    this.elapsedTime = 0; // 累计运行时间
    this.interval = null;
    this.state = TIME_STATE_ENUM.STOPPED;
  }

  start() {
    if (this.state === TIME_STATE_ENUM.RUNNING) return;

    if (this.state === TIME_STATE_ENUM.PAUSED) {
      // 从暂停状态恢复
      this.startTime = Date.now() - this.pausedTime;
    } else {
      // 全新启动
      this.startTime = Date.now();
      this.elapsedTime = 0;
      this.pausedTime = 0;
    }

    this.state = TIME_STATE_ENUM.RUNNING;

    this.interval = setInterval(() => {
      this.elapsedTime = Date.now() - this.startTime;
      const formattedTime = this.formatTime(this.elapsedTime);

      parentPort.postMessage({
        type: 'update',
        id: this.id,
        elapsedTime: formattedTime,
        state: this.state
      });
    }, 1000);
  }

  pause() {
    if (this.state !== TIME_STATE_ENUM.RUNNING) return;

    clearInterval(this.interval);
    this.pausedTime = Date.now() - this.startTime;
    this.state = TIME_STATE_ENUM.PAUSED;

    parentPort.postMessage({
      type: 'update',
      id: this.id,
      elapsedTime: this.formatTime(this.pausedTime),
      state: this.state
    });
  }

  reset() {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.startTime = null;
    this.pausedTime = 0;
    this.elapsedTime = 0;
    this.state = TIME_STATE_ENUM.STOPPED;

    parentPort.postMessage({
      type: 'update',
      id: this.id,
      elapsedTime: '00:00:00',
      state: this.state
    });
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.state = TIME_STATE_ENUM.STOPPED;
  }

  getStatus() {
    let time;
    if (this.state === TIME_STATE_ENUM.STOPPED) {
      time = '00:00:00';
    } else if (this.state === TIME_STATE_ENUM.PAUSED) {
      time = this.formatTime(this.pausedTime);
    } else if (this.state === TIME_STATE_ENUM.RUNNING) {
      time = this.formatTime(Date.now() - this.startTime);
    }

    return {
      id: this.id,
      elapsedTime: time,
      state: this.state
    };
  }

  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  }
}

const timers = new Map();

parentPort.on('message', (message) => {
  const { type, id, requestId } = message;

  switch (type) {
    case 'add':
      if (!timers.has(id)) {
        timers.set(id, new Timer(id));
      }
      parentPort.postMessage({
        type: 'update',
        id: id,
        elapsedTime: timers.get(id).getStatus().elapsedTime,
        state: timers.get(id).getStatus().state
      });
      break;

    case 'start':
      if (timers.has(id)) {
        timers.get(id).start();
      }
      break;

    case 'pause':
      if (timers.has(id)) {
        timers.get(id).pause();
      }
      break;

    case 'reset':
      if (timers.has(id)) {
        timers.get(id).reset();
      }
      break;

    case 'remove':
      if (timers.has(id)) {
        timers.get(id).stop();
        timers.delete(id);
      }
      break;

    case 'get':
      if (timers.has(id)) {
        parentPort.postMessage({
          type: 'response',
          requestId,
          ...timers.get(id).getStatus()
        });
      }
      break;

    case 'getAll':
      const allTimers = Array.from(timers.values()).map(timer => 
        timer.getStatus()
      );
      parentPort.postMessage({
        type: 'response',
        requestId,
        timers: allTimers
      });
      break;
  }
});