const resolve = require("@rollup/plugin-node-resolve").default;
const commonjs = require("@rollup/plugin-commonjs").default;
const typescript = require("@rollup/plugin-typescript").default;
const dts = require("rollup-plugin-dts").default;

const packageJson = require("./package.json");

module.exports = [
  {
    input: "src/index.ts",
    output: [
      {
        file: packageJson.main,
        format: "cjs",
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: packageJson.module,
        format: "esm",
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      resolve({
        // Don't bundle node_modules
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "./dist/types",
      }),
    ],
    external: [
      "react",
      "react-dom",
      "rrweb",
      "rrweb-snapshot",
      /node_modules/, // Don't bundle any node_modules
    ],
  },
  {
    input: "dist/types/index.d.ts",
    output: [{ file: "dist/index.d.ts", format: "esm" }],
    plugins: [dts()],
    external: [/\.css$/],
  },
];
