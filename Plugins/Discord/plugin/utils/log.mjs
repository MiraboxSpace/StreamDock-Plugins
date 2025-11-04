import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
// __filename 等价物
const __filename = fileURLToPath(import.meta.url);
// __dirname 等价物
const __dirname = dirname(__filename);
function getLogFilePath() {
  const now = new Date();
  const logDir = path.resolve(__dirname, 'log');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return path.join(logDir, `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.log`);
}
getLogFilePath();
function formatBeijingTime(date = new Date()) {
  const pad = (num, size = 2) => String(num).padStart(size, '0');
  let hours = date.getUTCHours() + 8;
  if (hours >= 24) hours -= 24;
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  const milliseconds = pad(date.getUTCMilliseconds(), 3);
  return `${pad(hours)}:${minutes}:${seconds}:${milliseconds}`;
}
function formatArgs(args) {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.message + '\n' + arg.stack;
      } else if (typeof arg === 'object') {
        return JSON.stringify(arg);
      } else {
        return String(arg);
      }
    })
    .join(' ');
}
function writeLog(level, ...args) {
  const timestamp = formatBeijingTime();
  const message = formatArgs(args);
  const logMsg = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  fs.appendFileSync(getLogFilePath(), logMsg, 'utf8');
}
const log = {
  info: (...args) => writeLog('info', ...args),
  warn: (...args) => writeLog('warn', ...args),
  error: (...args) => writeLog('error', ...args),
  debug: (...args) => writeLog('debug', ...args),
};

//##################################################
//##################全局异常捕获#####################
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason);
});
//##################################################
//##################################################
export { log };
