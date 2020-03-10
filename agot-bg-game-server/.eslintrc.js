module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: ['plugin:@typescript-eslint/recommended', "plugin:react/recommended"],
    settings: {
        react: {
            version: "detect"
        }
    },
    rules: {
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                argsIgnorePattern: "^_",
            }
        ],
        "@typescript-eslint/explicit-function-return-type": [
            "warn",
            {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
            }
        ],
        "@typescript-eslint/no-explicit-any": [
            "off",
        ],
        "@typescript-eslint/no-empty-function": [
            "off",
        ],
        "@typescript-eslint/ban-ts-ignore": [
            "off",
        ],
    }
};

