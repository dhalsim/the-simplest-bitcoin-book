import { resolve } from 'path';

export default {
  entry: './cf-functions/order-handler.js',
  output: {
    filename: 'order-handler.js',
    path: resolve(import.meta.dirname, 'cf-functions/dist'),
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
