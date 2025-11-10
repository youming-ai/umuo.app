module.exports = {
  extends: ["../../../../../.eslintrc.js"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Allow console methods in error handling components
    "no-console": "off",

    // Allow any types for error handling
    "@typescript-eslint/no-explicit-any": "off",

    // Allow unused variables in error boundary props
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
};
