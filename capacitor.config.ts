import type { CapacitorConfig } from "@capacitor/cli";

// 在线壳模式：设 ATLAS_REMOTE_URL 后，App 直接加载你部署好的网址，
// APK 只有几 MB。不设则把整个 dist（含 7,298 幅插画 + 22,905 段录音）
// 打进 APK，完全离线可用（约 600–900 MB）。
const remoteUrl = process.env.ATLAS_REMOTE_URL?.trim();

const config: CapacitorConfig = {
  appId: "tech.wordatlas.app",
  appName: "词光",
  webDir: "upstream/dist",
  backgroundColor: "#0B1220",
  android: {
    backgroundColor: "#0B1220",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ...(remoteUrl
    ? {
        server: {
          url: remoteUrl,
          androidScheme: "https",
          cleartext: false,
        },
      }
    : {}),
};

export default config;
