const dialog = require('node-file-dialog');

async function openSaveTxtFileDialog() {
  const result = await dialog({
    type: 'save-file',
    filters: [
      { name: 'Text Files', extensions: ['txt'] }
    ],
    defaultFilename: '未命名.txt',
    // 尝试禁用 "所有文件" 选项 (并非所有系统都支持)
    showAllFiles: false
  });

  if (result) {
    console.log('用户选择的保存路径:', result);
    return result;
  } else {
    console.log('用户取消了保存操作');
    return null;
  }
}

openSaveTxtFileDialog();