const path = require("path");

module.exports = {
  mode: "development",
  devtool: "source-map",
  entry: {
    "highlighter": "./scripts/highlighter.js"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".js"],
  },
};
