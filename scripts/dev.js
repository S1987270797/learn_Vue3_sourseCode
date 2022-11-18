// 调试代码
// minimist是用来解析命令行参数的
const { resolve } = require("path");
const args = require("minimist")(process.argv.slice(2));
const { build } = require("esbuild");

console.log(args);
// 需要打包的模块
const target = args._[0] || "reactivity";
// 打包的代码运行在什么环境
const format = args.f || "global";

const pkg = require(resolve(__dirname, `../packages/${target}/package.json`));

// 打包格式
const outputFormat = format.startsWith("global") ? "iife" : format === "cjs" ? "cjs" : "esm";

const outfile = resolve(__dirname, `../packages/${target}/dist/${target}.${format}.js`);

build({
  // 入口文件
  entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)],
  outfile,
  bundle: true,
  sourcemap: true,
  format: outputFormat,
  globalName: pkg.buildOptions?.name,
  platform: format === "cjs" ? "node" : "browser",
  define: {
    __DEV__: `true`,
  },
  watch: {
    onRebuild(error) {
      if (error) console.log("error, please rebuilt");
    },
  },
}).then(() => {
  console.log("watching...");
});
