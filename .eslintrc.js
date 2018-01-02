module.exports = {
    "plugins": ["node"],
    "parserOptions": {
        "ecmaVersion": 2017
    },
    "extends": [
        "eslint:recommended", "plugin:node/recommended"
    ],
    "rules": {
        "node/exports-style": [
            "error", "module.exports"
        ],
        "indent": ["error", 2]
    }
};
