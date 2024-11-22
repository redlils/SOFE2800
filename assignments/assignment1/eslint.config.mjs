import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
  {files: ["**/*.{mjs,cjs,ts}"]},
  {languageOptions: { globals: globals.node }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "consistent-this": "error",
      "default-case": "error",
      "default-case-last": "error",
      "eqeqeq": "error",
      "no-else-return": "error",
      "no-invalid-this": "error",
      "no-underscore-dangle": "error",
      "no-unused-expressions": "warn",
      "no-var": "warn",
      "prefer-const": "error",
      "prefer-named-capture-group": "warn",
      "require-await": "error",
      "vars-on-top": "warn"
    }
  }
];