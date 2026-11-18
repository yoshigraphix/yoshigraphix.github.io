// Cart Before the Horse: load a horse cart at the feed store, then drive it home down a bumpy lane.
// Pure rules: no DOM, so node can test it.
//
// Physics is a tiny deterministic 2D rigid-box engine (a port of the Box2D-Lite ideas: SAT box-box
// contacts with clipping, sequential impulses, warm starting, Coulomb friction). It runs in the CART'S
// frame: the bed never moves, and everything the cart does (speeding up, slowing down, bouncing over
// bumps, tilting on hills) becomes a change in "gravity" for the load. Fixed timestep, no randomness
// inside the step, so the same lane + the same presses always give the same result.
//
// Units are metres, seconds and kilograms. The cart faces +x (the horse is on the right).

export const G = 9.8;
export const DT = 1 / 60;          // one game step
const SUB = 2;                     // physics substeps per step
const ITER = 10;                   // impulse iterations per substep
const LIN_DAMP = 0.05, ANG_DAMP = 0.6;

// ---------- The cart ----------
export const BED = { halfW: 1.25, boardH: 0.26, boardW: 0.07 }; // bed top is y = 0
export const MAX_STACK = 2.3;      // nothing may be dropped higher than this above the bed
export const DROP_MIN_X = -BED.halfW - 0.15, DROP_MAX_X = BED.halfW + 0.15;
export const WHEEL_R = 0.62;       // visual: bed top sits this high above the road
// Two supports: the cart wheels (behind the bed centre) and the horse's shafts (ahead of it).
export const BACK = -0.55, FRONT = 1.85, BASE = FRONT - BACK;

// ---------- Driving ----------
export const VMAX = 7.2, WALK = 1.3, ACCEL = 1.8, DECEL = 1.9;
const SPRING = 2000, DAMP = 45;     // cart suspension (per support)

// ---------- What arrives on the dock ----------
export const ITEMS = {
  sack:    { name: 'Oat sack',     w: 0.62, h: 0.32, m: 25, mu: 0.9,  value: 10 },
  hay:     { name: 'Hay bale',     w: 0.90, h: 0.42, m: 20, mu: 0.85, value: 8 },
  crate:   { name: 'Apple crate',  w: 0.56, h: 0.42, m: 22, mu: 0.55, value: 14 },
  carrots: { name: 'Carrot box',   w: 0.42, h: 0.30, m: 9,  mu: 0.6,  value: 12 },
  barrel:  { name: 'Cider barrel', w: 0.50, h: 0.66, m: 38, mu: 0.5,  value: 18 },
  can:     { name: 'Milk can',     w: 0.28, h: 0.56, m: 16, mu: 0.45, value: 16 },
  eggs:    { name: 'Egg box',      w: 0.46, h: 0.18, m: 3,  mu: 0.5,  value: 22 }
};

// ---------- Seeded randomness ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hashStr(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const between = (r, [a, b]) => a + (b - a) * r();
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// =====================================================================================================
// Rigid boxes
// =====================================================================================================
let nextId = 1;
function makeBody({ x, y, a = 0, w, h, m = 0, mu = 0.6, type = null }) {
  const b = { id: nextId++, x, y, a, vx: 0, vy: 0, w: 0, hw: w / 2, hh: h / 2, mu, type, m: m || Infinity };
  b.im = m ? 1 / m : 0;
  b.iI = m ? 12 / (m * (w * w + h * h)) : 0;
  return b;
}
const rot = a => ({ c: Math.cos(a), s: Math.sin(a) });
// Half extents of a body's axis-aligned bounding box.
export function aabbHalf(b) { const c = Math.abs(Math.cos(b.a)), s = Math.abs(Math.sin(b.a)); return { x: c * b.hw + s * b.hh, y: s * b.hw + c * b.hh }; }

// Box-box contact (separating axis + reference-face clipping). Returns up to 2 contacts with
// feature keys so impulses can be carried between steps.
const NO_EDGE = 0, E1 = 1, E2 = 2, E3 = 3, E4 = 4;
const fkey = f => f.i1 | (f.o1 << 4) | (f.i2 << 8) | (f.o2 << 12);
function clipSeg(vin, nx, ny, off, clipEdge) {
  const out = [];
  const d0 = nx * vin[0].x + ny * vin[0].y - off, d1 = nx * vin[1].x + ny * vin[1].y - off;
  if (d0 <= 0) out.push(vin[0]);
  if (d1 <= 0) out.push(vin[1]);
  if (d0 * d1 < 0) {
    const t = d0 / (d0 - d1);
    const p = { x: vin[0].x + t * (vin[1].x - vin[0].x), y: vin[0].y + t * (vin[1].y - vin[0].y), f: null };
    if (d0 > 0) p.f = { ...vin[0].f, i1: clipEdge, i2: NO_EDGE };
    else p.f = { ...vin[1].f, o1: clipEdge, o2: NO_EDGE };
    out.push(p);
  }
  return out;
}
function incidentEdge(hx, hy, b, R, nx, ny) {
  // normal into the incident box's frame, flipped
  const lx = -(R.c * nx + R.s * ny), ly = -(-R.s * nx + R.c * ny);
  let c0, c1;
  if (Math.abs(lx) > Math.abs(ly)) {
    if (lx > 0) { c0 = { x: hx, y: -hy, f: { i1: 0, o1: 0, i2: E3, o2: E4 } }; c1 = { x: hx, y: hy, f: { i1: 0, o1: 0, i2: E4, o2: E1 } }; }
    else { c0 = { x: -hx, y: hy, f: { i1: 0, o1: 0, i2: E1, o2: E2 } }; c1 = { x: -hx, y: -hy, f: { i1: 0, o1: 0, i2: E2, o2: E3 } }; }
  } else {
    if (ly > 0) { c0 = { x: hx, y: hy, f: { i1: 0, o1: 0, i2: E4, o2: E1 } }; c1 = { x: -hx, y: hy, f: { i1: 0, o1: 0, i2: E1, o2: E2 } }; }
    else { c0 = { x: -hx, y: -hy, f: { i1: 0, o1: 0, i2: E2, o2: E3 } }; c1 = { x: hx, y: -hy, f: { i1: 0, o1: 0, i2: E3, o2: E4 } }; }
  }
  for (const c of [c0, c1]) { const x = c.x, y = c.y; c.x = b.x + R.c * x - R.s * y; c.y = b.y + R.s * x + R.c * y; }
  return [c0, c1];
}
export function collide(A, B) {
  const RA = rot(A.a), RB = rot(B.a);
  const dpx = B.x - A.x, dpy = B.y - A.y;
  const dAx = RA.c * dpx + RA.s * dpy, dAy = -RA.s * dpx + RA.c * dpy;
  const dBx = RB.c * dpx + RB.s * dpy, dBy = -RB.s * dpx + RB.c * dpy;
  const cc = Math.abs(Math.cos(B.a - A.a)), ss = Math.abs(Math.sin(B.a - A.a));
  const faceAx = Math.abs(dAx) - A.hw - (cc * B.hw + ss * B.hh);
  const faceAy = Math.abs(dAy) - A.hh - (ss * B.hw + cc * B.hh);
  if (faceAx > 0 || faceAy > 0) return [];
  const faceBx = Math.abs(dBx) - (cc * A.hw + ss * A.hh) - B.hw;
  const faceBy = Math.abs(dBy) - (ss * A.hw + cc * A.hh) - B.hh;
  if (faceBx > 0 || faceBy > 0) return [];
  // Pick the axis of least penetration, favouring A's faces for coherence.
  let axis = 0, sep = faceAx, nx = dAx > 0 ? RA.c : -RA.c, ny = dAx > 0 ? RA.s : -RA.s;
  const rel = 0.95, abs = 0.01;
  if (faceAy > rel * sep + abs * A.hh) { axis = 1; sep = faceAy; nx = dAy > 0 ? -RA.s : RA.s; ny = dAy > 0 ? RA.c : -RA.c; }
  if (faceBx > rel * sep + abs * B.hw) { axis = 2; sep = faceBx; nx = dBx > 0 ? RB.c : -RB.c; ny = dBx > 0 ? RB.s : -RB.s; }
  if (faceBy > rel * sep + abs * B.hh) { axis = 3; sep = faceBy; nx = dBy > 0 ? -RB.s : RB.s; ny = dBy > 0 ? RB.c : -RB.c; }
  let fnx, fny, front, snx, sny, side, negSide, posSide, negEdge, posEdge, inc;
  if (axis === 0) {
    fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + A.hw;
    snx = -RA.s; sny = RA.c; side = A.x * snx + A.y * sny; negSide = -side + A.hh; posSide = side + A.hh; negEdge = E3; posEdge = E1;
    inc = incidentEdge(B.hw, B.hh, B, RB, fnx, fny);
  } else if (axis === 1) {
    fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + A.hh;
    snx = RA.c; sny = RA.s; side = A.x * snx + A.y * sny; negSide = -side + A.hw; posSide = side + A.hw; negEdge = E2; posEdge = E4;
    inc = incidentEdge(B.hw, B.hh, B, RB, fnx, fny);
  } else if (axis === 2) {
    fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + B.hw;
    snx = -RB.s; sny = RB.c; side = B.x * snx + B.y * sny; negSide = -side + B.hh; posSide = side + B.hh; negEdge = E3; posEdge = E1;
    inc = incidentEdge(A.hw, A.hh, A, RA, fnx, fny);
  } else {
    fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + B.hh;
    snx = RB.c; sny = RB.s; side = B.x * snx + B.y * sny; negSide = -side + B.hw; posSide = side + B.hw; negEdge = E2; posEdge = E4;
    inc = incidentEdge(A.hw, A.hh, A, RA, fnx, fny);
  }
  const c1 = clipSeg(inc, -snx, -sny, negSide, negEdge); if (c1.length < 2) return [];
  const c2 = clipSeg(c1, snx, sny, posSide, posEdge); if (c2.length < 2) return [];
  const out = [];
  for (const p of c2) {
    const s = fnx * p.x + fny * p.y - front;
    if (s <= 0) {
      let f = p.f; if (axis >= 2) f = { i1: f.i2, o1: f.o2, i2: f.i1, o2: f.o1 };
      out.push({ sep: s, nx, ny, x: p.x - s * fnx, y: p.y - s * fny, key: fkey(f), Pn: 0, Pt: 0, mn: 0, mt: 0, bias: 0 });
    }
  }
  return out;
}

export function createWorld() {
  const W = { bodies: [], arbs: new Map() };
  W.bodies.push(makeBody({ x: 0, y: -0.12, w: BED.halfW * 2, h: 0.24, type: '#bed', mu: 0.75 }));
  W.bodies.push(makeBody({ x: -BED.halfW + BED.boardW / 2, y: BED.boardH / 2, w: BED.boardW, h: BED.boardH, type: '#board', mu: 0.6 }));
  W.bodies.push(makeBody({ x: BED.halfW - BED.boardW / 2, y: BED.boardH / 2, w: BED.boardW, h: BED.boardH, type: '#board', mu: 0.6 }));
  return W;
}
export const items = W => W.bodies.filter(b => b.im > 0);

function removeBody(W, b) {
  W.bodies = W.bodies.filter(o => o !== b);
  for (const [k, arb] of W.arbs) if (arb.b1 === b || arb.b2 === b) W.arbs.delete(k);
}

// One physics substep. (gx, gy) is the load's gravity in the cart frame; alpha is the cart's angular
// acceleration (its Euler force pushes items differently at each end of the bed).
export function stepWorld(W, dt, gx, gy, alpha = 0) {
  const B = W.bodies, inv = 1 / dt;
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    let b1 = B[i], b2 = B[j];
    if (b1.im === 0 && b2.im === 0) continue;
    if (b1.id > b2.id) [b1, b2] = [b2, b1];
    const key = b1.id * 4096 + b2.id;
    const h1 = aabbHalf(b1), h2 = aabbHalf(b2);
    const near = Math.abs(b1.x - b2.x) <= h1.x + h2.x + 0.01 && Math.abs(b1.y - b2.y) <= h1.y + h2.y + 0.01;
    const cs = near ? collide(b1, b2) : [];
    if (!cs.length) { W.arbs.delete(key); continue; }
    const old = W.arbs.get(key);
    if (old) { for (const c of cs) { const o = old.cs.find(q => q.key === c.key); if (o) { c.Pn = o.Pn; c.Pt = o.Pt; } } old.cs = cs; }
    else W.arbs.set(key, { b1, b2, cs, mu: Math.sqrt(b1.mu * b2.mu) });
  }
  for (const b of B) {
    if (!b.im) continue;
    b.vx += dt * (gx + alpha * b.y); b.vy += dt * (gy - alpha * b.x);
    const ld = 1 - LIN_DAMP * dt, ad = 1 - ANG_DAMP * dt; b.vx *= ld; b.vy *= ld; b.w *= ad;
  }
  for (const arb of W.arbs.values()) {
    const { b1, b2 } = arb;
    for (const c of arb.cs) {
      const r1x = c.x - b1.x, r1y = c.y - b1.y, r2x = c.x - b2.x, r2y = c.y - b2.y;
      const rn1 = r1x * c.nx + r1y * c.ny, rn2 = r2x * c.nx + r2y * c.ny;
      c.mn = 1 / (b1.im + b2.im + b1.iI * (r1x * r1x + r1y * r1y - rn1 * rn1) + b2.iI * (r2x * r2x + r2y * r2y - rn2 * rn2));
      const tx = c.ny, ty = -c.nx, rt1 = r1x * tx + r1y * ty, rt2 = r2x * tx + r2y * ty;
      c.mt = 1 / (b1.im + b2.im + b1.iI * (r1x * r1x + r1y * r1y - rt1 * rt1) + b2.iI * (r2x * r2x + r2y * r2y - rt2 * rt2));
      c.bias = -0.2 * inv * Math.min(0, c.sep + 0.01);
      const Px = c.Pn * c.nx + c.Pt * tx, Py = c.Pn * c.ny + c.Pt * ty;
      b1.vx -= b1.im * Px; b1.vy -= b1.im * Py; b1.w -= b1.iI * (r1x * Py - r1y * Px);
      b2.vx += b2.im * Px; b2.vy += b2.im * Py; b2.w += b2.iI * (r2x * Py - r2y * Px);
    }
  }
  for (let it = 0; it < ITER; it++) for (const arb of W.arbs.values()) {
    const { b1, b2, mu } = arb;
    for (const c of arb.cs) {
      const r1x = c.x - b1.x, r1y = c.y - b1.y, r2x = c.x - b2.x, r2y = c.y - b2.y;
      let dvx = b2.vx - b2.w * r2y - b1.vx + b1.w * r1y, dvy = b2.vy + b2.w * r2x - b1.vy - b1.w * r1x;
      let dPn = c.mn * (-(dvx * c.nx + dvy * c.ny) + c.bias);
      const Pn0 = c.Pn; c.Pn = Math.max(Pn0 + dPn, 0); dPn = c.Pn - Pn0;
      let Px = dPn * c.nx, Py = dPn * c.ny;
      b1.vx -= b1.im * Px; b1.vy -= b1.im * Py; b1.w -= b1.iI * (r1x * Py - r1y * Px);
      b2.vx += b2.im * Px; b2.vy += b2.im * Py; b2.w += b2.iI * (r2x * Py - r2y * Px);
      dvx = b2.vx - b2.w * r2y - b1.vx + b1.w * r1y; dvy = b2.vy + b2.w * r2x - b1.vy - b1.w * r1x;
      const tx = c.ny, ty = -c.nx;
      let dPt = c.mt * -(dvx * tx + dvy * ty);
      const maxPt = mu * c.Pn, Pt0 = c.Pt; c.Pt = clamp(Pt0 + dPt, -maxPt, maxPt); dPt = c.Pt - Pt0;
      Px = dPt * tx; Py = dPt * ty;
      b1.vx -= b1.im * Px; b1.vy -= b1.im * Py; b1.w -= b1.iI * (r1x * Py - r1y * Px);
      b2.vx += b2.im * Px; b2.vy += b2.im * Py; b2.w += b2.iI * (r2x * Py - r2y * Px);
    }
  }
  for (const b of B) { if (!b.im) continue; b.x += dt * b.vx; b.y += dt * b.vy; b.a += dt * b.w; }
}

// Anything below the bed top (it slid off an end) or far away is gone.
function sweepLost(W) {
  const lost = [];
  for (const b of items(W)) if (b.y < -0.35 || Math.abs(b.x) > BED.halfW + 2.5) lost.push(b);
  for (const b of lost) removeBody(W, b);
  return lost;
}

// Where an item of this size would land if dropped at x: just above whatever is under it.
export function dropY(W, x, type, turned = false) {
  const it = ITEMS[type], hw = (turned ? it.h : it.w) / 2, hh = (turned ? it.w : it.h) / 2;
  let top = 0;
  for (const b of W.bodies) {
    if (b.type === '#bed') continue;
    const h = aabbHalf(b);
    if (Math.abs(b.x - x) < h.x + hw - 0.005) top = Math.max(top, b.y + h.y);
  }
  return { y: top + hh + 0.03, top, hw, hh, tooHigh: top + hh * 2 > MAX_STACK };
}
function addItem(W, type, x, turned) {
  const it = ITEMS[type], d = dropY(W, x, type, turned);
  const b = makeBody({ x, y: d.y, w: it.w, h: it.h, a: turned ? Math.PI / 2 : 0, m: it.m, mu: it.mu, type });
  b.turned = !!turned;
  W.bodies.push(b);
  return b;
}
// An item dropped low that would just clip an end board slides inside it instead of perching on it.
export function snapX(W, x, type, turned = false) {
  const it = ITEMS[type], hw = (turned ? it.h : it.w) / 2, inner = BED.halfW - BED.boardW, over = Math.abs(x) + hw - inner;
  if (over <= 0 || over > hw * 0.7) return x;
  let top = 0;
  for (const b of W.bodies) { if (b.im === 0) continue; const h = aabbHalf(b); if (Math.abs(b.x - x) < h.x + hw - 0.005) top = Math.max(top, b.y + h.y); }
  return top < BED.boardH ? Math.sign(x) * (inner - hw - 0.004) : x;
}
export const settled = W => items(W).every(b => Math.abs(b.vx) < 0.05 && Math.abs(b.vy) < 0.05 && Math.abs(b.w) < 0.1);

// =====================================================================================================
// Lanes
// =====================================================================================================
export const TIERS = [
  { n: 1, name: 'Meadow lanes', len: [115, 150], items: [5, 6], kinds: ['sack', 'hay', 'crate', 'carrots', 'sack', 'hay'], gap: [11, 18], bump: [0.05, 0.08], hole: [0.05, 0.08], hill: [0.5, 1.4], bridges: [0, 1], rocks: [0, 0], weights: { bump: 3, hole: 2, rocks: 0 } },
  { n: 2, name: 'Orchard roads', len: [175, 225], items: [6, 8], kinds: ['sack', 'hay', 'crate', 'carrots', 'barrel', 'can', 'crate'], gap: [7, 13], bump: [0.07, 0.11], hole: [0.07, 0.11], hill: [0.8, 1.8], bridges: [1, 1], rocks: [1, 1], weights: { bump: 3, hole: 3, rocks: 1 } },
  { n: 3, name: 'Ridge trails', len: [245, 300], items: [8, 10], kinds: ['sack', 'hay', 'crate', 'carrots', 'barrel', 'can', 'eggs', 'eggs'], gap: [4.5, 9], bump: [0.09, 0.14], hole: [0.09, 0.14], hill: [1.2, 2.4], bridges: [1, 2], rocks: [1, 2], weights: { bump: 3, hole: 3, rocks: 1 } }
];
const NAMES = ['Buttercup Bend', 'Clover Path', 'Daisy Dip', 'Willow Way', 'Apple Hollow', 'Old Mill Road', 'Cider Hill', 'Brookside', 'Rocky Ridge', 'Thistle Pass', 'Pothole Alley', 'Long Way Home'];
export const LANES = NAMES.map((name, i) => ({ id: `${Math.floor(i / 4) + 1}-${(i % 4) + 1}`, n: i, tier: Math.floor(i / 4) + 1, index: i % 4, name, seed: hashStr('valley-cart-lane-' + i) }));

// The daily lane: an orchard-road delivery seeded by the local date.
export function dailyDesc(dateStr) { return { id: 'daily', n: -1, tier: 2, index: 2, name: "Today's lane", seed: hashStr('trottville-valley-cart-' + dateStr), daily: dateStr }; }
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const RES = 0.05, PRE = 30, POST = 40; // profile sampling
export function makeLane(desc) {
  const T = TIERS[desc.tier - 1], r = rng(desc.seed), k = desc.index / 3; // k: 0 (first lane of a tier) → 1 (last)
  const span = (rg, bias = k) => lerp(rg[0], rg[1], clamp(bias * 0.6 + r() * 0.4, 0, 1));
  const length = Math.round(span(T.len));
  const feats = [];
  // Hills first: long smooth rises and dips under everything else.
  const nh = Math.max(1, Math.round(length / 70));
  for (let i = 0; i < nh; i++) {
    const len = 30 + r() * 26, s = 10 + (length - 20 - len) * ((i + 0.2 + r() * 0.6) / nh);
    feats.push({ type: 'hill', s, len, amp: span(T.hill) * (r() < 0.3 ? -0.6 : 1) });
  }
  // Bridges: planned spots, then bumps/holes/rocks fill the gaps.
  const nb = Math.round(between(r, [T.bridges[0], T.bridges[1] + (desc.index >= 2 ? 0.49 : -0.49)]));
  const bridges = [];
  for (let i = 0; i < nb; i++) bridges.push({ type: 'bridge', s: 25 + (length - 60) * ((i + 0.3 + r() * 0.4) / nb), len: 9 + r() * 3, amp: 0.45 + r() * 0.2 });
  const nr = Math.round(between(r, T.rocks));
  let rocksLeft = nr, s = 14 + r() * 4;
  const gapScale = lerp(1.15, 0.85, k);
  while (s < length - 18) {
    const br = bridges.find(b => s > b.s - 4 && s < b.s + b.len + 3);
    if (br) { s = br.s + br.len + 4 + r() * 3; continue; }
    const w = T.weights, roll = r() * (w.bump + w.hole + (rocksLeft > 0 ? 3 : 0));
    let f;
    if (roll < w.bump) { const len = 0.65 + r() * 0.5; f = { type: 'bump', s, len, amp: span(T.bump) }; }
    else if (roll < w.bump + w.hole) { const len = 0.55 + r() * 0.4; f = { type: 'hole', s, len, amp: span(T.hole) }; }
    else {
      rocksLeft--; const len = 4 + r() * 3, pebbles = []; let p = s;
      while (p < s + len) { const pl = 0.25 + r() * 0.25; pebbles.push({ s: p, len: pl, amp: 0.025 + r() * 0.03 }); p += pl + r() * 0.35; }
      f = { type: 'rocks', s, len, pebbles };
    }
    if (bridges.some(b => f.s + f.len > b.s - 3 && f.s < b.s + b.len + 3)) { s += 2; continue; }
    feats.push(f); s += f.len + between(r, T.gap) * gapScale;
  }
  feats.push(...bridges);
  feats.sort((a, b) => a.s - b.s);
  const n = Math.round(lerp(T.items[0], T.items[1], clamp(k * 0.7 + r() * 0.4, 0, 1)));
  const list = [];
  for (let i = 0; i < n; i++) list.push(T.kinds[Math.floor(r() * T.kinds.length)]);
  if (desc.tier === 1 && desc.index === 0) list.sort((a, b) => ITEMS[b].w * ITEMS[b].m - ITEMS[a].w * ITEMS[a].m); // the first lane arrives in a friendly order
  return customLane({ id: desc.id, n: desc.n, tier: desc.tier, index: desc.index, name: desc.name, daily: desc.daily || null, seed: desc.seed, length, feats, items: list });
}
// A lane from a hand-made feature list (also used by the tests). Samples the road profile once.
export function customLane({ length, feats, items: list, tier = 1, index = 0, id = 'custom', n = -1, name = 'Test lane', daily = null, seed = 0 }) {
  const lane = { id, n, tier, index, name, daily, seed, length, feats, items: list, par: length / 5.4, slow: length / 1.9 };
  const count = Math.ceil((length + PRE + POST) / RES) + 2, prof = new Float64Array(count);
  for (let i = 0; i < count; i++) prof[i] = rawHeight(feats, i * RES - PRE);
  lane.prof = prof;
  return lane;
}
const cosBump = (x, s, len) => { const u = (x - s) / len; return u <= 0 || u >= 1 ? 0 : 0.5 - 0.5 * Math.cos(2 * Math.PI * u); };
function rawHeight(feats, x) {
  let y = 0;
  for (const f of feats) {
    if (x < f.s - 0.5 || x > f.s + f.len + 0.5) continue;
    if (f.type === 'hill' || f.type === 'bump') y += f.amp * cosBump(x, f.s, f.len);
    else if (f.type === 'hole') y -= f.amp * cosBump(x, f.s, f.len);
    else if (f.type === 'rocks') for (const p of f.pebbles) y += p.amp * cosBump(x, p.s, p.len);
    else if (f.type === 'bridge') {
      const u = (x - f.s) / f.len;
      if (u > 0 && u < 1) y += f.amp * Math.sin(Math.PI * u) + 0.005 * Math.sin((x - f.s) * 2 * Math.PI / 0.36);
      y += 0.035 * cosBump(x, f.s - 0.12, 0.3) + 0.035 * cosBump(x, f.s + f.len - 0.18, 0.3); // the plank lips
    }
  }
  return y;
}
export function roadY(lane, x) {
  const f = (x + PRE) / RES, i = Math.floor(f);
  if (i < 0) return lane.prof[0];
  if (i >= lane.prof.length - 1) return lane.prof[lane.prof.length - 1];
  return lerp(lane.prof[i], lane.prof[i + 1], f - i);
}

// =====================================================================================================
// Phase 1: loading at the dock
// =====================================================================================================
export function createLoad(lane) {
  return { lane, world: createWorld(), queue: lane.items.slice(), placed: [], turned: false, returned: 0 };
}
// Drop the next item at x (cart frame). Returns {ok, body} or {ok:false, reason}.
export function placeNext(L, x) {
  if (!L.queue.length) return { ok: false, reason: 'empty' };
  const type = L.queue[0];
  x = snapX(L.world, clamp(x, DROP_MIN_X, DROP_MAX_X), type, L.turned);
  const d = dropY(L.world, x, type, L.turned);
  if (d.tooHigh) return { ok: false, reason: 'high' };
  L.queue.shift();
  const body = addItem(L.world, type, x, L.turned);
  L.placed.push(body); L.turned = false;
  return { ok: true, body };
}
export function undoLast(L) {
  const b = L.placed.pop(); if (!b) return null;
  removeBody(L.world, b); L.queue.unshift(b.type); L.turned = b.turned;
  return b;
}
export function canTurn(type) { const it = ITEMS[type]; return Math.abs(it.w - it.h) > 0.05; }
// Let the load settle (cart standing still). Anything that slides off goes back on the dock.
export function loadStep(L) {
  for (let i = 0; i < SUB; i++) stepWorld(L.world, DT / SUB, 0, -G, 0);
  const lost = sweepLost(L.world);
  for (const b of lost) { L.placed = L.placed.filter(p => p !== b); L.queue.unshift(b.type); L.returned++; }
  return lost;
}

// =====================================================================================================
// Phase 2: the drive
// =====================================================================================================
export function startDrive(L) {
  const lane = L.lane, W = L.world;
  for (const b of items(W)) { b.startX = b.x; b.startY = b.y; b.vx = b.vy = b.w = 0; }
  const supp = x => ({ y: roadY(lane, x), vy: 0, acc: 0 });
  return {
    lane, world: W, left: L.queue.slice(), loaded: items(W).map(b => b.type), lost: [],
    s: 0, v: 0, a: 0, t: 0, started: false, done: false, steps: 0,
    back: supp(BACK), front: supp(FRONT), tilt: 0, cartY: roadY(lane, 0), ay: 0, alpha: 0, phase: 0, jolt: 0
  };
}
// One 1/60 s step. hold = the player is pressing (go faster). Returns events for sounds and effects.
export function driveStep(D, hold) {
  const ev = [];
  if (D.done) return ev;
  const lane = D.lane, h = DT / SUB;
  if (hold) D.started = true;
  for (let sub = 0; sub < SUB; sub++) {
    const slope = (roadY(lane, D.s + 0.6) - roadY(lane, D.s - 0.6)) / 1.2;
    let a = (hold ? ACCEL : -DECEL) - G * slope * 0.3;
    const v0 = D.v;
    if (!D.started) D.v = 0;
    else { D.v = clamp(D.v + a * h, D.v >= WALK ? WALK : 0, VMAX); if (!hold && D.v < WALK) D.v = Math.min(WALK, v0 + ACCEL * h); }
    a = (D.v - v0) / h;
    D.s += D.v * h;
    if (D.started) D.t += h;
    // Suspension: each support is sprung to the road under it (the damper works on the relative speed).
    for (const [sp, off] of [[D.back, BACK], [D.front, FRONT]]) {
      const x = D.s + off, ry = roadY(lane, x), rv = (roadY(lane, x + 0.05) - roadY(lane, x - 0.05)) / 0.1 * D.v;
      sp.acc = SPRING * (ry - sp.y) + DAMP * (rv - sp.vy);
      sp.vy += sp.acc * h; sp.y += sp.vy * h;
    }
    const wF = -BACK / BASE; // bed centre sits this far from the back support towards the front
    D.cartY = lerp(D.back.y, D.front.y, wF);
    D.tilt = Math.atan2(D.front.y - D.back.y, BASE);
    D.ay = lerp(D.back.acc, D.front.acc, wF);
    D.alpha = (D.front.acc - D.back.acc) / BASE;
    // A wheel climbing a sharp rise kicks the cart backwards (and forwards on the way down): the road
    // pushes along its own slope. Only the dynamic part counts; the horse handles steady hills.
    const xb = D.s + BACK, sb = (roadY(lane, xb + 0.05) - roadY(lane, xb - 0.05)) / 0.1;
    const kick = clamp(-0.6 * D.back.acc * sb, -25, 25);
    D.a = a + kick;
    // World gravity minus the frame's acceleration, turned into the tilted cart frame.
    const gx = -D.a, gy = -G - D.ay, c = Math.cos(D.tilt), s = Math.sin(D.tilt);
    stepWorld(D.world, h, c * gx + s * gy, -s * gx + c * gy, D.alpha);
    for (const b of sweepLost(D.world)) { D.lost.push(b); b.lostAt = D.s; ev.push({ type: 'lost', body: b }); }
  }
  D.phase += D.v * DT / 2.3; // one trot stride every 2.3 m
  D.steps++;
  const jolt = Math.abs(D.ay) + Math.abs(D.alpha) * 0.8;
  if (jolt > 9 && D.jolt <= 0) { ev.push({ type: 'jolt', strength: Math.min(1, jolt / 30) }); D.jolt = 18; }
  if (D.jolt > 0) D.jolt--;
  if (D.s >= lane.length) { D.done = true; ev.push({ type: 'gate' }); }
  return ev;
}
// Distance to the next feature ahead (for a gentle "bump ahead" hint).
export function nextFeature(lane, s) { return lane.feats.find(f => f.type !== 'hill' && f.s + f.len > s) || null; }

// =====================================================================================================
// Scoring and rewards
// =====================================================================================================
export const TIDY_EACH = 3, ALL_SAFE = 15, SPEED_MAX = 30;
const upright = b => { const m = ((b.a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); return Math.min(m, Math.PI / 2 - m) < 0.14; };
export function scoreDelivery(D) {
  const lane = D.lane, on = items(D.world);
  const value = on.reduce((s, b) => s + ITEMS[b.type].value, 0);
  const tidyItems = on.filter(b => upright(b) && Math.abs(b.x - b.startX) < 0.3).length;
  const allSafe = on.length > 0 && on.length === lane.items.length;
  const tidy = tidyItems * TIDY_EACH + (allSafe ? ALL_SAFE : 0);
  const speed = on.length ? Math.round(SPEED_MAX * clamp((lane.slow - D.t) / (lane.slow - lane.par), 0, 1)) : 0;
  const max = maxScore(lane), total = value + tidy + speed, frac = max ? total / max : 0;
  return { tier: lane.tier, value, tidy, tidyItems, allSafe, speed, total, max, frac, stars: starsFor(frac, on.length), delivered: on.map(b => b.type), lost: D.lost.map(b => b.type), left: D.left.slice(), time: D.t };
}
export function maxScore(lane) { return lane.items.reduce((s, t) => s + ITEMS[t].value + TIDY_EACH, 0) + ALL_SAFE + SPEED_MAX; }
export function starsFor(frac, delivered = 1) { if (!delivered) return 0; return frac >= 0.85 ? 3 : frac >= 0.62 ? 2 : frac >= 0.35 ? 1 : 0; }

// Trotties (~10 a minute of good play): 10 for any delivery, up to 18 / 26 / 35 by tier (longer lanes take
// longer to load and drive). The daily lane pays 40 the first time each day.
export const REWARD_CAP = [18, 26, 35];
export function rewardFor({ score, daily = false, dailyClaimed = false }) {
  if (!score || !score.delivered.length) return { coins: 0, lines: [] };
  if (daily && !dailyClaimed) return { coins: 40, lines: ["Today's lane delivered · 40 🪙"] };
  const cap = REWARD_CAP[clamp((score.tier || 3) - 1, 0, 2)];
  const coins = 10 + Math.round((cap - 10) * clamp(score.frac / 0.9, 0, 1));
  return { coins, lines: [`Delivery · ${coins} 🪙`] };
}
