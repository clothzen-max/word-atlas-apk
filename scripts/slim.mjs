#!/usr/bin/env node
// 压缩 dist 内的插画与录音，路径不变，源码零改动。
// 音频：mp3 -> 24 kbps 单声道 22.05 kHz（语音够听），体积约 1/3
// 图片：webp 512px -> 320px q62，体积约 1/3
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const pexec = promisify(execFile);
const DIST = process.env.DIST_DIR || "upstream/dist";
const CONC = Number(process.env.CONC || 8);
const AUDIO_BR = process.env.AUDIO_BR || "24k";
const AUDIO_AR = process.env.AUDIO_AR || "22050";
const IMG_W = Number(process.env.IMG_W || 320);
const IMG_Q = Number(process.env.IMG_Q || 62);

function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (e.name.toLowerCase().endsWith(ext)) out.push(p);
  }
  return out;
}

async function pool(items, n, fn) {
  let i = 0, done = 0;
  const size = items.length;
  const stats = { ok: 0, fail: 0, before: 0, after: 0 };
  await Promise.all(
    Array.from({ length: Math.min(n, size) }, async () => {
      while (true) {
        const idx = i++;
        if (idx >= size) break;
        try {
          const r = await fn(items[idx]);
          stats.ok++; stats.before += r.before; stats.after += r.after;
        } catch {
          stats.fail++;
        }
        if (++done % 2000 === 0) console.log(`  ${done}/${size} … 已省 ${((stats.before - stats.after) / 1048576).toFixed(0)} MB`);
      }
    }),
  );
  return stats;
}

const mb = (n) => (n / 1048576).toFixed(1);

async function slimAudio(f) {
  const before = fs.statSync(f).size;
  const tmp = f + ".tmp.mp3";
  await pexec("ffmpeg", [
    "-v", "error", "-y", "-i", f,
    "-ac", "1", "-ar", AUDIO_AR,
    "-codec:a", "libmp3lame", "-b:a", AUDIO_BR,
    "-map_metadata", "-1", "-f", "mp3", tmp,
  ]);
  const after = fs.statSync(tmp).size;
  if (after > 0 && after < before) fs.renameSync(tmp, f);
  else fs.rmSync(tmp, { force: true });
  return { before, after: Math.min(after, before) };
}

async function slimImage(f) {
  const sharp = (await import("sharp")).default;
  const before = fs.statSync(f).size;
  const tmp = f + ".tmp.webp";
  await sharp(f).resize({ width: IMG_W, withoutEnlargement: true }).webp({ quality: IMG_Q }).toFile(tmp);
  const after = fs.statSync(tmp).size;
  if (after > 0 && after < before) fs.renameSync(tmp, f);
  else fs.rmSync(tmp, { force: true });
  return { before, after: Math.min(after, before) };
}

const audioDir = path.join(DIST, "atlas", "audio");
const imgDir = path.join(DIST, "atlas", "img");
const audios = walk(audioDir, ".mp3");
const images = walk(imgDir, ".webp");
console.log(`音频 ${audios.length} 个 / 图片 ${images.length} 个，并发 ${CONC}`);

const t0 = Date.now();
const a = await pool(audios, CONC, slimAudio);
console.log(`音频：${mb(a.before)} MB -> ${mb(a.after)} MB（失败 ${a.fail}） ${((Date.now() - t0) / 1000).toFixed(0)}s`);
const b = await pool(images, CONC, slimImage);
console.log(`图片：${mb(b.before)} MB -> ${mb(b.after)} MB（失败 ${b.fail}）`);

const total = fs.existsSync(DIST)
  ? (function size(d) {
      let s = 0;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        s += e.isDirectory() ? size(p) : fs.statSync(p).size;
      }
      return s;
    })(DIST)
  : 0;
console.log(`dist 压缩后总计：${mb(total)} MB`);
