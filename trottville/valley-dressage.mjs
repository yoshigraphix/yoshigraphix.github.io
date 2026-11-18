// Dressage to Impress — a rhythm game in the show arena. Pure rules: no DOM, so node can test it.
//
// A test is a list of movements. Each movement has a cue letter ("Trot at C"), a gait and a route round the
// 20 × 40 m arena. The route length and the gait's speed decide how many bars the movement lasts, so every
// transition lands exactly on a bar line of the music. Every beat of the gait is a note to tap:
//   WALK   4 even beats per bar (≈100 bpm)
//   TROT   2 beats per bar      (≈150 bpm)
//   CANTER 3 beats per bar, the third one accented (da-da-DUM)
// A change of gait is a swipe note on the first beat of the new movement: up = faster, down = slower.
// Halts are quiet bars; the salute is a special tap. Judges score every movement 0–10 (accuracy + rhythm +
// a clean transition), plus two collective marks, and the test ends with a percentage and a ribbon.
//
// Arena coordinates are metres: x across (0..20), y along (0 = C end, 40 = A end). The rider track is 1.5 m
// in from the fence. The page draws the arena turned on its side (A on the left, C on the right).

export const ARENA = { w: 20, h: 40, inset: 1.5 };
export const P = {
  A: [10, 38.5], K: [1.5, 34], E: [1.5, 20], H: [1.5, 6], C: [10, 1.5], M: [18.5, 6], B: [18.5, 20], F: [18.5, 34],
  X: [10, 20], D: [10, 34], G: [10, 6],
  TL: [1.5, 1.5], TR: [18.5, 1.5], BR: [18.5, 38.5], BL: [1.5, 38.5], IN: [10, 44]
};
export const LETTERS = ['A', 'K', 'E', 'H', 'C', 'M', 'B', 'F']; // round the fence, clockwise as drawn
// Where the boards stand, just outside the fence.
export const BOARDS = { A: [10, 41.2], K: [-1.2, 34], E: [-1.2, 20], H: [-1.2, 6], C: [10, -1.2], M: [21.2, 6], B: [21.2, 20], F: [21.2, 34] };
const CORNERS = new Set(['TL', 'TR', 'BR', 'BL']);
const CORNER_BETWEEN = { 'A>K': 'BL', 'H>C': 'TL', 'C>M': 'TR', 'F>A': 'BR' };

export const GAITS = {
  halt:   { name: 'Halt',   rank: 0, beat: 0.6,  barBeats: 4, stride: 4, speed: 0,   color: '#e6a93a' },
  walk:   { name: 'Walk',   rank: 1, beat: 0.6,  barBeats: 4, stride: 4, speed: 1.9, color: '#4f9a4f' },
  trot:   { name: 'Trot',   rank: 2, beat: 0.4,  barBeats: 2, stride: 2, speed: 4.0, color: '#2f8fce' },
  canter: { name: 'Canter', rank: 3, beat: 0.38, barBeats: 3, stride: 3, speed: 5.0, color: '#8e5bb5' }
};
export const BIG = 1.3; // lengthened strides / free walk: same beat, more ground

export const WIN = { perfect: 0.045, good: 0.09, ok: 0.14 };
export const QUALITY = { perfect: 1, good: 0.85, ok: 0.6, wrong: 0.2, wrongway: 0, miss: 0 };
export const RIBBONS = [
  { id: 'blue', min: 80, name: 'Blue ribbon', place: '1st' },
  { id: 'red', min: 68, name: 'Red ribbon', place: '2nd' },
  { id: 'yellow', min: 55, name: 'Yellow ribbon', place: '3rd' }
];

export const LEVELS = [
  { id: 'intro', name: 'Intro', blurb: 'Walk and trot', tempo: 1.06, look: 2.3, key: 60, maxCoins: 20 },
  { id: 'training', name: 'Training', blurb: 'Now with canter', tempo: 1, look: 2.1, key: 62, maxCoins: 25 },
  { id: 'first', name: 'First level', blurb: 'Bigger strides, quicker changes', tempo: 0.95, look: 1.9, key: 57, maxCoins: 30 }
];
export const DAILY_COINS = 40;

// [cue letter, gait, route, words on the test card, options]
const m = (cue, gait, route, text, o = {}) => ({ cue, gait, route, text, ...o });
const SALUTE = (final = false) => m('X', 'halt', '', final ? 'Halt at X and salute the judge' : 'Halt at X and salute', { salute: true, final });
export const TESTS = [
  { id: 'intro-a', level: 'intro', name: 'Intro A', title: 'First Steps', movements: [
    m('A', 'trot', 'A X', 'Enter at A in trot'),
    SALUTE(),
    m('X', 'trot', 'C TL H E', 'Trot on. At C, track left'),
    m('E', 'walk', 'K', 'Walk at E'),
    m('K', 'trot', 'BL A BR F B', 'Trot at K'),
    m('B', 'walk', 'M', 'Walk at B'),
    m('M', 'trot', 'TR C TL H E K BL A', 'Trot at M, all the way to A'),
    m('A', 'trot', 'X', 'Down the center line'),
    SALUTE(true)
  ] },
  { id: 'intro-b', level: 'intro', name: 'Intro B', title: 'Round We Go', movements: [
    m('A', 'trot', 'A X', 'Enter at A in trot'),
    SALUTE(),
    m('X', 'trot', 'C TR M B', 'Trot on. At C, track right'),
    m('B', 'trot', 'O', 'Big circle at B'),
    m('B', 'walk', 'F', 'Walk at B'),
    m('F', 'trot', 'BR A BL K E', 'Trot at F'),
    m('E', 'trot', 'O', 'Big circle at E'),
    m('E', 'walk', 'K', 'Walk at E'),
    m('K', 'trot', 'BL A X', 'Trot at K. At A, down the center line'),
    SALUTE(true)
  ] },
  { id: 'intro-c', level: 'intro', name: 'Intro C', title: 'Stretch and Swing', movements: [
    m('A', 'trot', 'A X', 'Enter at A in trot'),
    SALUTE(),
    m('X', 'trot', 'C TL H E K', 'Trot on. At C, track left'),
    m('K', 'walk', 'X M', 'Walk at K, free walk across the diagonal', { big: true }),
    m('M', 'walk', 'TR C', 'Walk on to C'),
    m('C', 'trot', 'O', 'Trot at C, big circle'),
    m('C', 'trot', 'TL H E K BL A', 'Trot on round to A'),
    m('A', 'walk', 'BR F', 'Walk at A'),
    m('F', 'trot', 'B M TR C TL H', 'Trot at F'),
    m('H', 'trot', 'E K BL A X', 'Keep trotting. At A, down the center line'),
    SALUTE(true)
  ] },
  { id: 'training-1', level: 'training', name: 'Training 1', title: 'First Canter', movements: [
    m('A', 'trot', 'A X', 'Enter at A in trot'),
    SALUTE(),
    m('X', 'trot', 'C TL H E', 'Trot on. At C, track left'),
    m('E', 'trot', 'O', 'Big circle at E'),
    m('E', 'trot', 'K BL A', 'Trot on to A'),
    m('A', 'canter', 'O', 'Canter at A, big circle', { coef: 2 }),
    m('A', 'canter', 'BR F B', 'Canter on to B'),
    m('B', 'trot', 'M TR C', 'Trot at B'),
    m('C', 'walk', 'TL H', 'Walk at C'),
    m('H', 'trot', 'E K BL A X', 'Trot at H. At A, down the center line'),
    SALUTE(true)
  ] },
  { id: 'training-2', level: 'training', name: 'Training 2', title: 'Both Leads', movements: [
    m('A', 'trot', 'A X', 'Enter at A in trot'),
    SALUTE(),
    m('X', 'trot', 'C TR M', 'Trot on. At C, track right'),
    m('M', 'canter', 'B F BR A', 'Canter at M', { coef: 2 }),
    m('A', 'canter', 'O', 'Big circle at A'),
    m('A', 'trot', 'BL K', 'Trot at A'),
    m('K', 'walk', 'X M', 'Walk at K, free walk across the diagonal', { big: true }),
    m('M', 'trot', 'TR C TL H', 'Trot at M'),
    m('H', 'canter', 'E K BL A', 'Canter at H', { coef: 2 }),
    m('A', 'trot', 'BR F B', 'Trot at A'),
    m('B', 'trot', 'M TR C TL H', 'Keep trotting to H'),
    m('H', 'trot', 'E K BL A X', 'At A, down the center line'),
    SALUTE(true)
  ] },
  { id: 'training-3', level: 'training', name: 'Training 3', title: 'Loops and Lines', movements: [
    m('A', 'trot', 'A X', 'Enter at A in trot'),
    SALUTE(),
    m('X', 'trot', 'C TL H E', 'Trot on. At C, track left'),
    m('E', 'canter', 'O', 'Canter at E, big circle', { coef: 2 }),
    m('E', 'canter', 'K BL A BR F', 'Canter on to F'),
    m('F', 'trot', 'X H', 'Trot at F, across the diagonal'),
    m('H', 'walk', 'TL C', 'Walk at H'),
    m('C', 'trot', 'TR M B', 'Trot at C'),
    m('B', 'canter', 'O', 'Canter at B, big circle', { coef: 2 }),
    m('B', 'canter', 'F BR A', 'Canter on to A'),
    m('A', 'trot', 'O', 'Trot at A, big circle'),
    m('A', 'trot', 'X', 'Down the center line'),
    SALUTE(true)
  ] },
  { id: 'first-1', level: 'first', name: 'First 1', title: 'Show Your Stride', movements: [
    m('A', 'trot', 'A X', 'Enter at A in trot'),
    SALUTE(),
    m('X', 'trot', 'C TR M', 'Trot on. At C, track right'),
    m('M', 'trot', 'X K', 'Big trot across the diagonal', { big: true, coef: 2 }),
    m('K', 'trot', 'BL A o', 'Small circle at A'),
    m('A', 'canter', 'BR F B M', 'Canter at A', { coef: 2 }),
    m('M', 'canter', 'TR C TL H E', 'Canter on to E'),
    m('E', 'trot', 'K BL A', 'Trot at E'),
    m('A', 'walk', 'BR F', 'Walk at A'),
    m('F', 'trot', 'X H', 'Trot at F, big trot across', { big: true }),
    m('H', 'trot', 'TL C TR M B', 'Trot on to B'),
    m('B', 'trot', 'F BR A X', 'At A, down the center line'),
    SALUTE(true)
  ] },
  { id: 'first-2', level: 'first', name: 'First 2', title: 'Quick Changes', movements: [
    m('A', 'trot', 'A X', 'Enter at A in trot'),
    SALUTE(),
    m('X', 'trot', 'C TL H', 'Trot on. At C, track left'),
    m('H', 'walk', 'E', 'Walk at H'),
    m('E', 'trot', 'K', 'Trot at E'),
    m('K', 'canter', 'BL A BR F', 'Canter at K', { coef: 2 }),
    m('F', 'canter', 'B M', 'Big canter to M', { big: true }),
    m('M', 'trot', 'TR C', 'Trot at M'),
    m('C', 'trot', 'o', 'Small circle at C'),
    m('C', 'canter', 'TL H E K', 'Canter at C', { coef: 2 }),
    m('K', 'trot', 'BL A', 'Trot at K'),
    m('A', 'halt', '', 'Halt at A', { at: 'A' }),
    m('A', 'trot', 'O', 'Trot on, big circle at A'),
    m('A', 'trot', 'X', 'Down the center line'),
    SALUTE(true)
  ] },
  { id: 'first-3', level: 'first', name: 'First 3', title: 'Grand Finale', movements: [
    m('A', 'trot', 'A X', 'Enter at A in trot'),
    SALUTE(),
    m('X', 'trot', 'C TR M', 'Trot on. At C, track right'),
    m('M', 'trot', 'X K', 'Big trot across the diagonal', { big: true, coef: 2 }),
    m('K', 'walk', 'E', 'Walk at K'),
    m('E', 'canter', 'O', 'Canter at E, big circle', { coef: 2 }),
    m('E', 'canter', 'H TL C TR M', 'Canter on to M'),
    m('M', 'canter', 'B F', 'Big canter to F', { big: true }),
    m('F', 'walk', 'BR A', 'Walk at F', { coef: 2 }),
    m('A', 'trot', 'BL K E', 'Trot at A'),
    m('E', 'trot', 'o', 'Small circle at E'),
    m('E', 'trot', 'H TL C TR M B', 'Trot on to B'),
    m('B', 'trot', 'F BR A X', 'At A, down the center line'),
    SALUTE(true)
  ] }
];
export const testById = id => TESTS.find(t => t.id === id) || null;
export const levelById = id => LEVELS.find(l => l.id === id) || null;

// ---------- Seeded randomness (daily test, tunes) ----------
export function hashSeed(str) { let h = 2166136261 >>> 0; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function dayKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
const pick = (rnd, a) => a[Math.floor(rnd() * a.length)];

// ---------- Routes ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len2 = v => Math.hypot(v[0], v[1]);
const unit = v => { const l = len2(v) || 1; return [v[0] / l, v[1] / l]; };
function inward(p) {
  const d = [[p[0] - ARENA.inset, [1, 0]], [ARENA.w - ARENA.inset - p[0], [-1, 0]], [p[1] - ARENA.inset, [0, 1]], [ARENA.h - ARENA.inset - p[1], [0, -1]]];
  d.sort((a, b) => a[0] - b[0]); return d[0][1];
}
// Tokens: letters / corner names (corners are rounded off), 'O' = big circle (r 8.5) and 'o' = small circle
// (r 6.5) from where the horse is, turning the way it is already going.
export function buildRoute(route, from, heading = [0, -1]) {
  const toks = String(route).trim().split(/\s+/).filter(Boolean);
  const pts = [from.slice()];
  let head = heading.slice();
  const last = () => pts[pts.length - 1];
  const push = p => { const l = last(); const d = sub(p, l); if (len2(d) > 1e-6) { head = unit(d); pts.push(p); } };
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i];
    if (tk === 'O' || tk === 'o') {
      const r = tk === 'O' ? 8.5 : 6.5, c0 = last(), n = inward(c0), c = [c0[0] + n[0] * r, c0[1] + n[1] * r];
      const a0 = Math.atan2(c0[1] - c[1], c0[0] - c[0]);
      const tan = s => [-Math.sin(a0) * s, Math.cos(a0) * s];
      const s = (tan(1)[0] * head[0] + tan(1)[1] * head[1]) >= 0 ? 1 : -1;
      const steps = 40;
      for (let k = 1; k <= steps; k++) { const a = a0 + s * 2 * Math.PI * k / steps; pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
      pts[pts.length - 1] = c0.slice(); head = unit(tan(s));
      continue;
    }
    const p = P[tk]; if (!p) throw new Error('Unknown route point ' + tk);
    if (CORNERS.has(tk)) {
      const nextTok = toks[i + 1], next = P[nextTok];
      if (!next || CORNERS.has(nextTok)) { push(p.slice()); continue; }
      const prev = last(), rIn = Math.min(4, len2(sub(prev, p)) / 2), rOut = Math.min(4, len2(sub(next, p)) / 2);
      const ui = unit(sub(prev, p)), uo = unit(sub(next, p));
      const a = [p[0] + ui[0] * rIn, p[1] + ui[1] * rIn], b = [p[0] + uo[0] * rOut, p[1] + uo[1] * rOut];
      push(a);
      for (const t of [0.2, 0.4, 0.6, 0.8]) { const q = (1 - t) * (1 - t), w = 2 * (1 - t) * t, z = t * t; push([q * a[0] + w * p[0] + z * b[0], q * a[1] + w * p[1] + z * b[1]]); }
      push(b);
      continue;
    }
    push(p.slice());
  }
  let total = 0; const cum = [0];
  for (let i = 1; i < pts.length; i++) { total += len2(sub(pts[i], pts[i - 1])); cum.push(total); }
  return { pts, cum, len: total, head };
}
export function pointAlong(r, d) {
  const { pts, cum } = r;
  if (pts.length === 1 || d <= 0) return { x: pts[0][0], y: pts[0][1], dir: pts.length > 1 ? unit(sub(pts[1], pts[0])) : null };
  if (d >= r.len) { const n = pts.length; return { x: pts[n - 1][0], y: pts[n - 1][1], dir: unit(sub(pts[n - 1], pts[n - 2])) }; }
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
  const f = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1), a = pts[lo], b = pts[hi];
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, dir: unit(sub(b, a)) };
}
// Rail tokens for `steps` letters round the fence (dir +1 clockwise as drawn, −1 the other way).
export function railTokens(from, steps, dir) {
  const out = []; let i = LETTERS.indexOf(from);
  for (let s = 0; s < steps; s++) {
    const j = (i + dir + 8) % 8, a = LETTERS[i], b = LETTERS[j];
    const c = CORNER_BETWEEN[`${a}>${b}`] || CORNER_BETWEEN[`${b}>${a}`];
    if (c) out.push(c); out.push(b); i = j;
  }
  return out.join(' ');
}

// ---------- Charts ----------
export function beatLen(gait, tempo = 1) { return GAITS[gait].beat * tempo; }
export function barLen(gait, tempo = 1) { return GAITS[gait].beat * GAITS[gait].barBeats * tempo; }

export function buildChart(test, opts = {}) {
  const level = levelById(test.level) || LEVELS[1];
  const tempo = opts.tempo ?? test.tempo ?? level.tempo;
  const segs = [], notes = [];
  const g0 = test.movements[0].gait;
  const introBars = Math.max(2, Math.ceil(2.4 / barLen(g0, tempo)));
  let t = introBars * barLen(g0, tempo);
  let pos = P.IN.slice(), head = [0, -1], prev = null;
  test.movements.forEach((mv, i) => {
    const G = GAITS[mv.gait];
    const route = mv.gait === 'halt' ? buildRoute('', pos, head) : buildRoute(mv.route, pos, head);
    const beat = beatLen(mv.gait, tempo), bar = beat * G.barBeats;
    let bars;
    if (mv.gait === 'halt') bars = 1;
    else bars = Math.max(1, Math.round(route.len / (G.speed * (mv.big ? BIG : 1) * bar)));
    const seg = { i, cue: mv.cue, gait: mv.gait, big: !!mv.big, text: mv.text, coef: mv.coef || 1, salute: !!mv.salute, final: !!mv.final,
      start: t, end: t + bars * bar, beat, barBeats: G.barBeats, bars, route, len: route.len, from: prev ? prev.gait : null, n0: notes.length, n1: 0 };
    const total = bars * G.barBeats;
    for (let b = 0; b < total; b++) {
      const nt = t + b * beat;
      let type = null;
      if (b === 0) type = !prev || prev.gait === mv.gait ? (mv.gait === 'halt' ? null : 'beat') : (G.rank > GAITS[prev.gait].rank ? 'up' : 'down');
      else if (mv.gait === 'halt') type = mv.salute && b === 2 ? 'salute' : null;
      else type = 'beat';
      if (!type) continue;
      notes.push({ id: notes.length, t: nt, type, seg: i, gait: mv.gait, accent: mv.gait === 'canter' && b % 3 === 2, bar: Math.floor(b / G.barBeats), beatInBar: b % G.barBeats });
    }
    seg.n1 = notes.length;
    segs.push(seg);
    t = seg.end; pos = route.pts[route.pts.length - 1].slice(); head = route.head; prev = seg;
  });
  const last = segs[segs.length - 1];
  return { id: test.id, name: test.name, title: test.title || '', level: level.id, daily: !!test.daily, tempo, look: level.look, key: test.key ?? level.key,
    seed: hashSeed('tune:' + test.id + ':' + (test.seedExtra || '')), introBars, start: segs[0].start, segments: segs, notes,
    end: last.end, outroEnd: last.end + 2.6 };
}
export const segmentAt = (chart, t) => {
  const s = chart.segments; if (t < s[0].start) return -1;
  for (let i = s.length - 1; i >= 0; i--) if (t >= s[i].start) return i;
  return -1;
};

// Where the horse is at chart time t, what it is doing, and how far through its stride it is (0..1).
export function horseAt(chart, t) {
  const segs = chart.segments, s0 = segs[0];
  if (t < s0.start) {
    const sp = GAITS[s0.gait].speed, d = (s0.start - t) * sp;
    const beats = (t - 0) / s0.beat, G = GAITS[s0.gait];
    return { x: P.IN[0], y: P.IN[1] + d, dir: [0, -1], gait: s0.gait, big: false, seg: -1, phase: ((beats / G.stride) % 1 + 1) % 1, beats, speed: sp };
  }
  const i = Math.min(segs.length - 1, Math.max(0, segmentAt(chart, t)));
  const s = segs[i], G = GAITS[s.gait];
  if (t >= chart.end) { const p = pointAlong(s.route, s.len); return { x: p.x, y: p.y, dir: p.dir, gait: 'halt', big: false, seg: segs.length, phase: 0, beats: 0, speed: 0 }; }
  const f = Math.min(1, (t - s.start) / (s.end - s.start)), p = pointAlong(s.route, f * s.len);
  const beats = (t - s.start) / s.beat;
  return { x: p.x, y: p.y, dir: p.dir, gait: s.gait, big: s.big, seg: i, phase: s.gait === 'halt' ? 0 : (beats / G.stride) % 1, beats, speed: s.len / (s.end - s.start) };
}

// ---------- Daily test ----------
const DIAG = { K: ['M', 1], F: ['H', -1], H: ['F', -1], M: ['K', 1] };
export function dailyTest(key = dayKey()) {
  const rnd = mulberry(hashSeed('dressage:' + key));
  const mv = [m('A', 'trot', 'A X', 'Enter at A in trot'), SALUTE()];
  let dir = rnd() < 0.5 ? 1 : -1;
  mv.push(m('X', 'trot', 'C ' + railTokens('C', 1, dir), `Trot on. At C, track ${dir > 0 ? 'right' : 'left'}`));
  let cur = LETTERS[(4 + dir + 8) % 8], gait = 'trot', est = 6 + 2.5 + 8;
  let guard = 0;
  while (est < 72 && guard++ < 40) {
    let next;
    const r = rnd();
    if (gait === 'walk') next = 'trot';
    else if (gait === 'trot') next = r < 0.28 ? 'walk' : r < 0.75 ? 'canter' : 'trot';
    else next = r < 0.7 ? 'trot' : 'canter';
    let route, text, big = false;
    const name = GAITS[next].name, from = cur;
    const change = next !== gait;
    const lead = change ? `${name} at ${cur}` : '';
    const diag = DIAG[cur] && DIAG[cur][1] === dir;
    const circleOk = ['A', 'C', 'E', 'B'].includes(cur);
    if (next === 'walk') {
      if (diag && rnd() < 0.6) { route = `X ${DIAG[cur][0]}`; big = true; text = `${lead}, free walk across the diagonal`; dir = -dir; cur = DIAG[cur][0]; }
      else { route = railTokens(cur, 1, dir); cur = route.split(' ').at(-1); text = lead; }
    } else if (circleOk && rnd() < 0.45) {
      route = 'O'; text = change ? `${lead}, big circle` : `Big circle at ${cur}`;
    } else if (next === 'trot' && diag && rnd() < 0.5) {
      route = `X ${DIAG[cur][0]}`; text = change ? `${lead}, across the diagonal` : `Across the diagonal from ${cur}`; dir = -dir; cur = DIAG[cur][0];
    } else {
      const steps = 2 + Math.floor(rnd() * 2); route = railTokens(cur, steps, dir); const to = route.split(' ').at(-1);
      text = change ? lead : `Keep going to ${to}`; cur = to;
    }
    est += buildRoute(route, P[from]).len / (GAITS[next].speed * (big ? BIG : 1));
    mv.push(m(from, next, route, text, { big, coef: change && next === 'canter' ? 2 : 1 }));
    gait = next;
  }
  // Home: trot round to A, then down the center line and salute.
  const steps = ((LETTERS.indexOf('A') - LETTERS.indexOf(cur)) * dir + 16) % 8;
  const home = steps ? railTokens(cur, steps, dir) + ' X' : 'X';
  mv.push(m(cur, 'trot', home, gait === 'trot' ? 'Keep trotting. At A, down the center line' : `Trot at ${cur}. At A, down the center line`));
  mv.push(SALUTE(true));
  // Cue letters are where each movement begins: fix them up from the route so the card always matches.
  return { id: 'daily-' + key, level: 'training', name: 'Daily test', title: prettyDay(key), daily: true, key: pick(rnd, [60, 62, 65, 67]), seedExtra: key, movements: fixCues(mv) };
}
function fixCues(mv) {
  let at = 'IN';
  return mv.map((x, i) => {
    const start = i === 0 ? 'A' : at;
    const y = { ...x, cue: /^[A-Z]$/.test(start) ? start : x.cue };
    if (x.gait !== 'halt' && x.route) { const toks = x.route.split(/\s+/).filter(t => P[t] && !CORNERS.has(t)); if (toks.length) at = toks.at(-1); }
    return y;
  });
}
function prettyDay(key) {
  const [y, mo, d] = key.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(mo || 1) - 1]} ${d || 1}${y ? '' : ''}`;
}

// ---------- Judging ----------
export function gradeFor(dt) {
  const a = Math.abs(dt);
  return a <= WIN.perfect ? 'perfect' : a <= WIN.good ? 'good' : a <= WIN.ok ? 'ok' : null;
}
export function createJudge(chart) {
  return { chart, notes: chart.notes.map(n => ({ ...n, res: null, dt: null })), next: 0,
    segs: chart.segments.map(() => ({ strays: 0, breaks: 0, consec: 0, done: false, score: null })), combo: 0, best: 0, over: false };
}
const needFor = n => n.type === 'up' ? 'up' : n.type === 'down' ? 'down' : 'tap';

// kind: 'tap' | 'up' | 'down'. t is chart time (already corrected for the player's latency offset).
export function judgeInput(J, t, kind) {
  const ev = [];
  let best = null, bestA = Infinity;
  for (let i = J.next; i < J.notes.length; i++) {
    const n = J.notes[i]; if (n.t > t + WIN.ok) break;
    if (n.res) continue;
    const a = Math.abs(t - n.t); if (a <= WIN.ok && a < bestA) { best = n; bestA = a; }
  }
  if (!best) {
    const si = segmentAt(J.chart, t);
    if (si >= 0 && si < J.segs.length && t < J.chart.end) { J.segs[si].strays++; }
    ev.push({ type: 'stray', seg: si, t });
    return ev;
  }
  const need = needFor(best), S = J.segs[best.seg];
  best.dt = t - best.t;
  if (need === 'tap' || kind === need) {
    best.res = gradeFor(best.dt);
    S.consec = 0; J.combo++; J.best = Math.max(J.best, J.combo);
    ev.push({ type: 'hit', note: best, grade: best.res, dt: best.dt, combo: J.combo });
  } else if (kind === 'tap') {
    best.res = 'wrong'; J.combo = 0; S.breaks++;
    ev.push({ type: 'wrong', note: best, why: 'swipe' }, { type: 'break', seg: best.seg, t, soft: true });
  } else {
    best.res = 'wrongway'; best.dt = null; J.combo = 0; S.breaks++;
    ev.push({ type: 'wrong', note: best, why: 'direction' }, { type: 'break', seg: best.seg, t });
  }
  advancePointer(J);
  return ev;
}
function advancePointer(J) { while (J.next < J.notes.length && J.notes[J.next].res) J.next++; }

// Call every frame with the current chart time: marks passed notes as missed, breaks gait after two misses
// in a row (or a missed transition), and reports finished movements with their scores.
export function advanceJudge(J, t) {
  const ev = [];
  for (let i = J.next; i < J.notes.length; i++) {
    const n = J.notes[i]; if (n.t >= t - WIN.ok) break;
    if (n.res) continue;
    n.res = 'miss'; J.combo = 0;
    const S = J.segs[n.seg];
    ev.push({ type: 'miss', note: n });
    if (n.type === 'up' || n.type === 'down') { S.breaks++; S.consec = 0; ev.push({ type: 'break', seg: n.seg, t: n.t }); }
    else if (n.type === 'beat') { S.consec++; if (S.consec >= 2) { S.breaks++; S.consec = 0; ev.push({ type: 'break', seg: n.seg, t: n.t }); } }
  }
  advancePointer(J);
  const segs = J.chart.segments;
  for (let i = 0; i < segs.length; i++) {
    const S = J.segs[i]; if (S.done) continue;
    if (t < segs[i].end + WIN.ok) break;
    const ns = J.notes.slice(segs[i].n0, segs[i].n1);
    if (ns.some(n => !n.res)) break;
    S.done = true; S.score = scoreMovement(movementStats(J, i));
    ev.push({ type: 'movement', seg: i, score: S.score });
  }
  return ev;
}
export function movementStats(J, i) {
  const s = J.chart.segments[i], ns = J.notes.slice(s.n0, s.n1), S = J.segs[i];
  const trans = ns.find(n => n.type === 'up' || n.type === 'down');
  const beats = ns.filter(n => n !== trans);
  return { beats: beats.map(n => n.res || 'miss'), trans: trans ? (trans.res || 'miss') : null,
    offsets: ns.filter(n => n.dt != null && n.res && n.res !== 'miss').map(n => n.dt), strays: S.strays, breaks: S.breaks };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round05 = v => Math.round(v * 2) / 2;
export function rhythmOf(offsets) {
  if (offsets.length < 2) return null;
  const mean = offsets.reduce((s, v) => s + v, 0) / offsets.length;
  const sd = Math.sqrt(offsets.reduce((s, v) => s + (v - mean) ** 2, 0) / offsets.length);
  return clamp(1 - (sd - 0.02) / 0.08, 0, 1);
}
// One movement, 0–10 in half points like a real score sheet.
export function scoreMovement({ beats = [], trans = null, offsets = [], strays = 0, breaks = 0 }) {
  const q = r => QUALITY[r] ?? 0;
  const acc = beats.length ? beats.reduce((s, r) => s + q(r), 0) / beats.length : (trans ? q(trans) : 1);
  const rh = rhythmOf(offsets) ?? acc;
  const raw = trans ? (beats.length ? 0.45 * acc + 0.4 * q(trans) + 0.15 * rh : 0.8 * q(trans) + 0.2 * rh) : 0.8 * acc + 0.2 * rh;
  return clamp(round05(raw * 10 - 1.5 * breaks - Math.min(3, 0.4 * strays)), 0, 10);
}
export function ribbonFor(pct) { return RIBBONS.find(r => pct >= r.min) || null; }

export function finishJudge(J) {
  const ev = advanceJudge(J, Infinity);
  const segs = J.chart.segments;
  const movements = segs.map((s, i) => ({ cue: s.cue, text: s.text, gait: s.gait, coef: s.coef, score: J.segs[i].score ?? 0 }));
  const all = J.notes, hits = all.filter(n => n.res && n.res !== 'miss' && n.res !== 'wrong' && n.res !== 'wrongway');
  const offsets = all.filter(n => n.dt != null && n.res && n.res !== 'miss').map(n => n.dt);
  const misses = all.filter(n => n.res === 'miss').length;
  const breaks = J.segs.reduce((s, x) => s + x.breaks, 0), strays = J.segs.reduce((s, x) => s + x.strays, 0);
  const hitRatio = all.length ? hits.length / all.length : 0;
  const rhythm = round05(10 * (rhythmOf(offsets) ?? hitRatio) * hitRatio);
  const harmony = round05(clamp(10 - 1.2 * breaks - 10 * (misses / (all.length || 1)) - 0.05 * strays, 0, 10));
  const collective = [{ text: 'Rhythm', score: rhythm, coef: 1 }, { text: 'Harmony', score: harmony, coef: 1 }];
  const marks = [...movements, ...collective];
  const got = marks.reduce((s, x) => s + x.score * x.coef, 0), max = marks.reduce((s, x) => s + 10 * x.coef, 0);
  const pct = Math.round((got / max) * 1000) / 10;
  const counts = { perfect: 0, good: 0, ok: 0, wrong: 0, wrongway: 0, miss: 0 };
  for (const n of all) if (n.res) counts[n.res]++;
  J.over = true;
  return { movements, collective, pct, ribbon: ribbonFor(pct), counts, breaks, strays, bestCombo: J.best, events: ev, remark: remarkFor(movements, { breaks, pct, rhythm }) };
}
function remarkFor(mv, { breaks, pct, rhythm }) {
  const scored = mv.filter(x => x.gait !== 'halt');
  const best = [...scored].sort((a, b) => b.score - a.score)[0], worst = [...scored].sort((a, b) => a.score - b.score)[0];
  const g = x => GAITS[x.gait].name.toLowerCase();
  if (pct >= 92) return 'Wow. Light, forward and on the beat the whole way. The judge is smiling.';
  if (pct >= 80) return `Lovely rhythm, especially in the ${g(best)}. A real picture.`;
  if (breaks >= 3) return 'A few breaks of gait. Keep tapping steady and your horse will stay calm.';
  if (rhythm < 6) return 'Try to tap evenly, like a heartbeat. The rhythm is the secret.';
  if (worst && worst.score < 6) return `Nice ride! The ${g(worst)} at ${worst.cue} needs a little more practice.`;
  return 'A tidy test. Smooth transitions will push that score higher.';
}

// ---------- Rewards (Trotties) ----------
// About 10 a minute for good riding: 10 for a decent test rising to the level cap (20 / 25 / 30) by score.
// Nothing below 25% (nobody was riding) and nothing for leaving early. The daily test pays 40 the first time
// it is finished each day; replays of it pay like a Training test.
export function rewardFor({ pct, level = 'intro', daily = false, dailyDone = false, abandoned = false }) {
  if (abandoned || !(pct >= 25)) return { coins: 0, lines: [] };
  if (daily && !dailyDone) return { coins: DAILY_COINS, lines: [`Daily test · ${DAILY_COINS} 🪙`] };
  const L = levelById(daily ? 'training' : level) || LEVELS[0];
  const coins = Math.round(10 + (L.maxCoins - 10) * clamp((pct - 55) / 40, 0, 1));
  return { coins, lines: [`${daily ? 'Daily test' : L.name + ' test'} ${pct.toFixed(1)}% · ${coins} 🪙`] };
}
// Training opens with a ribbon on any Intro test; First level with a ribbon on any Training test.
export function levelUnlocked(levelId, best = {}) {
  const i = LEVELS.findIndex(l => l.id === levelId);
  if (i <= 0) return i === 0;
  const prev = LEVELS[i - 1].id;
  return TESTS.some(t => t.level === prev && (best[t.id]?.pct || 0) >= RIBBONS.at(-1).min);
}

// ---------- Latency calibration ----------
// offsets: seconds each tap landed after its beat. Median of the steady ones, in ms, clamped to ±250.
export function calibrate(offsets) {
  const v = offsets.filter(x => Number.isFinite(x) && Math.abs(x) < 0.3).sort((a, b) => a - b);
  if (v.length < 4) return null;
  const mid = v.length / 2, med = v.length % 2 ? v[Math.floor(mid)] : (v[mid - 1] + v[mid]) / 2;
  return clamp(Math.round(med * 1000), -250, 250);
}

// ---------- Music ----------
// An original backing tune per gait, built bar by bar from the chart: bass, a strummed chord, a soft pad,
// a little melody, and a shaker in trot. Times are chart seconds. The page turns these into Web Audio.
const SCALE = [0, 2, 4, 5, 7, 9, 11];
export const degMidi = (key, d) => key + 12 * Math.floor(d / 7) + SCALE[((d % 7) + 7) % 7];
const PROG = { walk: [0, 5, 3, 4], trot: [0, 4, 5, 3], canter: [0, 3, 0, 4], halt: [3] };
const CHORD_BARS = { walk: 1, trot: 2, canter: 2, halt: 1 };
const RHYTHMS = {
  walk: [[[0, 1], [1, 0.5], [1.5, 0.5], [2, 2]], [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]], [[0, 2], [2, 1], [3, 1]], [[0, 1], [1, 1], [2, 1.5], [3.5, 0.5]]],
  trot: [[[0, 0.5], [0.5, 0.5], [1, 1]], [[0, 1], [1, 1]], [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5]], [[0, 1.5], [1.5, 0.5]]],
  canter: [[[0, 2], [2, 1]], [[0, 1], [1, 1], [2, 1]], [[0, 1.5], [1.5, 0.5], [2, 1]], [[0, 3]]]
};
function motif(rnd, gait) {
  const prog = PROG[gait], cb = CHORD_BARS[gait], n = prog.length * cb, bb = GAITS[gait].barBeats, pats = RHYTHMS[gait];
  let deg = 4; const A = [];
  for (let k = 0; k < n; k++) {
    const root = prog[Math.floor(k / cb) % prog.length];
    const pat = pick(rnd, pats);
    A.push(pat.map(([off, dur], j) => {
      if (j === 0 || (off % 1 === 0 && rnd() < 0.5)) {
        const tones = [root, root + 2, root + 4].flatMap(x => [x - 7, x, x + 7]).filter(x => x >= 0 && x <= 9);
        tones.sort((a, b) => Math.abs(a - deg) - Math.abs(b - deg));
        deg = tones[rnd() < 0.7 ? 0 : Math.min(1, tones.length - 1)];
      } else deg = clamp(deg + pick(rnd, [-1, 1, -1, 1, -2, 2]), 0, 9);
      return [off, dur, deg];
    }));
  }
  const B = A.map(b => b.slice());
  const endDeg = Math.abs(deg - 7) < Math.abs(deg) ? 7 : 0;
  B[n - 1] = [[0, bb, endDeg]];
  return { A, B, n };
}
export function musicPlan(chart) {
  const rnd = mulberry(chart.seed), key = chart.key, ev = [];
  const motifs = { walk: motif(rnd, 'walk'), trot: motif(rnd, 'trot'), canter: motif(rnd, 'canter') };
  const triad = r => [r, r + 2, r + 4].map(d => degMidi(key, d));
  const add = (t, inst, midi, dur, vel) => ev.push({ t, inst, midi, dur, vel });
  // The bars: intro (first gait, no melody) then every movement.
  const bars = [];
  const s0 = chart.segments[0];
  for (let b = 0; b < chart.introBars; b++) bars.push({ t: b * barLen(s0.gait, chart.tempo), gait: s0.gait, beat: s0.beat, intro: true, run: 'intro' });
  let runId = 0, prevGait = null;
  for (const s of chart.segments) {
    if (s.gait !== prevGait) runId++;
    prevGait = s.gait;
    for (let b = 0; b < s.bars; b++) bars.push({ t: s.start + b * s.beat * s.barBeats, gait: s.gait, beat: s.beat, run: runId, salute: s.salute });
  }
  let runStart = 0, lastRun = null;
  bars.forEach((bar, idx) => {
    if (bar.run !== lastRun) { runStart = idx; lastRun = bar.run; }
    const k = idx - runStart, g = bar.gait, b = bar.beat, T = bar.t, prog = PROG[g], cb = CHORD_BARS[g];
    const root = prog[Math.floor(k / cb) % prog.length], ch = triad(root);
    const bass = degMidi(key - 12, root), fifth = degMidi(key - 12, root + 4);
    if (k % cb === 0) add(T, 'pad', ch, b * GAITS[g].barBeats * cb, g === 'halt' ? 0.5 : 0.32);
    if (g === 'walk') {
      add(T, 'bass', bass, b * 1.5, 0.8); add(T + 2 * b, 'bass', fifth, b * 1.5, 0.65);
      add(T + b, 'pluck', ch, b * 0.8, 0.45); add(T + 3 * b, 'pluck', ch, b * 0.8, 0.4);
    } else if (g === 'trot') {
      add(T, 'bass', bass, b * 0.8, 0.8); add(T + b, 'bass', fifth, b * 0.8, 0.7);
      add(T + 0.5 * b, 'pluck', ch, b * 0.4, 0.42); add(T + 1.5 * b, 'pluck', ch, b * 0.4, 0.42);
      for (let h = 0; h < 4; h++) add(T + h * 0.5 * b, 'shaker', 0, 0.05, h % 2 ? 0.28 : 0.14);
    } else if (g === 'canter') {
      add(T, 'bass', bass, b * 1, 0.85); add(T + 2 * b, 'bass', fifth, b * 0.9, 0.7);
      add(T + b, 'pluck', ch, b * 0.6, 0.38); add(T + 2 * b, 'pluck', ch, b * 0.6, 0.5);
      add(T + 2 * b, 'shaker', 0, 0.06, 0.24);
    } else {
      [0, 1, 2].forEach(j => add(T + j * b, 'bell', degMidi(key + 12, root + j * 2), b * 2, 0.22));
    }
    if (!bar.intro && g !== 'halt') {
      const M = motifs[g], pass = Math.floor(k / M.n), mb = (pass % 2 ? M.B : M.A)[k % M.n];
      for (const [off, dur, d] of mb) add(T + off * b, 'lead', degMidi(key + 12, d), dur * b * 0.92, 0.5);
    }
  });
  // Outro: a warm home chord.
  const E = chart.end;
  add(E, 'pad', triad(0), 2.4, 0.45); add(E, 'bass', degMidi(key - 12, 0), 2, 0.8);
  [0, 2, 4, 7].forEach((d, j) => add(E + j * 0.11, 'pluck', [degMidi(key, d)], 1.4, 0.4));
  add(E + 0.33, 'lead', degMidi(key + 12, 0), 1.8, 0.45);
  return ev.sort((a, b) => a.t - b.t);
}
