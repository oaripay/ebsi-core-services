const path = require("path");
const CracoLessPlugin = require("craco-less");

module.exports = {
  babel: {
    plugins: [["@babel/plugin-proposal-optional-chaining"]],
  },
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
  webpack: {
    alias: {
      "jose/util/random": path.resolve(
        __dirname,
        "node_modules/jose/dist/browser/util/random.js"
      ),
    },
  },
};
