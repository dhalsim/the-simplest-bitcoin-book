const path = require('path');

module.exports = {
  entry: './cf-functions/order-handler.js',
  output: {
    filename: 'order-handler.js',
    path: path.resolve(__dirname, 'cf-functions/dist'),
    library: {
      type: 'module'
    }
  },
  target: 'webworker',
  mode: 'production',
  experiments: {
    outputModule: true,
  }
};
