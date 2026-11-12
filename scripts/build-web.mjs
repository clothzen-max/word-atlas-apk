#!/usr/bin/env node
// 拉取词光源码 → 安装依赖 → 构建静态站到 upstream/dist
import { execSync } from "node:child_process";
import fs from "node:fs";

const UPSTREAM = "upstream";
const REPO = "https://github.com/designfuchen/word-atlas.git";

function sh(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

if (!fs.existsSync(`${UPSTREAM}/package.json`)) {
  // 仓库约 650 MB（插画 + 录音都在里面），浅克隆即可
  sh(`git clone --depth 1 ${REPO} ${UPSTREAM}`);
}

sh("npm ci", {
  cwd: UPSTREAM,
  env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" },
});

// 相对路径 base，WebView 里用 https://localhost/ 加载不会 404
sh("npm run build", {
  cwd: UPSTREAM,
  env: { ...process.env, ATLAS_BASE: "./" },
});

console.log("\ndist 体积：", execSync("du -sh dist", { cwd: UPSTREAM }).toString().trim());
