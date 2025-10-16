function isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
}
function isNotEmptyObject(obj) {
    return Object.keys(obj).length !== 0;
}
function nonce(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
/**
 * 从数组中删除所有等于指定值的元素。
 * @param {Array} array - 要操作的数组。
 * @param {*} valueToRemove - 要删除的值。
 */
function removeElementsByValue(array, valueToRemove) {
    let indexToRemove;
    while ((indexToRemove = array.indexOf(valueToRemove)) !== -1) {
        array.splice(indexToRemove, 1);
    }
}
// 防抖函数
function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// 节流函数
function throttle(func, delay) {
    let lastTime = 0;
    return function (...args) {
        const currentTime = Date.now();
        if (currentTime - lastTime >= delay) {
            func.apply(this, args);
            lastTime = currentTime;
        }
    };
}
function executeOnceAtATime(func) {
    let isExecuting = false;

    return async function (...args) {
        if (isExecuting) {
            // 上一个方法正在执行，不执行新的方法
            return;
        }

        isExecuting = true;

        try {
            // 执行方法
            await func.apply(this, args);
        } finally {
            // 方法执行完毕后重置标志位
            isExecuting = false;
        }
    };
}
function isNullOrWhitespace(input) {
    return !input || !input.trim();
}

module.exports = {
    isEmptyObject,
    isNotEmptyObject,
    nonce,
    removeElementsByValue,
    debounce,
    throttle,
    executeOnceAtATime,
    isNullOrWhitespace,

};