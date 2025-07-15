const fs = require('fs-extra');
const { log } = require('./plugin');

/**
 * 统一文件读取函数
 * @template T
 * @param {string} filePath 
 * @param {string} property 
 * @param {(value: any) => T} [transform] 
 * @returns {Promise<T|null>}
 */
async function readFileProperty(filePath, property, transform = v => v) {
    try {
        const data = await fs.readJson(filePath);
        return data[property] !== undefined ? transform(data[property]) : null;
    } catch (error) {
        if (error.code !== 'ENOENT') { // 忽略文件不存在的错误
            log.error(`读取文件 ${filePath} 属性 ${property} 时出错:`, error);
        }
        return null;
    }
}

/**
 * 将 OAuth2 令牌数据写入 JSON 文件
 * @param {string} filePath 
 * @param {object} tokenData 
 * @returns {Promise<void>}
 */
async function saveToken(filePath, tokenData) {
    try {
        const existingData = await fs.readJson(filePath).catch(error => {
            if (error.code === 'ENOENT') return {};
            throw error;
        });
        
        const mergedData = { ...existingData, ...tokenData };
        await fs.writeJson(filePath, mergedData, { spaces: 2 });
        log.info(`令牌数据已保存到 ${filePath}`);
    } catch (error) {
        log.error(`保存令牌数据到 ${filePath} 时出错:`, error);
        throw error;
    }
}

// 导出的各个属性读取方法
const getAccessToken = (filePath) => readFileProperty(filePath, 'access_token');
const getClientId = (filePath) => readFileProperty(filePath, 'clientId');
const getClientSecret = (filePath) => readFileProperty(filePath, 'clientSecret');
const getRefreshToken = (filePath) => readFileProperty(filePath, 'refresh_token');
const getLastUpdateTimeStamp = (filePath) => readFileProperty(filePath, 'lastUpdateTimeStamp');
const getExpiresIn = (filePath) => readFileProperty(filePath, 'expires_in');
const getCode = (filePath) => readFileProperty(filePath, 'code');
const getScopes = (filePath) => readFileProperty(filePath, 'scope', scopes => scopes ? scopes.split(" ") : null);

module.exports = { 
    getScopes, 
    getAccessToken, 
    getClientId, 
    getClientSecret, 
    saveToken, 
    getRefreshToken, 
    getLastUpdateTimeStamp, 
    getExpiresIn, 
    getCode 
};