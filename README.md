# 词光 Word Atlas → Android APK

把 [designfuchen/word-atlas](https://github.com/designfuchen/word-atlas) 打包成可安装的 APK。

## 结论先说

**能。** 它是 React 19 + TypeScript + Vite 的纯前端 SPA，没有后端、没有账号系统、进度存在本地（IndexedDB / localStorage），
本质上就是一个能跑在 WebView 里的网页，所以套壳即 App。WebGL2 的词汇星图在 Android System WebView 里正常工作。

主流的三种做法，按成本排序：

| 方案 | 产物 | 体积 | 离线 | 适合 |
| :-- | :-- | :-- | :-- | :-- |
| PWA「添加到主屏幕」 | 无 APK | 0 | 部分缓存 | 只想自己用，1 分钟搞定 |
| **在线壳 APK** | `xxx.apk` | ~3 MB | 否（走网络） | 有稳定的部署地址 |
| **离线全量 APK** | `xxx.apk` | 600–900 MB | 完全离线 | 送人、没网也能背词 |

体积来自内容本身：7,298 幅 512px WebP 插画 + 22,905 段 MP3（英音/美音/例句），仓库 652 MB。
官方站点上的「缓存过的词条可离线」是运行时缓存，不是 APK 内置。

---

## 一、方案 A：PWA（不打包，今天就能用）

手机 Chrome 打开 <https://0xlei.tech/words/> → 菜单 → **添加到主屏幕**。
得到的图标是全屏无地址栏的，和 APK 体验接近，只是首次访问需联网。

## 二、方案 B / C：本仓库的壳工程

用 Capacitor 7 包一层。工程结构：

```
capacitor.config.ts        # 壳配置（包名 / 应用名 / 远程 URL 开关）
package.json               # 壳依赖（@capacitor/core|cli|android）
scripts/build-web.mjs      # 克隆上游 → npm ci → vite build
.github/workflows/android.yml  # GitHub Actions 自动出 APK
```

### 为什么必须放 CI / 电脑上构建

Android 打包链路（`aapt2`、`d8`、`apksigner`）官方只发 x86_64 的可执行文件，
ARM 的 Android 设备（哪怕 root + proot 装了 Ubuntu）没有可用的二进制，Gradle 会在 `aapt2` 这一步直接失败。
所以：**手机上写代码可以，出 APK 必须借一台 x86_64 的机器**，GitHub Actions 免费额度够用。

### 用 GitHub Actions 出包

1. 把本目录推到你的 GitHub 仓库（公开或私有都行）。
2. Actions 页 → **Build Word Atlas APK** → Run workflow。
   - `remote_url` 留空 → **离线全量包**（约 600–900 MB，构建 15–25 分钟）
   - 填 `https://你的域名/words/` → **在线壳包**（约 3 MB，构建 6–8 分钟）
3. 跑完在 Artifacts 里下载 `word-atlas-apk`，解压安装。

### 本地构建（Linux / macOS / Windows + WSL）

```bash
# 需要 Node 20+、JDK 21、Android SDK（ANDROID_HOME 已配置）
npm install
node scripts/build-web.mjs      # 拉上游 + 构建，约 650 MB 下载
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
adb install -r app-debug.apk
```

在线壳模式：`ATLAS_REMOTE_URL=https://你的域名/words/ npx cap sync android` 后再编译。

---

## 改这几处就够了

**应用名 / 包名** — `capacitor.config.ts` 里的 `appName`、`appId`（`appId` 不能带连字符）。
改完必须重新 `npx cap add android`（或手动改 `android/app/build.gradle` 的 `applicationId`）。

**图标 / 启动图** — 换 `android/app/src/main/res/mipmap-*/ic_launcher*.png`，
或用 `npx @capacitor/assets generate --android`，素材放 `assets/icon.png`(1024×1024) 和 `assets/splash.png`。

**正式签名**（自用装着玩可以跳过，debug 签名一样能装）

```bash
keytool -genkey -v -keystore atlas.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias atlas
```

`android/app/build.gradle` 里加 `signingConfigs.release`，再用 `./gradlew assembleRelease`。
没签名就只能装机自用，没法上架、也没法覆盖安装不同签名的版本。

**返回键** — Capacitor 默认让 WebView 处理 history，Android 返回键会依次回退页面，行为正常。

---

## 注意

- **内容许可**：代码 MIT；词库文本、插画、录音是 CC BY 4.0，分发时保留署名「Word Atlas contributors（词光）」，别去掉来源。
- **别直接指向作者站点**：`0xlei.tech/words/` 是人家的服务器，做成 App 广泛分发等于把流量和带宽都算他头上。
  自己 `npm run build` 后传到 Cloudflare Pages / Netlify / 自己的 VPS，再让壳指向你的地址。
- **离线全量包会很大**：APK 900 MB，安装后占 1.5 GB 左右。Android 允许，但首次启动 WebView 读 assets 会慢几秒；
  也可以只保留词库 JSON + 缩略图，插画和音频按需从网络拉（需要改上游源码里的资源路径逻辑，不是纯配置能解决的）。
- 上游在线站点比仓库版本迭代更快，两边功能可能不一致。

## 授权

本壳工程无额外限制，随上游 MIT 使用。
