const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

const getRemoteUrl = (serviceName, port) => {
  if (process.env.NODE_ENV === "production") {
    return `http://localhost:${port}/remoteEntry.js`;
  }
  return `http://localhost:${port}/remoteEntry.js`;
};

module.exports = {
  mode: process.env.NODE_ENV || "development",
  devServer: {
    port: 3000,
    host: "0.0.0.0",
    historyApiFallback: true,
    allowedHosts: "all",
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "dashboard",
      filename: "remoteEntry.js",
      remotes: {
        airQualityFrontend: `airQualityFrontend@${getRemoteUrl(
          "air-quality",
          3001
        )}`,
        trafficFrontend: `trafficFrontend@${getRemoteUrl("traffic", 3002)}`,
        facilitiesFrontend: `facilitiesFrontend@${getRemoteUrl(
          "facilities",
          3003
        )}`,
      },
      exposes: {
        "./Dashboard": "./src/components/Dashboard",
        "./App": "./src/App",
      },
      shared: {
        react: { singleton: true, eager: true },
        "react-dom": { singleton: true, eager: true },
        "react-router-dom": { singleton: true, eager: true },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
};
