const SOURCE_WIDTH = 1000;
const SOURCE_HEIGHT = 600;
const BOARD_CORNERS = [
  { x: 151, y: 38 },
  { x: 1126, y: 87 },
  { x: 1126, y: 635 },
  { x: 151, y: 665 },
];
const IDLE_POSITION = { x: 900, y: 462 };

const stageShell = document.querySelector("#stageShell");
const stage = document.querySelector("#stage");
const boardPlane = document.querySelector("#boardPlane");
const sceneNumber = document.querySelector("#sceneNumber");
const sceneTitle = document.querySelector("#sceneTitle");
const sceneContent = document.querySelector("#sceneContent");
const annotationLayer = document.querySelector("#annotationLayer");
const drawingTeacher = document.querySelector("#drawingTeacher");
const timelineInput = document.querySelector("#timeline");
const timecode = document.querySelector("#timecode");
const voiceover = document.querySelector("#voiceover");

let data;
let currentScene;
let currentFrame = 0;
let playing = false;
let animationFrame;
let pathRecords = [];

if (new URLSearchParams(location.search).has("render")) {
  document.body.classList.add("render-mode");
}

const homography = solveHomography(
  [{ x: 0, y: 0 }, { x: SOURCE_WIDTH, y: 0 }, { x: SOURCE_WIDTH, y: SOURCE_HEIGHT }, { x: 0, y: SOURCE_HEIGHT }],
  BOARD_CORNERS,
);
boardPlane.style.transform = homographyToCss(homography);

fetch("timeline.json")
  .then((response) => response.json())
  .then((timelineData) => {
    data = timelineData;
    timelineInput.max = String(data.durationInFrames - 1);
    setFrame(0);
    window.__boardReady = true;
  });

function renderScene(scene) {
  currentScene = scene;
  sceneNumber.textContent = scene.number;
  sceneTitle.textContent = scene.title;
  sceneContent.className = `scene-content ${scene.layout}-layout`;
  sceneContent.innerHTML = sceneMarkup(scene);
  annotationLayer.innerHTML = scene.annotations.map((annotation, index) => annotationMarkup(annotation, index, annotationPath(annotation))).join("");
  pathRecords = scene.annotations.map((annotation, index) => {
    const path = annotationLayer.querySelector(`[data-path-index="${index}"]`);
    return { annotation, path, length: path.getTotalLength() };
  });
}

function sceneMarkup(scene) {
  const footer = scene.footer ? `<p class="footer-note"><span data-target="footer">${scene.footer}</span></p>` : "";
  if (scene.layout === "flow") {
    const cards = scene.cards.map((card, index) => `<div class="flow-card ${card.tone || ""}" data-target="card-${index}">${card.text}</div>`).join('<span class="arrow">→</span>');
    const denseClass = scene.cards.length > 4 ? " flow-dense" : "";
    return `<div class="flow-row${denseClass}">${cards}</div>${footer}`;
  }
  if (scene.layout === "list") {
    return `<div class="threat-list">${scene.lines.map((line, index) => `<div><span data-target="line-${index}">“${line}”</span></div>`).join("")}</div><div class="round-badge" data-target="badge">${scene.badge}</div>${footer}`;
  }
  if (scene.layout === "journey") {
    const cards = scene.cards.map((card, index) => `<div class="topic-card ${card.tone || ""}" data-target="card-${index}">${card.text}</div>`).join('<span class="arrow">→</span>');
    return `<div class="journey-row">${cards}</div><div class="big-quote">${scene.quote} <strong data-target="quote-strong">${scene.strong}</strong></div>${footer}`;
  }
  if (scene.layout === "split") {
    return `<div class="panel" data-target="left-panel"><span class="panel-label">${scene.leftLabel}</span><strong class="question"><span data-target="left-main">${scene.leftMain}</span></strong></div><div class="mini-grid" data-target="right-grid">${scene.items.map((item, index) => `<div class="grid-card" data-target="right-item-${index}">${item}</div>`).join("")}</div>${footer}`;
  }
  if (scene.layout === "equation") {
    return `<div class="equation-side" data-target="left-side">${scene.left}<strong><span data-target="left-strong">${scene.leftStrong}</span></strong></div><div class="not-equal">≠</div><div class="equation-side" data-target="right-side">${scene.right}<strong><span data-target="right-strong">${scene.rightStrong}</span></strong></div>${footer}`;
  }
  if (scene.layout === "grid") {
    return `<div class="grid-column"><h2><span data-target="left-title">${scene.leftTitle}</span></h2><div class="grid-items" data-target="left-items">${scene.leftItems.map((item, index) => `<div class="grid-card" data-target="left-item-${index}">${item}</div>`).join("")}</div></div><div class="grid-column"><h2><span data-target="right-title">${scene.rightTitle}</span></h2><div class="grid-items" data-target="right-items">${scene.rightItems.map((item, index) => `<div class="grid-card" data-target="right-item-${index}">${item}</div>`).join("")}</div></div>${footer}`;
  }
  if (scene.layout === "contrast") {
    return `<div class="panel" data-target="left-panel"><span class="panel-label">${scene.leftLabel || ""}</span><strong class="panel-main"><span data-target="left-main">${(scene.leftMain || "").replace("\n", "<br>")}</span></strong></div><div class="panel red" data-target="right-panel"><span class="panel-label">${scene.rightLabel || ""}</span><strong class="panel-main"><span data-target="right-main">${(scene.rightMain || "").replace("\n", "<br>")}</span></strong></div>${footer}`;
  }
  if (scene.layout === "audience") {
    return `<div class="audience-lead"><span data-target="lead">${scene.lead}</span></div><div class="audience-focus"><span data-target="focus">${scene.focus}</span></div><div class="audience-cards">${scene.cards.map((card, index) => `<div class="topic-card ${card.tone || ""}" data-target="card-${index}">${card.text}</div>`).join("")}</div>${footer}`;
  }
  if (scene.layout === "statement") {
    return `${scene.lines.map((line, index) => `<div class="statement-line ${line.tone || ""}"><span data-target="line-${index}">${line.text}</span></div>`).join("")}${footer}`;
  }
  return `<div class="final-kicker">${scene.kicker}</div>${scene.questions.map((question, index) => `<div class="final-question"><span data-target="question-${index}">${index + 1}. ${question}</span></div>`).join("")}<div class="episode"><span data-target="episode">${scene.episode}</span></div>`;
}

function annotationMarkup(annotation, index, pathData) {
  const text = annotation.type === "write" ? `<text class="written-note" x="${annotation.x}" y="${annotation.y}" data-note-index="${index}">${annotation.text}</text>` : "";
  return `${text}<path class="annotation" data-path-index="${index}" d="${pathData}" />`;
}

function annotationPath(annotation) {
  if (annotation.type === "arrow" && annotation.from && annotation.to) {
    const from = targetRect(annotation.from);
    const to = targetRect(annotation.to);
    const startX = from.x + from.width + 10;
    const startY = from.y + from.height * 0.55;
    const endX = to.x - 10;
    const endY = to.y + to.height * 0.55;
    const bend = Math.max(35, Math.abs(endX - startX) * 0.35);
    return `M ${startX} ${startY} C ${startX + bend} ${startY + 18} ${endX - bend} ${endY + 18} ${endX} ${endY}`;
  }
  if (!annotation.target) return annotation.d;

  const rect = targetRect(annotation.target);
  const pad = annotation.pad ?? 12;
  if (annotation.type === "underline") {
    const x1 = rect.x - pad * 0.35;
    const x2 = rect.x + rect.width + pad * 0.35;
    const y = rect.y + rect.height + (annotation.offset ?? 8);
    return `M ${x1} ${y} C ${x1 + (x2 - x1) * 0.28} ${y - 7} ${x1 + (x2 - x1) * 0.68} ${y + 5} ${x2} ${y - 3}`;
  }

  const x = rect.x - pad;
  const y = rect.y - pad * 0.75;
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 1.5;
  return `M ${x} ${y + height * 0.55} C ${x - 2} ${y + height * 0.18} ${x + width * 0.24} ${y - 2} ${x + width * 0.57} ${y + 1} C ${x + width * 0.9} ${y - 2} ${x + width + 2} ${y + height * 0.24} ${x + width} ${y + height * 0.57} C ${x + width + 2} ${y + height * 0.9} ${x + width * 0.7} ${y + height + 2} ${x + width * 0.42} ${y + height - 1} C ${x + width * 0.12} ${y + height + 3} ${x - 2} ${y + height * 0.82} ${x} ${y + height * 0.55}`;
}

function targetRect(name) {
  const target = boardPlane.querySelector(`[data-target="${name}"]`);
  if (!target) throw new Error(`Annotation target was not found: ${name}`);

  let x = 0;
  let y = 0;
  let element = target;
  while (element && element !== boardPlane) {
    x += element.offsetLeft;
    y += element.offsetTop;
    element = element.offsetParent;
  }

  element = target;
  while (element && element !== boardPlane) {
    const transform = getComputedStyle(element).transform;
    if (transform && transform !== "none") {
      const matrix = new DOMMatrixReadOnly(transform);
      x += matrix.m41;
      y += matrix.m42;
    }
    element = element.parentElement;
  }
  return { x, y, width: target.offsetWidth, height: target.offsetHeight };
}

function setFrame(frame) {
  if (!data) return;
  currentFrame = Math.max(0, Math.min(data.durationInFrames - 1, Math.round(frame)));
  const scene = data.scenes.find((entry) => currentFrame >= entry.start && currentFrame < entry.end) || data.scenes.at(-1);
  if (scene !== currentScene) renderScene(scene);

  let activeRecord;
  for (const record of pathRecords) {
    const progress = rangeProgress(currentFrame, record.annotation.start, record.annotation.end);
    record.path.style.strokeDasharray = String(record.length);
    record.path.style.strokeDashoffset = String(record.length * (1 - progress));
    record.path.style.opacity = progress > 0 ? "1" : "0";
    const note = annotationLayer.querySelector(`[data-note-index="${pathRecords.indexOf(record)}"]`);
    if (note) {
      note.style.opacity = progress > 0 ? "1" : "0";
      note.style.clipPath = `inset(0 ${(1 - progress) * 100}% 0 0)`;
    }
    if (currentFrame >= record.annotation.start - 10 && currentFrame <= record.annotation.end + 10) activeRecord = record;
  }

  let teacherPosition = IDLE_POSITION;
  if (activeRecord) {
    const progress = rangeProgress(currentFrame, activeRecord.annotation.start, activeRecord.annotation.end);
    const point = activeRecord.path.getPointAtLength(activeRecord.length * progress);
    const arrive = currentFrame < activeRecord.annotation.start ? rangeProgress(currentFrame, activeRecord.annotation.start - 10, activeRecord.annotation.start) : 1;
    const leave = currentFrame > activeRecord.annotation.end ? 1 - rangeProgress(currentFrame, activeRecord.annotation.end, activeRecord.annotation.end + 10) : 1;
    const movement = Math.min(arrive, leave);
    teacherPosition = { x: mix(IDLE_POSITION.x, point.x, movement), y: mix(IDLE_POSITION.y, point.y, movement) };
  }
  drawingTeacher.style.left = `${teacherPosition.x}px`;
  drawingTeacher.style.top = `${teacherPosition.y}px`;

  const localFrame = currentFrame - scene.start;
  sceneContent.style.opacity = String(localFrame < 10 ? 0.82 + localFrame * 0.018 : 1);
  timelineInput.value = String(currentFrame);
  timecode.value = `${formatTime(currentFrame / data.fps)} / ${formatTime(data.durationInFrames / data.fps)}`;
}

function tick() {
  if (!playing) return;
  setFrame(voiceover.currentTime * data.fps);
  if (voiceover.ended) {
    playing = false;
    return;
  }
  animationFrame = requestAnimationFrame(tick);
}

document.querySelector("#playButton").addEventListener("click", async () => {
  if (!data || playing) return;
  playing = true;
  await voiceover.play();
  tick();
});
document.querySelector("#pauseButton").addEventListener("click", () => {
  playing = false;
  voiceover.pause();
  cancelAnimationFrame(animationFrame);
});
document.querySelector("#replayButton").addEventListener("click", async () => {
  voiceover.currentTime = 0;
  setFrame(0);
  playing = true;
  await voiceover.play();
  tick();
});
timelineInput.addEventListener("input", () => {
  playing = false;
  voiceover.pause();
  setFrame(Number(timelineInput.value));
  voiceover.currentTime = currentFrame / data.fps;
});

window.setRenderFrame = (frame) => setFrame(frame);
window.getRenderState = () => ({ frame: currentFrame, scene: currentScene?.number, durationInFrames: data?.durationInFrames });
window.getAnnotationDiagnostics = () => pathRecords.map(({ annotation, path }) => {
  const pathBox = path.getBBox();
  return {
    type: annotation.type,
    target: annotation.target,
    pathBox: { x: pathBox.x, y: pathBox.y, width: pathBox.width, height: pathBox.height },
    targetBox: annotation.target ? targetRect(annotation.target) : null,
  };
});

function fitStage() {
  if (document.body.classList.contains("render-mode")) {
    stage.style.transform = "scale(1)";
    return;
  }
  stage.style.transform = `scale(${stageShell.clientWidth / 1280})`;
}

function rangeProgress(value, start, end) {
  const raw = Math.min(1, Math.max(0, (value - start) / Math.max(1, end - start)));
  return raw * raw * (3 - 2 * raw);
}
function mix(from, to, progress) { return from + (to - from) * progress; }
function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

new ResizeObserver(fitStage).observe(stageShell);
fitStage();

function solveHomography(source, destination) {
  const matrix = [];
  const values = [];
  for (let index = 0; index < 4; index += 1) {
    const { x, y } = source[index];
    const { x: u, y: v } = destination[index];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    values.push(v);
  }
  return gaussianSolve(matrix, values);
}
function gaussianSolve(matrix, values) {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let cell = column; cell <= size; cell += 1) augmented[column][cell] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let cell = column; cell <= size; cell += 1) augmented[row][cell] -= factor * augmented[column][cell];
    }
  }
  return augmented.map((row) => row[size]);
}
function homographyToCss(values) {
  const [a, c, e, b, d, f, g, h] = values;
  return `matrix3d(${a}, ${b}, 0, ${g}, ${c}, ${d}, 0, ${h}, 0, 0, 1, 0, ${e}, ${f}, 0, 1)`;
}
