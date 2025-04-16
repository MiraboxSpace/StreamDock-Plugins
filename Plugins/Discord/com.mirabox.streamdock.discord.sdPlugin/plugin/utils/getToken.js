const fs = require('fs-extra')
const { log } = require('./plugin');

async function getToken(filePath) {
    try {
        const data = await fs.readJson(filePath);
        // log.info(data.access_token)
        return data.access_token || null;  // 返回 access_token 或者 null（如果文件中没有 access_token
    } catch (error) {
        return null;
    }
}

async function getClientId(filePath) {
    try {
        const data = await fs.readJson(filePath);
        // log.info(data.access_token)
        return data.clientId || null;  // 返回 access_token 或者 null（如果文件中没有 access_token
    } catch (error) {
        // log.error('读取文件时发生错误:', error);
        return null;
    }
}

module.exports = {getToken,getClientId};