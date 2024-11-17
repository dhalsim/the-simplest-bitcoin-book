const path = require("path");

module.exports = {
  mode: "development",
  devtool: "source-map",
  entry: {
    "page-scripts": "./scripts/page-scripts.js"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.svelte$/,
        use: {
          loader: "svelte-loader",
          options: {
            preprocess: require("svelte-preprocess")(),
            emitCss: true,
          },
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".mjs", ".js", ".svelte", ".ts"],
    mainFields: ["svelte", "browser", "module", "main"],
  },
};
