// hexagram.js
const hexagrams = [
  { lines: [0, 0, 0, 0, 0, 0], name: "坤（地）" },
  { lines: [1, 0, 0, 0, 0, 0], name: "屯" },
  { lines: [0, 1, 0, 0, 0, 0], name: "蒙" },
  { lines: [1, 1, 0, 0, 0, 0], name: "需" },
  { lines: [0, 0, 1, 0, 0, 0], name: "讼" },
  { lines: [1, 0, 1, 0, 0, 0], name: "师" },
  { lines: [0, 1, 1, 0, 0, 0], name: "比" },
  { lines: [1, 1, 1, 0, 0, 0], name: "小畜" },
  { lines: [0, 0, 0, 1, 0, 0], name: "履" },
  { lines: [1, 0, 0, 1, 0, 0], name: "泰" },
  { lines: [0, 1, 0, 1, 0, 0], name: "否" },
  { lines: [1, 1, 0, 1, 0, 0], name: "同人" },
  { lines: [0, 0, 1, 1, 0, 0], name: "大有" },
  { lines: [1, 0, 1, 1, 0, 0], name: "谦" },
  { lines: [0, 1, 1, 1, 0, 0], name: "豫" },
  { lines: [1, 1, 1, 1, 0, 0], name: "随" },
  { lines: [0, 0, 0, 0, 1, 0], name: "蛊" },
  { lines: [1, 0, 0, 0, 1, 0], name: "临" },
  { lines: [0, 1, 0, 0, 1, 0], name: "观" },
  { lines: [1, 1, 0, 0, 1, 0], name: "噬嗑" },
  { lines: [0, 0, 1, 0, 1, 0], name: "贲" },
  { lines: [1, 0, 1, 0, 1, 0], name: "剥" },
  { lines: [0, 1, 1, 0, 1, 0], name: "复" },
  { lines: [1, 1, 1, 0, 1, 0], name: "无妄" },
  { lines: [0, 0, 0, 1, 1, 0], name: "大畜" },
  { lines: [1, 0, 0, 1, 1, 0], name: "颐" },
  { lines: [0, 1, 0, 1, 1, 0], name: "大过" },
  { lines: [1, 1, 0, 1, 1, 0], name: "坎（水）" },
  { lines: [0, 0, 1, 1, 1, 0], name: "离（火）" },
  { lines: [1, 0, 1, 1, 1, 0], name: "咸" },
  { lines: [0, 1, 1, 1, 1, 0], name: "恒" },
  { lines: [1, 1, 1, 1, 1, 0], name: "遁" },
  { lines: [0, 0, 0, 0, 0, 1], name: "天泽履" },
  { lines: [1, 0, 0, 0, 0, 1], name: "地雷复" },
  { lines: [0, 1, 0, 0, 0, 1], name: "水山蹇" },
  { lines: [1, 1, 0, 0, 0, 1], name: "火山旅" },
  { lines: [0, 0, 1, 0, 0, 1], name: "山水蒙" },
  { lines: [1, 0, 1, 0, 0, 1], name: "风雷益" },
  { lines: [0, 1, 1, 0, 0, 1], name: "风水涣" },
  { lines: [1, 1, 1, 0, 0, 1], name: "地泽临" },
  { lines: [0, 0, 0, 1, 0, 1], name: "地天泰" },
  { lines: [1, 0, 0, 1, 0, 1], name: "山地剥" },
  { lines: [0, 1, 0, 1, 0, 1], name: "山泽损" },
  { lines: [1, 1, 0, 1, 0, 1], name: "水地比" },
  { lines: [0, 0, 1, 1, 0, 1], name: "水泽节" },
  { lines: [1, 0, 1, 1, 0, 1], name: "水火既济" },
  { lines: [0, 1, 1, 1, 0, 1], name: "风地观" },
  { lines: [1, 1, 1, 1, 0, 1], name: "风雷益" },
  { lines: [0, 0, 0, 0, 1, 1], name: "风山渐" },
  { lines: [1, 0, 0, 0, 1, 1], name: "风雷益" },
  { lines: [0, 1, 0, 0, 1, 1], name: "风水涣" },
  { lines: [1, 1, 0, 0, 1, 1], name: "风火家人" },
  { lines: [0, 0, 1, 0, 1, 1], name: "风泽中孚" },
  { lines: [1, 0, 1, 0, 1, 1], name: "风火家人" },
  { lines: [0, 1, 1, 0, 1, 1], name: "风泽中孚" },
  { lines: [1, 1, 1, 0, 1, 1], name: "风火家人" },
  { lines: [0, 0, 0, 1, 1, 1], name: "风泽中孚" },
  { lines: [1, 0, 0, 1, 1, 1], name: "风火家人" },
  { lines: [0, 1, 0, 1, 1, 1], name: "风泽中孚" },
  { lines: [1, 1, 0, 1, 1, 1], name: "风火家人" },
  { lines: [0, 0, 1, 1, 1, 1], name: "巽（风）" },
  { lines: [1, 0, 1, 1, 1, 1], name: "震为雷" },
  { lines: [0, 1, 1, 1, 1, 1], name: "离为火" },
  { lines: [1, 1, 1, 1, 1, 1], name: "乾（天）" }
];

function drawHexagram(lines: any[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  const lineSpacing = 30; // Adjusted for a square canvas
  const lineWidth = 8;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = 'black';

  lines.forEach((line, index) => {
    const y = (index * lineSpacing) + 10; // Adjusted to center the lines better

    if (line === 0) { // 阴爻
      // Draw two segments for yin line
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(67, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(133, y);
      ctx.lineTo(200, y);
      ctx.stroke();
    } else { // 阳爻
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(200, y);
      ctx.stroke();
    }
  });

  return canvas.toDataURL('image/png');
}

function getHexagramById(id: number) {
  if (id < 0 || id > 63) {
    throw new Error("Invalid hexagram ID. Please provide a number between 0 and 63.");
  }
  const hexagram = hexagrams[id];
  const image = drawHexagram(hexagram.lines);
  return { image, name: hexagram.name };
}

export { getHexagramById };