const DURATION = 12;
const SOURCE_WIDTH = 1000;
const SOURCE_HEIGHT = 600;
const BOARD_CORNERS = [
  { x: 151, y: 38 },
  { x: 1126, y: 87 },
  { x: 1126, y: 635 },
  { x: 151, y: 665 },
];
const IDLE_HAND_POSITION = { x: 1035, y: 490 };

const stageShell = document.querySelector("#stageShell");
const stage = document.querySelector("#stage");
const boardPlane = document.querySelector("#boardPlane");
const circlePath = document.querySelector("#circlePath");
const underlinePath = document.querySelector("#underlinePath");
const writingGuide = document.querySelector("#writingGuide");
const finalNote = document.querySelector("#finalNote");
const drawingHand = document.querySelector("#drawingHand");
const timeline = document.querySelector("#timeline");
const timecode = document.querySelector("#timecode");
const playButton = document.querySelector("#playButton");
const pauseButton = document.querySelector("#pauseButton");
const replayButton = document.querySelector("#replayButton");

const homography = solveHomography(
  [
    { x: 0, y: 0 },
    { x: SOURCE_WIDTH, y: 0 },
    { x: SOURCE_WIDTH, y: SOURCE_HEIGHT },
    { x: 0, y: SOURCE_HEIGHT },
  ],
  BOARD_CORNERS,
);

boardPlane.style.transform = homographyToCss(homography);

const pathLengths = new Map([
  [circlePath, circlePath.getTotalLength()],
  [underlinePath, underlinePath.getTotalLength()],
  [writingGuide, writingGuide.getTotalLength()],
]);

let currentTime = 0;
let isPlaying = false;
let startedAt = 0;
let frameRequest = 0;

function fitStage() {
  const scale = stageShell.clientWidth / 1280;
  stage.style.transform = `scale(${scale})`;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function rangeProgress(time, start, end) {
  return clamp((time - start) / (end - start));
}

function setPathProgress(path, progress) {
  const length = pathLengths.get(path);
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length * (1 - progress)}`;
  path.style.opacity = progress > 0 ? "1" : "0";
}

function projectPoint(point) {
  const [a, c, e, b, d, f, g, h] = homography;
  const denominator = g * point.x + h * point.y + 1;
  return {
    x: (a * point.x + c * point.y + e) / denominator,
    y: (b * point.x + d * point.y + f) / denominator,
  };
}

function placeHandOnPath(path, progress) {
  const length = pathLengths.get(path);
  const point = path.getPointAtLength(length * clamp(progress));
  placeHand(projectPoint(point));
}

function placeHand(position) {
  drawingHand.style.left = `${position.x}px`;
  drawingHand.style.top = `${position.y}px`;
  drawingHand.style.opacity = "1";
}

function setTime(time) {
  currentTime = clamp(time, 0, DURATION);

  const circleProgress = rangeProgress(currentTime, 2.0, 3.0);
  const underlineProgress = rangeProgress(currentTime, 5.1, 5.8);
  const writingProgress = rangeProgress(currentTime, 8.1, 9.5);

  setPathProgress(circlePath, circleProgress);
  setPathProgress(underlinePath, underlineProgress);

  finalNote.style.opacity = writingProgress > 0 ? "1" : "0";
  finalNote.style.clipPath = `inset(0 ${(1 - writingProgress) * 100}% 0 0)`;

  placeHand(IDLE_HAND_POSITION);
  if (currentTime >= 2.0 && currentTime <= 3.0) {
    placeHandOnPath(circlePath, circleProgress);
  } else if (currentTime >= 5.1 && currentTime <= 5.8) {
    placeHandOnPath(underlinePath, underlineProgress);
  } else if (currentTime >= 8.1 && currentTime <= 9.5) {
    placeHandOnPath(writingGuide, writingProgress);
  }

  timeline.value = currentTime.toFixed(2);
  timecode.value = `${formatTime(currentTime)} / ${formatTime(DURATION)}`;
}

function formatTime(time) {
  const seconds = Math.floor(time);
  return `00:${String(seconds).padStart(2, "0")}`;
}

function tick(now) {
  if (!isPlaying) {
    return;
  }

  setTime((now - startedAt) / 1000);
  if (currentTime >= DURATION) {
    isPlaying = false;
    return;
  }

  frameRequest = requestAnimationFrame(tick);
}

function play() {
  if (isPlaying) {
    return;
  }
  if (currentTime >= DURATION) {
    currentTime = 0;
  }
  isPlaying = true;
  startedAt = performance.now() - currentTime * 1000;
  frameRequest = requestAnimationFrame(tick);
}

function pause() {
  isPlaying = false;
  cancelAnimationFrame(frameRequest);
}

playButton.addEventListener("click", play);
pauseButton.addEventListener("click", pause);
replayButton.addEventListener("click", () => {
  pause();
  setTime(0);
  play();
});

timeline.addEventListener("input", () => {
  pause();
  setTime(Number(timeline.value));
});

new ResizeObserver(fitStage).observe(stageShell);
fitStage();
setTime(0);
setTimeout(play, 500);

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
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row;
      }
    }

    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let cell = column; cell <= size; cell += 1) {
      augmented[column][cell] /= divisor;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) {
        continue;
      }
      const factor = augmented[row][column];
      for (let cell = column; cell <= size; cell += 1) {
        augmented[row][cell] -= factor * augmented[column][cell];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function homographyToCss(values) {
  const [a, c, e, b, d, f, g, h] = values;
  return `matrix3d(${a}, ${b}, 0, ${g}, ${c}, ${d}, 0, ${h}, 0, 0, 1, 0, ${e}, ${f}, 0, 1)`;
}
