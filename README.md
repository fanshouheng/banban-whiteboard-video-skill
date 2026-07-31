# Banban 白板视频

这是一个由 ChatCut 成片音频和时间戳驱动的 HTML 白板视频。

当前版本对应 ChatCut 时间线 `白板讲课版`，共 12 页、`7 分 19 秒`。每页大部分板书会直接显示，讲到重点时再由右下角的小人移动过去画圈、划线、画箭头或补字。

## 成片

- 视频：`output/whiteboard-final.mp4`
- 音频：`output/voiceover.mp3`
- 输出规格：`1920 × 1080`、`30 fps`、H.264 + AAC

音频和视频属于生成文件，已在 `.gitignore` 中排除，不会提交到 Git。

## 预览

在项目目录启动静态服务器：

```powershell
python -m http.server 43127
```

然后打开：

```text
http://127.0.0.1:43127
```

页面支持播放、暂停、重播和拖动时间轴，播放时直接使用 `output/voiceover.mp3`。

## 导出

完整导出需要 Node.js、Chrome 或 Edge、FFmpeg，以及本机 Codex 已安装的 Playwright 运行库。

先生成关键帧检查图：

```powershell
node render-video.cjs --preview
```

检查图保存在 `output/playwright/`。

确认画面后生成完整视频：

```powershell
node render-video.cjs
```

输出会覆盖 `output/whiteboard-final.mp4`。渲染按固定帧号驱动画面，因此同一份 JSON 可以稳定重复生成。

## 文件结构

```text
banban/
|-- index.html                  # 播放界面和白板画布
|-- styles.css                 # 白板排版、透视画面和小人样式
|-- app.js                     # 时间轴播放、场景渲染和批注动画
|-- timeline.json              # 12 页板书内容、时间和批注动作
|-- render-video.cjs           # Playwright 抓帧并用 FFmpeg 合成
|-- assets/
|   |-- whiteboard-bg.png      # 略带侧视角的白板背景
|   `-- teacher-doodle.svg     # 右下角手绘小人
`-- output/                    # 本地音频、视频和检查图，不进入 Git
```

## 修改内容

日常调整主要改 `timeline.json`：

- `start` / `end`：每页出现的帧范围，按 30 fps 计算。
- `title` 和各布局字段：页面上预先显示的板书。
- `annotations`：讲到对应位置时出现的圈、线、箭头或补字。
- `annotations[].start` / `end`：动作和口播对齐的帧范围。
- `annotations[].target`：圈或横线要跟随的板书元素，路径会按浏览器实际排版自动生成。
- `annotations[].from` / `to`：箭头的起点和终点元素。
- `annotations[].d`：补字动作或没有目标元素时使用的手绘路径。

画面模板放在 `index.html`、`styles.css` 和 `app.js`。更换小人时替换 `assets/teacher-doodle.svg`，并检查 `styles.css` 中 `.drawing-teacher` 的尺寸和偏移，保证笔尖仍能对准路径。

## 当前工作流

1. 在 ChatCut 中删除口误、重复和多余停顿。
2. 以 ChatCut 最终音频和时间戳为准。
3. 把口播重点写入 `timeline.json`，设置每页和批注动作的帧范围。
4. 先运行抽帧检查，再本地导出完整视频。

目前先把单条视频的视觉效果和节奏做稳定。批量生成阶段再把 `timeline.json` 收敛成更严格的板书计划格式，由程序统一校验和排版。

## 素材说明

白板背景和小人素材保存在 `assets/`。第三方素材来源与许可见 `THIRD_PARTY_NOTICES.md` 和 `licenses/`。
