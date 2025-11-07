// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint-define-config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
