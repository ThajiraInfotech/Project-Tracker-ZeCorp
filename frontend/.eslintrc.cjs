module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:import/recommended",
        "prettier"
    ],
    parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
    },
    plugins: ["react", "react-hooks", "import"],
    rules: {
        // 🔥 AI junk killers
        "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        "no-undef": "warn",
        "no-console": "warn",
        "no-debugger": "error",
        "react/prop-types": "off",

        // React sanity
        "react/react-in-jsx-scope": "off",
        "react-hooks/exhaustive-deps": "warn",

        // Clean imports
        "import/no-duplicates": "error",
        "import/order": [
            "warn",
            {
                groups: ["builtin", "external", "internal"],
                "newlines-between": "always",
            }
        ],
    },
    settings: {
        react: {
            version: "detect",
        },
    },
};
