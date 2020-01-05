const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = (env, argv) => {
    return {
        output: {
            path: __dirname + "/dist/",
            filename: "bundle.[hash].js",
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
                    test: /\.(jpg|png|gif|svg)$/,
                    use: 'file-loader',
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
        }
    };
};
