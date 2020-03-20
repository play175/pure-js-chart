/**
 * @author:https://github.com/play175/pure-js-chart
 */

const UPNG = require('./libs/UPNG');
const { hexToHsl, hslToRgb, hexToRgb } = require('./libs/colorUtil');

function create(options) {
  const canvasWidth = options.width || 500;
  const canvasHeight = options.height || 200;
  const buffer = new ArrayBuffer(canvasWidth * canvasHeight * 4);
  const pixels = new Int32Array(buffer);

  let ox = 0;
  let oy = 0;

  // line color
  let [rLine, gLine, bLine] = hexToRgb('#ffffff');
  let alphaLine = 1;

  //gradient background color
  let [h0, s0, l0] = hexToHsl('#3981fc');
  let [h1, s1, l1] = hexToHsl('#42b8fc');

  function draw(datas) {
    //draw gradient background
    for (let x = 0; x < canvasWidth; ++x) {
      let ratio = 1 - x / canvasWidth;
      h = h0 + (h1 - h0) * ratio;
      s = s0 + (s1 - s0) * ratio;
      l = l0 + (l1 - l0) * ratio;
      let [r, g, b] = hslToRgb(h, s, l);
      for (let y = 0; y < canvasHeight; ++y) {
        pixels[y * canvasWidth + x] = (0xff << 24) | (b << 16) | (g << 8) | r;
      }
    }

    //calc data scale
    let padding = Math.max(5, Math.min(canvasWidth, canvasHeight) / 20);
    let paddingStart = padding * 2;
    let paddingEnd = padding * 3;
    let dataAreaWidth = canvasWidth - paddingStart - paddingEnd;
    let dataAreaHeight = canvasHeight - paddingStart * 2.5;
    let dataAreaUnit = dataAreaWidth / Math.max(3, datas.length - 1);
    let dataMax = datas[0];
    let dataMin = datas[0];
    for (let i = 0; i < datas.length; ++i) {
      if (datas[i] > dataMax) dataMax = datas[i];
      if (datas[i] < dataMin) dataMin = datas[i];
    }
    let dataDistance = dataMax - dataMin;

    //draw axis and arrows
    alphaLine = 1;
    moveTo(padding, padding);
    lineTo(canvasWidth - padding, padding);
    lineTo(canvasWidth - padding - padding / 2, padding + padding / 3);
    moveTo(canvasWidth - padding, padding);
    lineTo(canvasWidth - padding - padding / 2, padding - padding / 3);
    moveTo(padding, padding);
    lineTo(padding, canvasHeight - padding);
    lineTo(padding - padding / 3, canvasHeight - padding - padding / 2);
    moveTo(padding, canvasHeight - padding);
    lineTo(padding + padding / 3, canvasHeight - padding - padding / 2);

    //draw axis dot
    // alphaLine = 0.3;
    // for (let i = 0; i < datas.length; ++i) {
    //   moveTo(paddingStart + dataAreaUnit * i, padding);
    //   lineTo(paddingStart + dataAreaUnit * i, padding + padding / 3);
    // }
    // for (let i = 0; i < 5; ++i) {
    //   moveTo(padding, paddingStart + (i * dataAreaHeight) / 5);
    //   lineTo(padding + padding / 3, paddingStart + (i * dataAreaHeight) / 5);
    // }

    //draw path
    alphaLine = 1;
    for (let i = 0; i < datas.length; ++i) {
      let dy = (1 - (dataMax - datas[i]) / dataDistance) * dataAreaHeight;
      if (i == 0) {
        moveTo(paddingStart, dy + paddingStart);
      } else {
        lineTo(paddingStart + dataAreaUnit * i, dy + paddingStart);
      }
    }

    // encode to png
    let pngArrayBuffer = UPNG.encode([buffer], canvasWidth, canvasHeight, 0);
    return pngArrayBuffer;
  }

  function moveTo(x, y) {
    ox = x;
    oy = y;
  }

  function lineTo(x, y) {
    drawLineAntialiasing(ox, oy, x, y);
    ox = x;
    oy = y;
  }

  //Bresenham's line algorithm
  //https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
  function drawLine(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0),
      sx = x0 < x1 ? 1 : -1;
    let dy = Math.abs(y1 - y0),
      sy = y0 < y1 ? 1 : -1;
    let err = (dx > dy ? dx : -dy) / 2;

    while (true) {
      pixels[(canvasHeight - y0) * canvasWidth + x0] = 0xffffffff;

      if (x0 === x1 && y0 === y1) break;
      let e2 = err;
      if (e2 > -dx) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dy) {
        err += dx;
        y0 += sy;
      }
    }
  }

  //Xiaolin Wu's line algorithm
  //https://en.wikipedia.org/wiki/Xiaolin_Wu%27s_line_algorithm
  const drawLineAntialiasing = (() => {
    //0 ≤ alpha ≤ 1
    function plot(x, y, alpha) {
      let pixel = pixels[(canvasHeight - y) * canvasWidth + x];
      let [r0, g0, b0] = [0xff & pixel, (0xff00 & pixel) >> 8, (0xff0000 & pixel) >> 16];
      alpha = alphaLine * alpha;
      //alpha compsition
      let r1 = Math.round(rLine * alpha + r0 * (1.0 - alpha));
      let g1 = Math.round(gLine * alpha + g0 * (1.0 - alpha));
      let b1 = Math.round(bLine * alpha + b0 * (1.0 - alpha));

      pixels[(canvasHeight - y) * canvasWidth + x] = (0xff << 24) | (b1 << 16) | (g1 << 8) | r1;
    }

    // integer part of x
    function ipart(x) {
      return Math.floor(x);
    }

    function round(x) {
      return ipart(x + 0.5);
    }

    // fractional part of x
    function fpart(x) {
      return x - Math.floor(x);
    }

    function rfpart(x) {
      return 1 - fpart(x);
    }

    return function drawLine(x0, y0, x1, y1) {
      let steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

      if (steep) {
        let tmp = y0;
        y0 = x0;
        x0 = tmp;

        tmp = y1;
        y1 = x1;
        x1 = tmp;
      }
      if (x0 > x1) {
        let tmp = x1;
        x1 = x0;
        x0 = tmp;

        tmp = y1;
        y1 = y0;
        y0 = tmp;
      }

      let dx = x1 - x0;
      let dy = y1 - y0;
      let gradient = dy / dx;
      if (dx == 0.0) {
        gradient = 1.0;
      }

      // handle first endpoint
      let xend = round(x0);
      let yend = y0 + gradient * (xend - x0);
      let xgap = rfpart(x0 + 0.5);
      let xpxl1 = xend; // this will be used in the main loop
      let ypxl1 = ipart(yend);
      if (steep) {
        plot(ypxl1, xpxl1, rfpart(yend) * xgap);
        plot(ypxl1 + 1, xpxl1, fpart(yend) * xgap);
      } else {
        plot(xpxl1, ypxl1, rfpart(yend) * xgap);
        plot(xpxl1, ypxl1 + 1, fpart(yend) * xgap);
      }
      let intery = yend + gradient; // first y-intersection for the main loop

      // handle second endpoint
      xend = round(x1);
      yend = y1 + gradient * (xend - x1);
      xgap = fpart(x1 + 0.5);
      let xpxl2 = xend; //this will be used in the main loop
      let ypxl2 = ipart(yend);
      if (steep) {
        plot(ypxl2, xpxl2, rfpart(yend) * xgap);
        plot(ypxl2 + 1, xpxl2, fpart(yend) * xgap);
      } else {
        plot(xpxl2, ypxl2, rfpart(yend) * xgap);
        plot(xpxl2, ypxl2 + 1, fpart(yend) * xgap);
      }

      // main loop
      if (steep) {
        for (let x = xpxl1 + 1; x <= xpxl2 - 1; x++) {
          plot(ipart(intery), x, rfpart(intery));
          plot(ipart(intery) + 1, x, fpart(intery));
          intery = intery + gradient;
        }
      } else {
        for (let x = xpxl1 + 1; x <= xpxl2 - 1; x++) {
          plot(x, ipart(intery), rfpart(intery));
          plot(x, ipart(intery) + 1, fpart(intery));
          intery = intery + gradient;
        }
      }
    };
  })();

  return {
    draw,
  };
}

module.exports = {
  create,
};
