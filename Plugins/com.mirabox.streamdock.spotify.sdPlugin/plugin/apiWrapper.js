const log = require("./utils/plugin").log;

let _429Callback = null;
let _429Until = 0;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function register429Callback(callback) {
    _429Callback = callback;
}

function check429() {
    const now = Date.now();
    if (now < _429Until) {
        const remaining = Math.ceil((_429Until - now) / 1000);
        const error = new Error(`429限流，需等待${remaining}秒`);
        _429Callback(remaining)
        error.statusCode = 429;
        error.is429 = true;
        error.retryAfter = remaining;
        throw error;
    }
    if (_429Until != 0 && now > _429Until && _429Callback) {
        _429Until = 0;
        _429Callback(0);
    }
}

async function withRetry(apiCall, maxRetries = 2, onRetry = null) {
    check429();

    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await apiCall();
        } catch (error) {
            lastError = error;
            let errorType = "";
            if (error.body && error.body.error && error.body.error.message) {
                errorType = error.body.error.message;
            } else if (error.statusCode) {
                errorType = `${error.statusCode}`;
            } else if (error.code) {
                errorType = error.code;
            } else {
                errorType = error;
            }
            if (error.statusCode == 401) {
                throw error;
            }
            if (error.statusCode == 429) {
                const retryAfter = error.headers?.["retry-after"] || error.headers?.["Retry-After"] || 60;
                _429Until = Date.now() + retryAfter * 1000;
                if (_429Callback) {
                    _429Callback(parseInt(retryAfter));
                }
                throw error;
            }
            if (i < maxRetries - 1) {
                log.warn(`API调用失败，1秒后重试 (${i + 1}/${maxRetries}),错误类型:`, errorType);
                if (onRetry) {
                    await onRetry(error);
                }
                await sleep(1000);
                continue;
            }
            log.error(error);
            throw error;
        }
    }

    throw lastError;
}

module.exports = {
    withRetry,
    sleep,
    register429Callback,
};
