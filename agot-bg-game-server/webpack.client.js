const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = (env, argv) => {
    return {
        output: {
            path: __dirname + "/dist/",
            filename: "bundle.[contenthash].js",
            publicPath: "/static/"
        },
        entry: "./src/client/client.tsx",
        target: "web",
        devtool: "inline-source-map",
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: "ts-loader",
                    exclude: /node_modules/
                },
                {
                    test:/\.(s*)css$/,
                    use:['style-loader','css-loader', 'sass-loader']
                },
                {
                    test: /\.(jpe?g|png|gif|svg)$/,
                    use: [
                        {
                            loader: 'file-loader',
                            options: {
                                name: "[name].[contenthash].[ext]"
                            }
                        },
                        {
                            loader: "image-webpack-loader",
                            options: {
                                disabled: true
                            }
                        }
                    ],
                },
            ]
        },
        resolve: {
            extensions: [".tsx", ".ts", ".js"]
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: "public/index.html",
                favicon: "./public/images/favicon.ico"
            }),
            new webpack.EnvironmentPlugin({
                NODE_ENV: argv.mode,
                BUILD_HASH: "devel"
            })
        ],
        optimization: {
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        output: {
                            //comments: false
                        }
                    }
                })
            ]
        },
        devServer: {
            proxy: {
                '/ws': {
                    target: 'ws://localhost:8000',
                    ws: true
                }
            }
        }
    };
};
