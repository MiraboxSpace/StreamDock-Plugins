// LED 灯效
export const ledSetValue = function (ctx: CanvasRenderingContext2D, data: string[], offest: number) {
  const valuesArr = data.join(':').split('');

  const lineWidth = 5.5;
  //':'后面的间隔
  let distanceLeft = 5;
  let width = 14,
    height = 40,
    fontHeight = 40 + offest, //输出离顶部距离
    fontLeft = 9,
    between = 3;

  // ctx.strokeStyle = '#ffffff';
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 4;
  for (let i = 0; i < valuesArr.length; i++) {
    let styleLed = setNumber(valuesArr[i]);
    if (valuesArr[i] != '.' && valuesArr[i] != ':') {
      ctx.lineCap = 'round';
      //七段数码管第一段（关于七段数码管详情请百度）
      ctx.beginPath();
      ctx.globalAlpha = styleLed[0];
      ctx.moveTo(fontLeft + distanceLeft + between, fontHeight);
      ctx.lineTo(fontLeft + width + distanceLeft - between, fontHeight);
      ctx.stroke();
      //七段数码管第二段
      ctx.beginPath();
      ctx.globalAlpha = styleLed[1];
      ctx.moveTo(fontLeft + width + distanceLeft, fontHeight + between);
      ctx.lineTo(fontLeft + width + distanceLeft, fontHeight + width - between);
      ctx.stroke();
      //七段数码管第三段
      ctx.beginPath();
      ctx.globalAlpha = styleLed[2];
      ctx.moveTo(fontLeft + width + distanceLeft, fontHeight + width + between);
      ctx.lineTo(fontLeft + width + distanceLeft, fontHeight + 2 * width - between);
      ctx.stroke();
      // //七段数码管第四段
      ctx.beginPath();
      ctx.globalAlpha = styleLed[3];
      ctx.moveTo(fontLeft + width + distanceLeft - between, fontHeight + 2 * width);
      ctx.lineTo(fontLeft + distanceLeft + between, fontHeight + 2 * width);
      ctx.stroke();
      // //七段数码管第五段
      ctx.beginPath();
      ctx.globalAlpha = styleLed[4];
      ctx.moveTo(fontLeft + distanceLeft, fontHeight + 2 * width - between);
      ctx.lineTo(fontLeft + distanceLeft, fontHeight + width + between);
      ctx.stroke();
      // //七段数码管第六段
      ctx.beginPath();
      ctx.globalAlpha = styleLed[5];
      ctx.moveTo(fontLeft + distanceLeft, fontHeight + width - between);
      ctx.lineTo(fontLeft + distanceLeft, fontHeight + between);
      ctx.stroke();
      // //七段数码管第七段
      ctx.beginPath();
      ctx.globalAlpha = styleLed[6];
      ctx.moveTo(fontLeft + distanceLeft + between, fontHeight + width);
      ctx.lineTo(fontLeft + width + distanceLeft - between, fontHeight + width);
      ctx.stroke();

      distanceLeft += width + fontLeft;
    } else {
      ctx.beginPath();
      ctx.lineCap = 'square';
      ctx.globalAlpha = 1;
      ctx.moveTo(0.25 * width - 0.5 * lineWidth + distanceLeft + fontLeft, 0.3 * height - lineWidth + fontHeight);
      ctx.lineTo(0.25 * width - 0.5 * lineWidth + distanceLeft + fontLeft, 0.3 * height - lineWidth + fontHeight);

      ctx.moveTo(0.25 * width - 0.5 * lineWidth + distanceLeft + fontLeft, 0.4 * height + lineWidth + fontHeight);
      ctx.lineTo(0.25 * width - 0.5 * lineWidth + distanceLeft + fontLeft, 0.4 * height + lineWidth + fontHeight);
      ctx.stroke();
      distanceLeft += width + 0.5 * lineWidth;
    }
  }
  function setNumber(number) {
    let styleLed = [];
    const opacity = 0.15;
    switch (number.toString()) {
      case '0':
        styleLed = [1, 1, 1, 1, 1, 1, opacity];
        break;
      case '1':
        styleLed = [opacity, 1, 1, opacity, opacity, opacity, opacity];
        break;
      case '2':
        styleLed = [1, 1, opacity, 1, 1, opacity, 1];
        break;
      case '3':
        styleLed = [1, 1, 1, 1, opacity, opacity, 1];
        break;
      case '4':
        styleLed = [opacity, 1, 1, opacity, opacity, 1, 1];
        break;
      case '5':
        styleLed = [1, opacity, 1, 1, opacity, 1, 1];
        break;
      case '6':
        styleLed = [1, opacity, 1, 1, 1, 1, 1];
        break;
      case '7':
        styleLed = [1, 1, 1, opacity, opacity, opacity, opacity];
        break;
      case '8':
        styleLed = [1, 1, 1, 1, 1, 1, 1];
        break;
      case '9':
        styleLed = [1, 1, 1, 1, opacity, 1, 1];
        break;
      case '-':
        styleLed = [opacity, opacity, opacity, opacity, opacity, opacity, 1];
        break;
      default:
        styleLed = [opacity, opacity, opacity, opacity, opacity, opacity, opacity];
        break;
    }
    return styleLed;
  }
};
