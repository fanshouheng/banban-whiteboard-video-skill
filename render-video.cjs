const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("C:/Users/Admin/.codex/skills/expression-enhancer/node_modules/playwright-core");

const root = __dirname;
const outputDir = path.join(root, "output");
const audioPath = path.join(outputDir, "voiceover.mp3");
const videoPath = path.join(outputDir, "whiteboard-final.mp4");
const sourceFps = 30;
const renderFps = 15;
const durationInFrames = 13159;
const durationSeconds = durationInFrames / sourceFps;
const renderFrames = Math.ceil(durationSeconds * renderFps);
const previewMode = process.argv.includes("--preview");

if (!fs.existsSync(audioPath)) throw new Error(`Missing audio: ${audioPath}`);
fs.mkdirSync(outputDir, { recursive: true });

const mimeTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".mp3": "audio/mpeg" };
const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(path.resolve(root))) {
    response.writeHead(403).end();
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
});

async function waitForExit(process) {
  return new Promise((resolve, reject) => {
    process.once("error", reject);
    process.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)));
  });
}

async function writeFrame(stream, buffer) {
  if (stream.write(buffer)) return;
  await new Promise((resolve) => stream.once("drain", resolve));
}

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const chromeCandidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ];
  const executablePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!executablePath) throw new Error("Chrome or Edge was not found");

  const browser = await chromium.launch({ executablePath, headless: true, args: ["--disable-gpu", "--font-render-hinting=none"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/?render=1`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__boardReady === true);

    if (previewMode) {
      const previewDir = path.join(outputDir, "playwright");
      fs.mkdirSync(previewDir, { recursive: true });
      for (const frame of [200, 3300, 4600, 5700, 7000, 8450, 9300, 10400, 11200, 12100, 12850]) {
        await page.evaluate((nextFrame) => window.setRenderFrame(nextFrame), frame);
        await page.screenshot({ path: path.join(previewDir, `preview-${frame}.png`) });
      }
      console.log(previewDir);
      return;
    }

    const ffmpeg = spawn("ffmpeg", [
      "-y", "-loglevel", "warning",
      "-f", "image2pipe", "-framerate", String(renderFps), "-vcodec", "mjpeg", "-i", "pipe:0",
      "-i", audioPath,
      "-vf", "fps=30,scale=1920:1080:flags=lanczos",
      "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k", "-t", durationSeconds.toFixed(6), "-movflags", "+faststart",
      videoPath,
    ], { stdio: ["pipe", "inherit", "inherit"] });
    for (let index = 0; index < renderFrames; index += 1) {
      const sourceFrame = Math.min(durationInFrames - 1, Math.round(index * sourceFps / renderFps));
      await page.evaluate((frame) => window.setRenderFrame(frame), sourceFrame);
      const screenshot = await page.screenshot({ type: "jpeg", quality: 90 });
      await writeFrame(ffmpeg.stdin, screenshot);
      if (index % 300 === 0 || index === renderFrames - 1) {
        const percent = ((index + 1) / renderFrames * 100).toFixed(1);
        console.log(`Rendered ${index + 1}/${renderFrames} frames (${percent}%)`);
      }
    }
    ffmpeg.stdin.end();
    await waitForExit(ffmpeg);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(videoPath);
}

main().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
