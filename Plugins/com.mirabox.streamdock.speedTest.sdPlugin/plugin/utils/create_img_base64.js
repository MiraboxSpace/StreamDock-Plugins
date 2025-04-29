const sharp = require('sharp');

async function createMetricsBase64({
  timeText = '⏲ 17 ms',
  downText = '▼ 4.47 M',
  upText = '▲ 4.24 M',
  valueText = '16:13',
  backgroundColor = 'black',
  textColor = 'white',
  greenColor = 'green',
  purpleColor = 'purple',
  fontFamily = 'sans-serif'
} = {}) {
  const width = 256;
  const height = 256;
  const largeFontSize = 64 - 16;

  const textSvg = `
    <svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="${backgroundColor}" />
      <style>
        .time { font-size: ${largeFontSize}px; fill: ${textColor}; text-anchor: middle; font-family: ${fontFamily}; }
        .ms { font-size: ${largeFontSize}px; fill: ${textColor}; text-anchor: middle; font-family: ${fontFamily}; }
        .down { font-size: ${largeFontSize}px; fill: ${greenColor}; text-anchor: middle; font-family: ${fontFamily}; }
        .up { font-size: ${largeFontSize}px; fill: ${purpleColor}; text-anchor: middle; font-family: ${fontFamily}; }
        .value { font-size: ${largeFontSize}px; fill: ${textColor}; text-anchor: middle; font-family: ${fontFamily}; }
      </style>
      <text x="${width / 2}" y="${64 - 20}" class="time">${timeText}</text>
      <text x="${width / 2}" y="${128 - 20}" class="down">${downText}</text>
      <text x="${width / 2}" y="${192 - 20}" class="up">${upText}</text>
      <text x="${width / 2}" y="${256 - 20}" class="value">${valueText}</text>
    </svg>
  `;

  try {
    await sharp(Buffer.from(textSvg)).png().toFile('cover.png');
    // const buffer = await sharp(Buffer.from(textSvg)).png().toBuffer();
    // const base64Image = buffer.toString('base64');
    // return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error('创建 Base64 图片时发生错误:', error);
    return null;
  }
}
module.exports = {
  createMetricsBase64
}
// 函数的调用示例
// createMetricsBase64().then(base64Data => {
//   if (base64Data) {
//     console.log('Base64 编码的图片数据:', base64Data);
//     // 你可以将 base64Data 用在 <img> 标签的 src 属性中，或者作为 API 请求的数据发送
//   }
// });

// createMetricsBase64({
//   timeText: '⏱️ 30 ms',
//   downText: '▼ 6.00 M',
//   upText: '▲ 5.50 M',
//   valueText: '16:20',
//   backgroundColor: 'teal',
//   textColor: 'white',
//   fontFamily: 'monospace'
// }).then(base64Data => {
//   if (base64Data) {
//     console.log('另一个 Base64 编码的图片数据:', base64Data);
//   }
// });