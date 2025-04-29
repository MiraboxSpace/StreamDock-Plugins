const fs = require('fs').promises;
const path = require('path');
/**
 * 将 JSON 数据保存到指定路径
 * @param {Object} jsonData - 要保存的 JSON 数据
 * @param {string} filePath - 文件保存路径（可以是相对或绝对路径）
 */
async function saveJsonToFile(jsonData, filePath) {
    try {
        // 确保目录存在
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        
        // 将数据转换为格式化的 JSON 字符串
        const jsonString = JSON.stringify(jsonData, null, 2);
        
        // 写入文件
        await fs.writeFile(filePath, jsonString);
        
        console.info(`数据已成功保存到 ${path.resolve(filePath)}`);
        return [null, path.resolve(filePath)]
    } catch (error) {
        console.error('保存 JSON 文件时出错:', error);
        // throw error; // 可以选择重新抛出错误让调用者处理
        return [error, null]
    }
}

async function main() {
    let [err, result] = await saveJsonToFile([{name: 1, id: 1}], './servers.json');
    console.log(err, result);
}
main();