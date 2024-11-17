const path = require('path');
const nodeExternals = require('webpack-node-externals');
const { IgnorePlugin } = require('webpack');

module.exports = {
  mode: 'development',
  target: 'node', // Ensure the target is Node.js
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  devtool: 'source-map',
  externals: [
    nodeExternals(), // Exclude Node.js modules
    { vscode: 'commonjs vscode' } // Important: Exclude vscode from bundling
  ],
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      }
    ]
  },
  plugins: [
    new IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/
    })
  ]
};