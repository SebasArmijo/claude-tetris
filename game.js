'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - pale blue
  '#ffb74d', // L - orange
  '#f06292', // R - rosa (anillo 3x3)
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // R - anillo 3x3 (centro hueco)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

// Skins visuales: cada una define su propia paleta (mismo índice que COLORS),
// un fondo de canvas opcional, un color de rejilla opcional y su propia
// función de dibujado de bloque. drawBlock() delega en la skin activa.
// Gotcha: las claves de este objeto deben coincidir con los <option value="..."> del
// <select id="skin-select"> en index.html; si añades/renombras una skin aquí, actualiza también ese <select>.
const SKINS = {
  retro: {
    label: 'Retro',
    colors: COLORS,
    background: null,
    gridLine: null,
    render(context, x, y, color, size) {
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      context.fillStyle = color;
      context.fillRect(px, py, s, s);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px, py, s, 4);
    },
  },
  neon: {
    label: 'Neón',
    colors: [
      null,
      '#00e5ff', // I
      '#fff176', // O
      '#e040fb', // T
      '#69f0ae', // S
      '#ff5252', // Z
      '#448aff', // J
      '#ffab40', // L
      '#ff4081', // R
    ],
    background: '#000000',
    gridLine: 'rgba(0, 229, 255, 0.12)',
    render(context, x, y, color, size) {
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      context.save();
      context.shadowColor = color;
      context.shadowBlur = 12;
      context.fillStyle = color;
      context.fillRect(px, py, s, s);
      context.restore();
      context.strokeStyle = color;
      context.lineWidth = 1;
      context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
    },
  },
  pastel: {
    label: 'Pastel',
    colors: [
      null,
      '#a8dadc', // I
      '#fff1a8', // O
      '#d8bfd8', // T
      '#b8e0b0', // S
      '#f4a8a8', // Z
      '#a8c8f0', // J
      '#f6c99a', // L
      '#f2a8c4', // R
    ],
    background: null,
    gridLine: null,
    render(context, x, y, color, size) {
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      const radius = Math.min(6, s / 4);
      context.fillStyle = color;
      context.beginPath();
      if (typeof context.roundRect === 'function') {
        context.roundRect(px, py, s, s, radius);
      } else {
        // esquinas redondeadas dibujadas a mano con arcos (fallback de compatibilidad)
        context.moveTo(px + radius, py);
        context.arcTo(px + s, py, px + s, py + s, radius);
        context.arcTo(px + s, py + s, px, py + s, radius);
        context.arcTo(px, py + s, px, py, radius);
        context.arcTo(px, py, px + s, py, radius);
      }
      context.closePath();
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.3)';
      context.fillRect(px + radius, py + 2, Math.max(0, s - radius * 2), 3);
    },
  },
  pixel: {
    label: 'Pixel Art',
    colors: COLORS,
    background: null,
    gridLine: null,
    render(context, x, y, color, size) {
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      context.fillStyle = color;
      context.fillRect(px, py, s, s);
      // textura tipo píxeles: cuadrícula con ruido determinista según la posición del bloque
      const cell = Math.max(2, Math.floor(s / 6));
      context.fillStyle = 'rgba(0,0,0,0.15)';
      for (let iy = 0; iy < s; iy += cell) {
        for (let ix = 0; ix < s; ix += cell) {
          const gx = Math.floor(ix / cell) + x;
          const gy = Math.floor(iy / cell) + y;
          if ((gx + gy) % 2 === 0) {
            context.fillRect(px + ix, py + iy, cell, cell);
          }
        }
      }
      context.fillStyle = 'rgba(255,255,255,0.18)';
      context.fillRect(px, py, s, 3);
    },
  },
};

const SKIN_KEY = 'tetris-skin';
const DEFAULT_SKIN = 'retro';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');

const THEME_KEY = 'tetris-theme';

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let holdType, holdUsed;
let gridColor;
// Se inicializa desde localStorage aquí para que el primer draw() dentro de
// init() ya use la skin correcta, evitando un doble repintado al cargar.
const storedSkin = localStorage.getItem(SKIN_KEY);
let currentSkin = SKINS[storedSkin] ? storedSkin : DEFAULT_SKIN;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function pieceFromType(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomPiece() {
  const type = Math.floor(Math.random() * (PIECES.length - 1)) + 1;
  return pieceFromType(type);
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  holdUsed = false;
  spawn();
}

function holdSwap() {
  if (holdUsed || gameOver || paused) return;
  if (holdType === null) {
    holdType = current.type;
    current = next;
    next = randomPiece();
    drawNext();
  } else {
    const swapped = holdType;
    holdType = current.type;
    current = pieceFromType(swapped);
  }
  holdUsed = true;
  if (collide(current.shape, current.x, current.y)) endGame();
  drawHold();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function activeSkin() {
  return SKINS[currentSkin] || SKINS[DEFAULT_SKIN];
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = activeSkin();
  const color = skin.colors[colorIndex] || COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  skin.render(context, x, y, color, size);
  context.globalAlpha = 1;
}

// Limpia un canvas y, si la skin activa define fondo propio (p.ej. negro en Neón),
// lo pinta encima en vez de tocar las variables CSS globales del tema claro/oscuro.
function clearCanvasForSkin(context, canvasEl) {
  context.clearRect(0, 0, canvasEl.width, canvasEl.height);
  const bg = activeSkin().background;
  if (bg) {
    context.fillStyle = bg;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);
  }
}

function drawGrid() {
  ctx.strokeStyle = activeSkin().gridLine || gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  clearCanvasForSkin(ctx, canvas);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  clearCanvasForSkin(nextCtx, nextCanvas);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function drawHold() {
  const NB = 30;
  clearCanvasForSkin(holdCtx, holdCanvas);
  holdCanvas.classList.toggle('locked', holdUsed);
  if (holdType === null) return;
  const shape = PIECES[holdType];
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(holdCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  holdType = null;
  holdUsed = false;
  next = randomPiece();
  spawn();
  updateHUD();
  drawHold();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdSwap();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  themeToggle.checked = theme === 'light';
  gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim();
}

themeToggle.addEventListener('change', () => {
  const theme = themeToggle.checked ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
});

function applySkin(name) {
  currentSkin = SKINS[name] ? name : DEFAULT_SKIN;
  if (skinSelect) skinSelect.value = currentSkin;
  // repinta tablero, next y hold sin recargar la página
  draw();
  drawNext();
  drawHold();
}

if (skinSelect) {
  skinSelect.addEventListener('change', () => {
    localStorage.setItem(SKIN_KEY, skinSelect.value);
    applySkin(skinSelect.value);
  });
}

applyTheme(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');

init();

// currentSkin ya se leyó de localStorage al declararlo; solo sincroniza el <select>
// (no se llama a applySkin() aquí para no repintar dos veces el mismo frame inicial).
if (skinSelect) skinSelect.value = currentSkin;
