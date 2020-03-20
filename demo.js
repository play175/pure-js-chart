/**
 * @author:https://github.com/play175/pure-js-chart
 */

 const chart = require('./chart').create({
  width: 500,
  height: 200,
});

http = require('http');
http
  .createServer((req, res) => {
    let datas = [24, 57, 70, 100, 130, 120, 110, 170, 160, 110];

    //random change data
    datas.forEach((v, i) => {
      datas[i] = v + 50 * Math.random() - 25;
    });

    //draw chat and render to png
    let pngArrayBuffer = chart.draw(datas);

    // require('fs').writeFileSync('output.png', Buffer.from(png));
    let dataURL = 'data:image/png;base64,' + Buffer.from(pngArrayBuffer).toString('base64');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<meta http-equiv="refresh" content="1;" /><img src="' + dataURL + '" />');
  })
  .listen(3000, function() {
    console.log('Server started on port 3000');
  });
