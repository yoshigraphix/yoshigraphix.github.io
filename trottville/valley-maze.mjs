// Maize Runner: pure rules for the corn maze game (valley-maze.html draws and plays it). No DOM here.
// Grid model: a maze of w×h cells becomes a tile grid of (2w+1)×(2h+1); 1 = corn, 0 = open path.
// Cell (cx,cy) sits on tile (2cx+1, 2cy+1). The gate is a gap in the bottom border; you start on it,
// find the foal deep in the corn and lead it back out through the same gate.

// ---------- Seeded random ----------
export function mulberry32(a) {
  a >>>= 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (const c of String(str)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Levels ----------
export const TIERS = [
  { id: 0, name: 'Sprout', blurb: 'Little mazes' },
  { id: 1, name: 'Tassel', blurb: 'Taller corn' },
  { id: 2, name: 'Harvest', blurb: 'The big field' },
];
const SIZES = [[5, 7], [6, 8], [6, 9], [7, 10], [8, 11], [8, 12], [9, 13], [9, 14], [10, 15], [11, 16], [11, 17], [12, 18]];
const LOOPS = [0.04, 0.06, 0.08];
export const LEVELS = SIZES.map(([w, h], i) => {
  const tier = Math.floor(i / 4);
  return { id: i, tier, n: i + 1, w, h, loops: LOOPS[tier], seed: 1009 + i * 7919 };
});
export const FOAL_NAMES = ['Pip', 'Clover', 'Biscuit', 'Juniper', 'Nutmeg', 'Pebble', 'Sprout', 'Toffee', 'Maple', 'Button', 'Dandelion', 'Hazelnut'];

// Local calendar date as YYYY-MM-DD (the daily maze changes at the player's midnight).
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// The daily maze: a Tassel-sized maze, same for everyone on the same date.
export function dailyConfig(dateKey) {
  const seed = hashSeed('maize-runner-' + dateKey);
  const r = mulberry32(seed);
  const w = 9 + Math.floor(r() * 2), h = 13 + Math.floor(r() * 2);
  return { id: 'daily', tier: 1, w, h, loops: 0.06, seed, date: dateKey };
}

// ---------- Grid helpers ----------
export const idx = (m, x, y) => y * m.cols + x;
export const inGrid = (m, x, y) => x >= 0 && y >= 0 && x < m.cols && y < m.rows;
export const isOpen = (m, x, y) => inGrid(m, x, y) && m.grid[y * m.cols + x] === 0;
const N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Breadth-first distances (in tiles) from a tile index; -1 = unreachable.
export function bfs(m, start) {
  const d = new Int32Array(m.cols * m.rows).fill(-1);
  if (m.grid[start] !== 0) return d;
  const q = [start]; d[start] = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi], x = i % m.cols, y = (i - x) / m.cols;
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy;
      if (!isOpen(m, nx, ny)) continue;
      const j = ny * m.cols + nx;
      if (d[j] < 0) { d[j] = d[i] + 1; q.push(j); }
    }
  }
  return d;
}

function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- Maze generation: perfect maze (backtracker) + a few loops ----------
export function generateMaze({ w, h, seed = 1, loops = 0.05 }) {
  if (!(w >= 2 && h >= 2)) throw new Error('Maze too small');
  const rnd = mulberry32(seed);
  const cols = 2 * w + 1, rows = 2 * h + 1, grid = new Uint8Array(cols * rows).fill(1);
  const open = (x, y) => { grid[y * cols + x] = 0; };
  const gx = Math.floor(w / 2);
  // Iterative recursive-backtracker from the cell just inside the gate: long winding corridors.
  const seen = new Uint8Array(w * h), stack = [[gx, h - 1]];
  seen[(h - 1) * w + gx] = 1; open(2 * gx + 1, 2 * (h - 1) + 1);
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb = [];
    for (const [dx, dy] of N4) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && !seen[ny * w + nx]) nb.push([nx, ny, dx, dy]); }
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = nb[Math.floor(rnd() * nb.length)];
    seen[ny * w + nx] = 1;
    open(2 * cx + 1 + dx, 2 * cy + 1 + dy); open(2 * nx + 1, 2 * ny + 1);
    stack.push([nx, ny]);
  }
  // Loops: knock out a few interior walls that separate two cells.
  const walls = [];
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (grid[y * cols + x] !== 1) continue;
    if ((x % 2 === 0 && y % 2 === 1) || (x % 2 === 1 && y % 2 === 0)) walls.push(y * cols + x);
  }
  shuffle(walls, rnd);
  const nLoops = Math.round(w * h * loops);
  for (let k = 0; k < nLoops && k < walls.length; k++) grid[walls[k]] = 0;

  const gate = { x: 2 * gx + 1, y: rows - 1 };
  open(gate.x, gate.y);
  const m = { w, h, cols, rows, grid, gate, seed, loops };
  const dist = bfs(m, idx(m, gate.x, gate.y));

  // Foal: a far cell (top fifth by walking distance), preferring dead ends.
  const cells = [];
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    const x = 2 * cx + 1, y = 2 * cy + 1, i = idx(m, x, y);
    let walls4 = 0; for (const [dx, dy] of N4) if (!isOpen(m, x + dx, y + dy)) walls4++;
    cells.push({ x, y, i, d: dist[i], dead: walls4 === 3 });
  }
  const byFar = [...cells].sort((a, b) => b.d - a.d || a.i - b.i);
  const top = byFar.slice(0, Math.max(1, Math.ceil(cells.length / 5)));
  const deadTop = top.filter(c => c.dead);
  const pickFrom = deadTop.length ? deadTop : top;
  const foalCell = pickFrom[Math.floor(rnd() * pickFrom.length)];
  const foal = { x: foalCell.x, y: foalCell.y };

  // Lost horseshoes and apples: dead ends first (worth exploring), never on the foal or by the gate.
  const shoes = clamp(Math.round(w * h / 28), 2, 6), apples = clamp(Math.round(w * h / 22), 2, 8);
  const okCell = c => c.i !== foalCell.i && c.d >= 4;
  const spots = [...shuffle(cells.filter(c => okCell(c) && c.dead), rnd), ...shuffle(cells.filter(c => okCell(c) && !c.dead), rnd)];
  const items = [];
  for (let k = 0; k < shoes + apples && k < spots.length; k++) items.push({ kind: k < shoes ? 'shoe' : 'apple', x: spots[k].x, y: spots[k].y });
  const name = FOAL_NAMES[Math.floor(rnd() * FOAL_NAMES.length)];

  return Object.assign(m, {
    start: { x: gate.x + 0.5, y: gate.y + 0.5 },
    foal, items, name, foalDist: dist[foalCell.i],
    scarecrow: { x: gate.x + 1, y: gate.y },
  });
}
export const mazeFor = cfg => generateMaze({ w: cfg.w, h: cfg.h, seed: cfg.seed, loops: cfg.loops });

// ---------- A* (tap to go) ----------
// 4-neighbour A* over open tiles; `allowed(i)` can restrict it (the page uses tiles you have seen).
// Returns the list of tile indices from start to goal (both included), or null.
export function astar(m, start, goal, allowed = null) {
  const ok = i => m.grid[i] === 0 && (!allowed || i === start || allowed(i));
  if (!ok(start) || !ok(goal)) return null;
  const n = m.cols * m.rows, g = new Float64Array(n).fill(Infinity), came = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
  const gx = goal % m.cols, gy = (goal - gx) / m.cols;
  const hf = i => { const x = i % m.cols, y = (i - x) / m.cols; return Math.abs(x - gx) + Math.abs(y - gy); };
  const heap = []; // [f, i]
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let s = k; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === k) break; [heap[s], heap[k]] = [heap[k], heap[s]]; k = s; } } return top; };
  g[start] = 0; push(hf(start), start);
  while (heap.length) {
    const [, i] = pop();
    if (closed[i]) continue;
    if (i === goal) { const path = [i]; let c = i; while (came[c] >= 0) { c = came[c]; path.push(c); } return path.reverse(); }
    closed[i] = 1;
    const x = i % m.cols, y = (i - x) / m.cols;
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy;
      if (!inGrid(m, nx, ny)) continue;
      const j = ny * m.cols + nx;
      if (closed[j] || !ok(j)) continue;
      const ng = g[i] + 1;
      if (ng < g[j]) { g[j] = ng; came[j] = i; push(ng + hf(j), j); }
    }
  }
  return null;
}

// ---------- Visibility (tall corn: you only see a little way, and not through stalks) ----------
// Returns [[tileIndex, alpha], ...] for tiles within `radius` of (px,py) with a clear line of sight.
// Corn tiles are visible (you see the wall) but block what is behind them. alpha fades softly to the edge.
export function visibleTiles(m, px, py, radius) {
  const out = [];
  if (!(radius > 0)) return out;
  const R = radius + 0.5, x0 = Math.floor(px - R), x1 = Math.floor(px + R), y0 = Math.floor(py - R), y1 = Math.floor(py + R);
  const ox = Math.floor(px), oy = Math.floor(py);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!inGrid(m, tx, ty)) continue;
    const cx = tx + 0.5, cy = ty + 0.5, d = Math.hypot(cx - px, cy - py);
    if (d > R) continue;
    if (!lineClear(m, px, py, cx, cy, tx, ty, ox, oy)) continue;
    const a = d <= radius - 1 ? 1 : clamp((R - d) / 1.5, 0, 1);
    if (a > 0.02) out.push([ty * m.cols + tx, a]);
  }
  return out;
}
function lineClear(m, ax, ay, bx, by, tx, ty, ox, oy) {
  const d = Math.hypot(bx - ax, by - ay), steps = Math.ceil(d / 0.2);
  for (let s = 1; s < steps; s++) {
    const t = s / steps, x = Math.floor(ax + (bx - ax) * t), y = Math.floor(ay + (by - ay) * t);
    if ((x === tx && y === ty) || (x === ox && y === oy)) continue;
    if (!isOpen(m, x, y)) return false;
  }
  return true;
}

// ---------- Movement with corn collision (thumbstick / keys) ----------
// The walker is a box of half-size r. Blocked moves slide, and a corner assist nudges you into
// side openings so a slightly-off thumbstick still turns into the corridor.
export function blockedAt(m, x, y, r) {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r - 1e-9), y0 = Math.floor(y - r), y1 = Math.floor(y + r - 1e-9);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (!isOpen(m, tx, ty)) return true;
  return false;
}
export function moveWithCollision(m, x, y, dx, dy, r = 0.3) {
  if (dx) {
    const nx = x + dx;
    if (!blockedAt(m, nx, y, r)) x = nx;
    else {
      const ahead = Math.floor(x + Math.sign(dx) * (r + 0.05)), row = Math.floor(y), off = row + 0.5 - y;
      if (Math.abs(dx) >= Math.abs(dy) && isOpen(m, ahead, row) && Math.abs(off) > 1e-6) {
        const ny = y + Math.sign(off) * Math.min(Math.abs(off), Math.abs(dx));
        if (!blockedAt(m, x, ny, r)) y = ny;
      }
    }
  }
  if (dy) {
    const ny = y + dy;
    if (!blockedAt(m, x, ny, r)) y = ny;
    else {
      const ahead = Math.floor(y + Math.sign(dy) * (r + 0.05)), col = Math.floor(x), off = col + 0.5 - x;
      if (Math.abs(dy) >= Math.abs(dx) && isOpen(m, col, ahead) && Math.abs(off) > 1e-6) {
        const nx = x + Math.sign(off) * Math.min(Math.abs(off), Math.abs(dy));
        if (!blockedAt(m, nx, y, r)) x = nx;
      }
    }
  }
  return { x, y };
}

// ---------- The whinny: stereo pan, loudness, muffling, and the fuzzy on-screen cue ----------
// Pan: -1 = hard left, +1 = hard right. Straight above/below or right next to you is centred.
export function whinnyPan(px, py, fx, fy) {
  const dx = fx - px, dy = fy - py, d = Math.hypot(dx, dy);
  if (d < 1e-6) return 0;
  return clamp((dx / d) * Math.min(1, d / 2), -1, 1);
}
// Loudness 0.12..1: louder when closer, never fully silent so you always get a hint.
export function whinnyVolume(dist, maxDist) {
  const t = clamp(dist / Math.max(1e-6, maxDist), 0, 1);
  return 0.12 + 0.88 * (1 - t) * (1 - t);
}
// Lowpass cutoff in Hz: far away through the corn sounds muffled.
export function whinnyMuffle(dist, maxDist) {
  const t = clamp(dist / Math.max(1e-6, maxDist), 0, 1);
  return Math.round(3600 - 2700 * t);
}
// The visual cue is deliberately less precise than the sound: the true angle plus random fuzz.
export function cueAngle(angle, rnd, fuzz = 0.45) { return angle + (rnd() * 2 - 1) * fuzz; }
// Where a ray from the screen centre at `angle` meets the screen edge (inset by `margin`).
export function edgePoint(angle, w, h, margin = 24) {
  const dx = Math.cos(angle), dy = Math.sin(angle), hw = Math.max(1, w / 2 - margin), hh = Math.max(1, h / 2 - margin);
  const t = Math.min(Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity);
  return { x: w / 2 + dx * t, y: h / 2 + dy * t };
}

// ---------- Sky: afternoon → golden sunset → dusk as the timer runs ----------
const SKY = [
  { p: 0, top: [143, 208, 242], low: [255, 241, 201], tint: [255, 214, 140, 0], fog: [36, 64, 30], radius: 3.6 },
  { p: 0.5, top: [160, 205, 230], low: [255, 226, 170], tint: [255, 196, 110, 0.06], fog: [44, 64, 28], radius: 3.5 },
  { p: 0.75, top: [246, 177, 94], low: [255, 206, 140], tint: [255, 140, 50, 0.2], fog: [66, 46, 22], radius: 3.1 },
  { p: 1, top: [40, 50, 100], low: [205, 110, 130], tint: [36, 40, 120, 0.38], fog: [18, 22, 44], radius: 2.4 },
];
const lerp = (a, b, t) => a + (b - a) * t;
export function skyAt(p) {
  p = clamp(p, 0, 1);
  let k = 0; while (k < SKY.length - 2 && p > SKY[k + 1].p) k++;
  const A = SKY[k], B = SKY[k + 1], t = (p - A.p) / (B.p - A.p);
  const mix = (a, b) => a.map((v, i) => lerp(v, b[i], t));
  return {
    p, phase: p < 0.5 ? 'afternoon' : p < 0.8 ? 'golden' : 'dusk',
    top: mix(A.top, B.top), low: mix(A.low, B.low), tint: mix(A.tint, B.tint), fog: mix(A.fog, B.fog),
    radius: lerp(A.radius, B.radius, t),
    lantern: clamp((p - 0.74) / 0.08, 0, 1), // the scarecrow's lantern lights as dusk comes
  };
}

// ---------- Time, stars, rewards ----------
export const SPEED = 3.4; // tiles per second
const TIME_FACTOR = [2.4, 2.1, 1.8];
// Daylight for a maze: the walk there and back (with room for wrong turns, tighter in bigger tiers)
// plus a little per cell for searching.
export function timeLimit(m, tier = 0) {
  return Math.max(45, Math.round((2 * m.foalDist / SPEED) * (TIME_FACTOR[tier] ?? 1.8) + m.w * m.h * 0.45 + 15));
}
export function starsFor(left, limit) {
  const r = clamp(left / Math.max(1, limit), 0, 1);
  return r >= 0.45 ? 3 : r >= 0.2 ? 2 : 1;
}
// About 10 Trotties per minute of good play: 10 for bringing the foal home, up to 10 for daylight left,
// 2 per horseshoe, 1 per apple, capped at 30. Daily maze: 40 once a day. Sunset: lucky finds only (max 5).
export const REWARD = { home: 10, timeMax: 10, shoe: 2, apple: 1, cap: 30, sunsetCap: 5, daily: 40 };
export function rewardFor({ won, left = 0, limit = 1, shoes = 0, apples = 0, daily = false, dailyDone = false } = {}) {
  shoes = Math.max(0, shoes | 0); apples = Math.max(0, apples | 0);
  if (!won) {
    const c = Math.min(REWARD.sunsetCap, shoes + apples);
    return { coins: c, lines: c ? [`Lucky finds · ${c} 🪙`] : [] };
  }
  if (daily && !dailyDone) return { coins: REWARD.daily, lines: [`Daily maze · ${REWARD.daily} 🪙`], daily: true };
  const time = Math.round(REWARD.timeMax * clamp(left / Math.max(1, limit), 0, 1));
  const finds = Math.min(shoes * REWARD.shoe + apples * REWARD.apple, REWARD.cap - REWARD.home - time);
  const lines = [`Foal home · ${REWARD.home} 🪙`];
  if (time) lines.push(`Daylight left · ${time} 🪙`);
  if (finds > 0) lines.push(`Finds · ${finds} 🪙`);
  return { coins: REWARD.home + time + Math.max(0, finds), lines };
}

// ---------- Progress (saved by the page under trottville-valley-maze-v1) ----------
export function freshProgress() { return { v: 1, cleared: {}, found: 0, played: 0, daily: null }; }
export function normProgress(p) {
  const f = freshProgress();
  if (!p || typeof p !== 'object') return f;
  return { v: 1, cleared: p.cleared && typeof p.cleared === 'object' ? p.cleared : {}, found: p.found | 0, played: p.played | 0, daily: p.daily && typeof p.daily === 'object' ? p.daily : null };
}
export const isUnlocked = (p, i) => i === 0 || !!p.cleared[i - 1];
export const dailyDone = (p, date) => !!(p.daily && p.daily.date === date && p.daily.won);
export function nextLevel(p) { for (let i = 0; i < LEVELS.length; i++) if (!p.cleared[i]) return isUnlocked(p, i) ? i : 0; return LEVELS.length - 1; }
// res: {level: number|'daily', won, stars, secs, date}
export function applyResult(prev, res) {
  const p = normProgress(JSON.parse(JSON.stringify(prev || {})));
  p.played++;
  if (res.won) p.found++;
  if (res.level === 'daily') {
    const same = p.daily && p.daily.date === res.date;
    const was = same ? p.daily : { date: res.date, won: false, best: null };
    p.daily = { date: res.date, won: was.won || !!res.won, best: res.won ? (was.best == null ? res.secs : Math.min(was.best, res.secs)) : was.best };
  } else if (res.won) {
    const c = p.cleared[res.level] || { stars: 0, best: null };
    p.cleared[res.level] = { stars: Math.max(c.stars, res.stars | 0), best: c.best == null ? res.secs : Math.min(c.best, res.secs) };
  }
  return p;
}
