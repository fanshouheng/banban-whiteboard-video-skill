# Banban 板书视频样片

Banban 是一个用 HTML、CSS、SVG 和原生 JavaScript 制作的板书视频原型。

它用于验证一种讲解形式：板书主体一开始就显示，讲到重点时，小人再移动过去画圈、划线或补写文字。当前版本优先验证画面效果，暂不包含音频识别、自动对齐和批量生成系统。

## 当前效果

- 固定 `1280 × 720`、`16:9` 视频画布，并随浏览器宽度等比缩放。
- 使用带轻微侧视角度的真实白板背景。
- HTML/CSS 负责板书文字和排版，SVG 负责红色圈线与书写路径。
- 手绘小人沿 SVG 路径移动，笔尖与实际绘制位置对齐。
- 小人静止时停在白板右下角，不会直接消失。
- 支持播放、暂停、重播和拖动时间轴。
- 桌面和手机浏览器均可预览。

## 运行项目

项目没有构建步骤，也不需要安装依赖。可以直接打开 `index.html`。

更推荐在项目目录启动静态服务器：

```powershell
python -m http.server 43127
```

然后访问：

```text
http://127.0.0.1:43127
```

## 当前时间轴

样片总时长为 12 秒，动作时间定义在 `app.js` 的 `setTime()` 中。

| 时间 | 动作 |
| --- | --- |
| `0.0–2.0s` | 板书主体显示，小人停在右下角 |
| `2.0–3.0s` | 圈出“提示词不够好” |
| `3.0–5.1s` | 小人回到右下角 |
| `5.1–5.8s` | 在“目标没有说清楚”下方划线 |
| `5.8–8.1s` | 小人回到右下角 |
| `8.1–9.5s` | 补写结论“先明确目标，再写提示词” |
| `9.5–12.0s` | 完整板书停留，小人回到右下角 |

## 文件结构

```text
banban/
├── index.html                       # 板书内容、SVG 路径和播放控件
├── styles.css                      # 白板排版、画布缩放和小人尺寸
├── app.js                          # 时间轴、路径动画和透视坐标映射
├── assets/
│   ├── whiteboard-bg.png           # 白板背景
│   ├── teacher-doodle.svg          # 当前手绘小人
│   └── hand-asian.png              # 早期手部素材，当前未使用
├── THIRD_PARTY_NOTICES.md          # 第三方素材说明
└── licenses/
    └── whiteboard-video-engine-MIT.txt
```

## 修改样片

板书文字和结构在 `index.html` 中修改。红圈、横线和书写引导线也是该文件中的 SVG `path`。

画面总时长、动作起止时间、右下角静止位置和路径跟随逻辑在 `app.js` 中修改：

- `DURATION`：样片总时长。
- `BOARD_CORNERS`：HTML 板书平面对应白板照片的四个角。
- `IDLE_HAND_POSITION`：小人静止时的位置。
- `setTime()`：各动作的开始与结束时间。

更换小人时，替换 `assets/teacher-doodle.svg`，并同步调整 `styles.css` 中 `.drawing-hand` 的尺寸和 `transform`。`transform` 决定图片中的笔尖如何对准动画路径，不能只改图片尺寸。

## 后续方向

当前样片仍是手工编排。计划中的完整流程是：

1. 使用 ChatCut 清理录音中的语气词、重复和停顿。
2. 根据最终音频生成带时间戳的讲稿。
3. 把讲稿中的重点映射为画圈、划线、补字等板书动作。
4. 在视觉格式稳定后，再定义 JSON 数据格式和批量渲染流程。

这些能力目前尚未实现，当前仓库的目标是先把一条板书视频的视觉效果做稳定。

## 第三方素材

`assets/hand-asian.png` 来自 `gnipbao/whiteboard-video-engine`，使用 MIT License。具体来源和许可证内容见 `THIRD_PARTY_NOTICES.md` 与 `licenses/whiteboard-video-engine-MIT.txt`。
