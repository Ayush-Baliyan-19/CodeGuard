const path = require('path');
const nodeExternals = require('webpack-node-externals');
const { resolve } = require('path');
const { ESBuildMinifyPlugin } = require('esbuild-loader');
const { IgnorePlugin } = require('webpack');
const webpack = require('webpack');

module.exports = {
    mode: 'development',
    target: 'node', // Ensure the target is Node.js
    entry: './src/extension.ts',
    stats: {
      warnings: false,  // Suppress warnings in the output
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2'
    },
    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode', // Important: Exclude vscode from bundling
        ...nodeExternals()
    },
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
        // Ignore unnecessary warnings about the dynamic requires in ESLint and Webpack
        new IgnorePlugin({
            resourceRegExp: /^encoding$/,
        })
    ]
};
