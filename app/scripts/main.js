// require('../styles/main.scss');
const size = require('window-size');
const yahooFinance = require('yahoo-finance');

// example data format
// const data = [
//   { date: '1-01-2016', value: 123 },
//   { date: '2-01-2016', value: 512 },
//   { date: '3-01-2016', value: 111 },
//   { date: '4-01-2016', value: 382 },
//   { date: '5-01-2016', value: 575 },
//   { date: '6-01-2016', value: 294 },
//   { date: '7-01-2016', value: 101 },
//   { date: '8-01-2016', value: 612 },
//   { date: '9-01-2016', value: 120 },
//   { date: '10-01-2016', value: 312 },
//   { date: '11-01-2016', value: 100 },
//   { date: '12-01-2016', value: 162 }
// ];

yahooFinance.historical({
  // symbol: 'KMI',
  symbol: process.argv[2],
  from: '2013-02-01',
  to: '2015-02-26',
  period: 'm' // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
}, (err, quotes) => {
  const data = quotes.map(quote => ({
    date: quote.date,
    value: parseInt(quote.close, 10)
  }));

  new AsciiChart({
    data,
    height: size.height - 2, // -2 to account for the new prompt line
    width: size.width,
    dataSymbol: '█',
    yAxisSymbol: '|',
    xAxisSymbol: '_'
  });

});

class AsciiChart {
  constructor (params) {

    this.data = params.data;

    this.height = params.height || 25;
    this.width = params.width || 51;

    this.dataSymbol = (params.dataSymbol && params.dataSymbol.slice(0, 1)) || '█';
    this.yAxisSymbol = (params.yAxisSymbol && params.yAxisSymbol.slice(0, 1)) || '|';
    this.xAxisSymbol = (params.xAxisSymbol && params.xAxisSymbol.slice(0, 1)) || '_';

    this.render();
  }

  // for now just reset params if they're passed and re-render everything
  // update (params) {
  //   while (this.node.lastChild) {
  //     this.node.removeChild(this.node.lastChild);
  //   }
  //   this.data = params.data || this.data;
  //
  //   this.height = params.height || this.height || 25;
  //   this.width = params.width || this.width || 51;
  //
  //   this.dataSymbol = (params.dataSymbol && params.dataSymbol.slice(0, 1)) || this.dataSymbol || '█';
  //   this.yAxisSymbol = (params.yAxisSymbol && params.yAxisSymbol.slice(0, 1)) || this.yAxisSymbol || '|';
  //   this.xAxisSymbol = (params.xAxisSymbol && params.xAxisSymbol.slice(0, 1)) || this.xAxisSymbol || '_';
  //
  //   this.render();
  // }

  render () {
    this.xScale = this.getScale('x');
    this.yScale = this.getScale('y');

    this.buildChart();
  }

  getScale (axis) {
    return {
      y: () => {
        const xAxis = [null, null];

        this.data.forEach(item => {
          const { value } = item;
          if (value < xAxis[0] || xAxis[0] === null) xAxis[0] = value;
          if (value > xAxis[1] || xAxis[1] === null) xAxis[1] = value;
        });

        return xAxis;
      },
      x: () => {
        const sortedDates = this.data
          .map(item => {
            const date = new Date(item.date);
            return `${date.getUTCMonth() + 1}-${date.getUTCDate()}-${date.getUTCFullYear()}`;
          })
          .sort((a, b) => new Date(a) - new Date(b));
        return [sortedDates[0], sortedDates[sortedDates.length - 1]];
      }
    }[axis]();
  }

  buildChart () {
    const output = [];
    this.yScaleWidth = Math.max(
      this.yScale[0].toString().length,
      this.yScale[1].toString().length
    );

    this.buildAxis(output);
    this.buildLabels(output);
    this.buildData(output);
    this.drawChart(output);
  }

  buildAxis (output) {
    for (let i = 0; i < this.height; i++) {
      const row = Array(this.width).fill(' ');
      for (let j = 0; j < this.width; j++) {
        // x axis
        if (i === this.height - 2 && j > this.yScaleWidth) {
          row[j] = this.xAxisSymbol;
        }
        // y axis
        if (i < this.height - 1 && j === this.yScaleWidth + 1) {
          row[j] = this.yAxisSymbol;
        }
      }
      output.push(row);
    }
  }

  buildLabels (output) {
    // convert label value characters into array so we can push each
    // number/letter to its own spot in the ouput array
    function addNumberArray (val, x, y) {
      const arr = `${val}`.split('');
      arr.forEach((item, i) => output[y][x + i] = arr[i]);
    }

    addNumberArray(this.yScale[0], 0, this.height - 2);
    addNumberArray(this.yScale[1], 0, 0);
    addNumberArray(this.xScale[0], this.yScaleWidth + 1, this.height - 1);
    addNumberArray(this.xScale[1], this.width - this.xScale[0].toString().length - 1, this.height - 1);
  }

  buildData (output) {
    // the +2 accounts for the space and axis
    const leftPadding = this.yScaleWidth + 2;
    const bottomPadding = 2;
    const step = (this.yScale[1] - this.yScale[0]) / (this.height - bottomPadding);
    const xGap = Math.floor(this.width / this.data.length);

    for (let i = 0; i < this.data.length; i++) {
      const blockCount = Math.floor(((this.data[i].value - this.yScale[0]) / step) + 1);
      for (let j = 0; j < blockCount; j++) {
        if (parseInt(xGap / 2, 10) > 1) {
          for (let k = 0; k < parseInt(xGap / 2, 10); k++) {
            output[Math.max(this.height - bottomPadding - j, 0)][leftPadding + (i * xGap) + k] = this.dataSymbol;
          }
        } else {
          output[Math.max(this.height - bottomPadding - j, 0)][leftPadding + (i * xGap)] = this.dataSymbol;
        }
      }
    }
  }

  drawChart (output) {
    output.forEach(row => console.log(row.join('')));
    console.log(''); // one last line to seperate things
  }
}


// If I want to add resize events, use this
// process.on('SIGWINCH', () => {
//   asciiChart.update({
//     height: size.height - 1, // -1 to account for the new prompt line
//     width: size.width
//   });
// });
