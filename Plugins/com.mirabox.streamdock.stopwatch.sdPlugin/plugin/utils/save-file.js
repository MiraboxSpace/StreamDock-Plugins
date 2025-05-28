const { log } = require('./plugin');
const { spawn } = require('child_process');
const path = require('path');

const BIN_PATH = path.join(__dirname,'utils', 'bin', 'FileDialogConsoleApp.exe');

async function showSaveFileDialog(filter = 'All files (*.*)|*.*', defaultFileName = '') {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(BIN_PATH, ['save', filter, defaultFileName]);
        let filePath = '';
        let errorOutput = '';
        try {
            log.info('Node.js stdout encoding:', childProcess.stdout.encoding);
        } catch (error) {
            log.info('Node.js stdout error:', error);
        }
        childProcess.stdout.on('data', (data) => {
            filePath += data.toString('utf8');
        });

        childProcess.stderr.on('data', (data) => {
            errorOutput += data.toString('utf8');
        });

        childProcess.on('close', (code) => {
            if (code === 0) {
                log.info('111111111111111111111',filePath);
                const lines = filePath.trim().split('\n');
                filePath = lines[lines.length - 1].trim();
                log.info('222222222222222222222',filePath);
                resolve(filePath);
            } else if (code === 1) {
                resolve(null); // 用户取消
            } else {
                reject(new Error(`文件保存对话框程序执行失败，错误代码: ${code}, 错误信息: ${errorOutput}`));
            }
        });
    });
}

module.exports = {
  showSaveFileDialog
}

// async function main() {
//     console.log('正在打开保存文件对话框...');
//     const saveFilePath = await showSaveFileDialog('Text files (*.txt)|*.txt', 'new_file.txt');
//     if (saveFilePath) {
//         console.log('用户选择的保存路径和文件名:', saveFilePath);
//         // 在这里你可以使用 saveFilePath 来创建文件或进行其他操作
//     } else {
//         console.log('用户取消了保存操作。');
//     }
// }

// main();