const listeners = new Map(); // 使用 Map 而非 WeakMap

// 添加监听
function addListener(propertyKey, callback) {
    if (!listeners.has(propertyKey)) {
        listeners.set(propertyKey, new Set());
    }
    listeners.get(propertyKey).add(callback);
    // 返回取消监听的函数
    return () => {
        const callbacks = listeners.get(propertyKey);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                listeners.delete(propertyKey);
            }
        }
    };
}

// 移除监听
function removeListener(propertyKey, callback) {
    const callbacks = listeners.get(propertyKey);
    if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
            listeners.delete(propertyKey); // 显式清理空键
        }
    }
}

let debounceTime = 100; // 防抖延迟时间（毫秒）
let debounceTimer = null; // 存储计时器

function notifyListeners(vm) {
    // 每次调用时，清除之前的计时器
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    // 设置新的计时器，延迟执行实际逻辑
    debounceTimer = setTimeout(() => {
        listeners.forEach((callbacks, propertyKey) => {
            const value = vm.getOption(propertyKey);
            callbacks.forEach(fn => {
                try { fn(value); } catch (e) { console.error(e); }
            });
        });
    }, debounceTime);
}

module.exports = {
  addListener,
  removeListener,
  notifyListeners
}