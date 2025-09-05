/**
 * 基础指数退避重试函数
 * @param {Function} asyncOperation - 异步操作函数，返回 Promise
 * @param {Object} options - 配置选项
 * @returns {Promise} - 操作结果
 */
async function withExponentialBackoff(asyncOperation, options = {}) {
    const {
        maxRetries = 5,
        initialDelay = 1000, // 1秒
        exponentialBase = 2,
        jitter = true,
        maxDelay = 30000, // 30秒
        shouldRetry = (error) => true // 判断哪些错误需要重试
    } = options;

    let retries = 0;

    while (retries < maxRetries) {
        try {
            return await asyncOperation();
        } catch (error) {
            if (!shouldRetry(error)) {
                console.log('❌ 操作失败，非重试错误，放弃操作。');
                throw error;
            }

            retries++;

            // 计算退避时间
            // 使用 Math.pow(exponentialBase, retries - 1) 是标准的指数增长
            let waitTime = Math.min(initialDelay * Math.pow(exponentialBase, retries - 1), maxDelay);

            // 添加随机抖动
            if (jitter) {
                // 等抖动（Equal Jitter）: 避免退避时间过短
                waitTime = waitTime / 2 + (Math.random() * waitTime / 2);
            }

            console.log(`⚠️ 操作失败，第 ${retries} 次重试将在 ${(waitTime / 1000).toFixed(2)} 秒后开始...`);

            // 等待
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    // 最后一次重试
    try {
        return await asyncOperation();
    } catch (error) {
        console.log(`❌ 重试 ${maxRetries} 次后仍失败，放弃操作。`);
        throw error;
    }
}

module.exports = {
    withExponentialBackoff
};