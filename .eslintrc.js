module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true,
        "node": true
    },
    "extends": "airbnb-base/legacy",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2017
    },
    "rules": {
        "strict": "off",
        "no-underscore-dangle": "off",
        "vars-on-top": "off",
        "no-shadow": "off",
        // "camelcase": "off",
        "func-names": "off",
        // "brace-style": "off",
        "no-console": "off",
        "max-len": "off",
        // "no-console": "off",
    }
};