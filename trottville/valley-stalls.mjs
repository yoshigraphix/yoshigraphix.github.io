// Stall Tactics: a logic puzzle in the stable block. Pure rules, generator, solver and scoring (no DOM),
// so node can test it.
//
// A barn is one row of stalls (3 or 4) or two rows facing an aisle (2×3, 2×4). The feed room closes one
// end of the aisle (it touches the end stall of every row); the door is at the other end. Some stalls have
// a window. Every horse goes in exactly one stall, and each horse card carries its wishes ("rules").
//
// Puzzles come from a seed. The generator picks a secret stable plan, then adds true facts about it
// (weighted by kind) until the solver finds exactly ONE plan, then throws away every fact that isn't
// needed. So every level has one answer and no spare rules. GEN is part of every seed: change the
// generator and bump GEN, or saved progress would point at different puzzles.

export const GEN = 1;

// ---------- Random ----------
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let s = (seed | 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (R, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- Horses (original names and looks) ----------
// coat/mane colours, a face marking, and two flags the portrait uses: foal (small and round) and dapple.
export const HORSES = [
  { name: 'Atlas',   coat: '#8a4b2a', mane: '#2b211c', mark: 'blaze' },
  { name: 'Pip',     coat: '#e9c36f', mane: '#fff3d1', mark: 'star', foal: true },
  { name: 'Clover',  coat: '#c8642e', mane: '#8f3f17', mark: 'blaze' },
  { name: 'Maple',   coat: '#a3542a', mane: '#5a2a12', mark: 'snip' },
  { name: 'Biscuit', coat: '#d8a463', mane: '#6b4a2a', mark: 'star' },
  { name: 'Juniper', coat: '#cfd4d8', mane: '#8d959c', mark: '', dapple: true },
  { name: 'Pepper',  coat: '#3d3431', mane: '#1d1715', mark: 'star' },
  { name: 'Willow',  coat: '#f2ece0', mane: '#d9cdb6', mark: '' },
  { name: 'Rosie',   coat: '#b9776a', mane: '#6d3b33', mark: 'blaze', foal: true },
  { name: 'Bramble', coat: '#6e4a33', mane: '#2e2019', mark: 'snip' },
  { name: 'Ziggy',   coat: '#b8bec4', mane: '#4f565c', mark: 'blaze', dapple: true },
  { name: 'Nutmeg',  coat: '#94572f', mane: '#f1dcae', mark: 'star' },
  { name: 'Comet',   coat: '#2f2a2a', mane: '#141010', mark: 'blaze' },
  { name: 'Daisy',   coat: '#f0d58c', mane: '#fffaf0', mark: 'blaze', foal: true },
  { name: 'Fudge',   coat: '#7a4a2e', mane: '#3a2216', mark: '' },
  { name: 'Waffles', coat: '#c9a46c', mane: '#3b2b1a', mark: 'snip' },
  { name: 'Poppy',   coat: '#d9774a', mane: '#f6e3c3', mark: 'star' },
  { name: 'Sprout',  coat: '#a9b0a4', mane: '#5d6358', mark: 'star', foal: true, dapple: true },
  { name: 'Toffee',  coat: '#b97a3d', mane: '#4d2c12', mark: 'blaze' },
  { name: 'Mabel',   coat: '#57433a', mane: '#e8e1d4', mark: 'snip' }
];

// ---------- Barn geometry ----------
// stalls are numbered row by row, left to right. feedSide 'L' puts the feed room on the left end and the
// door on the right (and the other way round for 'R').
export function makeLayout({ rows = 1, cols = 3, feedSide = 'L', windows = [] } = {}) {
  const stalls = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) stalls.push({ i: stalls.length, row: r, col: c, window: false });
  for (const w of windows) if (stalls[w]) stalls[w].window = true;
  return { rows, cols, feedSide, stalls };
}
const S = (L, s) => L.stalls[s];
export const isWindow = (L, s) => S(L, s).window;
export const byFeed = (L, s) => S(L, s).col === (L.feedSide === 'L' ? 0 : L.cols - 1);
export const isEnd = (L, s) => S(L, s).col === 0 || S(L, s).col === L.cols - 1;
export const adjacent = (L, a, b) => S(L, a).row === S(L, b).row && Math.abs(S(L, a).col - S(L, b).col) === 1;
export const facing = (L, a, b) => S(L, a).col === S(L, b).col && S(L, a).row !== S(L, b).row;
export const sameSide = (L, a, b) => S(L, a).row === S(L, b).row;
export const doorDist = (L, s) => (L.feedSide === 'L' ? L.cols - 1 - S(L, s).col : S(L, s).col);

// ---------- Rule kinds ----------
// A rule is {k, a} or {k, a, b} (horse indexes). It belongs to horse a's card.
export const KINDS = {
  window:    { pair: false, test: (L, a) => isWindow(L, a),          chip: () => 'Window',            text: 'wants a window stall' },
  nowindow:  { pair: false, test: (L, a) => !isWindow(L, a),         chip: () => 'No window',         text: 'can\'t have a window' },
  feed:      { pair: false, test: (L, a) => byFeed(L, a),            chip: () => 'By feed room',      text: 'wants to be by the feed room' },
  nofeed:    { pair: false, test: (L, a) => !byFeed(L, a),           chip: () => 'Not by feed',       text: 'can\'t be by the feed room' },
  end:       { pair: false, test: (L, a) => isEnd(L, a),             chip: () => 'End stall',         text: 'wants an end stall' },
  next:      { pair: true, sym: true,  test: (L, a, b) => adjacent(L, a, b),  chip: b => `Next to ${b}`,        text: 'must be next to' },
  notnext:   { pair: true, sym: true,  test: (L, a, b) => !adjacent(L, a, b), chip: b => `Not next to ${b}`,    text: 'can\'t be next to' },
  across:    { pair: true, sym: true,  test: (L, a, b) => facing(L, a, b),    chip: b => `Across from ${b}`,    text: 'must be across the aisle from' },
  notacross: { pair: true, sym: true,  test: (L, a, b) => !facing(L, a, b),   chip: b => `Not across from ${b}`, text: 'can\'t be across the aisle from' },
  side:      { pair: true, sym: true,  test: (L, a, b) => sameSide(L, a, b),  chip: b => `Same side as ${b}`,   text: 'must be on the same side as' },
  door:      { pair: true, sym: false, test: (L, a, b) => doorDist(L, a) < doorDist(L, b), chip: b => `Nearer door than ${b}`, text: 'must be nearer the door than' }
};
export const ROW_KINDS = ['window', 'nowindow', 'feed', 'nofeed', 'end', 'next', 'notnext', 'door'];
export const AISLE_KINDS = ['across', 'notacross', 'side'];

// Friendly reasons (shown when a rule chip is tapped). Picked by a hash, so they never change.
const WHY = {
  window: ['{a} loves watching the sky.', '{a} likes to see who is coming.'],
  nowindow: ['{a} hates draughts.', 'The sun keeps {a} awake.'],
  feed: ['{a} likes to smell breakfast coming.', '{a} wants to be first for supper.'],
  nofeed: ['{a} gets greedy by the feed room.', '{a} tries to raid the oats.'],
  end: ['{a} likes a quiet corner.', '{a} is shy and likes the end.'],
  next: ['{a} and {b} are best buddies.', '{a} gets lonely without {b} close by.'],
  notnext: ['{a} kicks the wall when {b} is close.', '{a} and {b} squabble over hay.'],
  across: ['{a} likes to see {b} across the aisle.', '{a} whinnies for {b} all night.'],
  notacross: ['{a} and {b} pull faces at each other.', '{a} and {b} have a staring contest.'],
  side: ['{a} and {b} like the same side of the barn.', '{a} follows {b} everywhere.'],
  door: ['{a} goes out first in the morning.', '{a} is always first to the field.']
};

// true / false, or null while a horse in the rule isn't in a stall yet. place[h] = stall or -1.
export function checkRule(L, r, place) {
  const a = place[r.a];
  if (a == null || a < 0) return null;
  const K = KINDS[r.k];
  if (!K.pair) return K.test(L, a);
  const b = place[r.b];
  if (b == null || b < 0) return null;
  return K.test(L, a, b);
}
// Live board state: which rules hold, which are broken, and which stalls to outline in red.
export function boardState(P, place) {
  const ok = [], bad = [], open = [], badStalls = new Set();
  P.rules.forEach((r, i) => {
    const v = checkRule(P.layout, r, place);
    if (v === true) ok.push(i);
    else if (v === false) { bad.push(i); badStalls.add(place[r.a]); if (KINDS[r.k].pair) badStalls.add(place[r.b]); }
    else open.push(i);
  });
  const placed = place.filter(s => s >= 0).length;
  return { ok, bad, open, badStalls: [...badStalls], placed, solved: placed === P.horses.length && !bad.length && !open.length };
}
export function ruleChip(P, r) { return KINDS[r.k].chip(KINDS[r.k].pair ? P.horses[r.b].name : ''); }
export function ruleText(P, r) { const K = KINDS[r.k]; return `${P.horses[r.a].name} ${K.text}${K.pair ? ' ' + P.horses[r.b].name : ''}.`; }
export function ruleWhy(P, r) {
  const list = WHY[r.k], a = P.horses[r.a].name, b = KINDS[r.k].pair ? P.horses[r.b].name : '';
  return list[hashStr(a + r.k + b) % list.length].replace('{a}', a).replace('{b}', b);
}

// ---------- Solver ----------
// Backtracking, horses with the most rules first. Stops after `cap` plans. Returns {count, first}.
export function solve(P, cap = 2) {
  const L = P.layout, n = P.horses.length, ns = L.stalls.length;
  const mine = Array.from({ length: n }, () => []);
  for (const r of P.rules) { mine[r.a].push(r); if (KINDS[r.k].pair) mine[r.b].push(r); }
  const order = [...Array(n).keys()].sort((x, y) => mine[y].length - mine[x].length || x - y);
  const place = Array(n).fill(-1), used = Array(ns).fill(false);
  let count = 0, first = null;
  (function rec(k) {
    if (k === n) { count++; if (!first) first = place.slice(); return; }
    const h = order[k];
    for (let s = 0; s < ns && count < cap; s++) {
      if (used[s]) continue;
      place[h] = s;
      let ok = true;
      for (const r of mine[h]) if (checkRule(L, r, place) === false) { ok = false; break; }
      if (ok) { used[s] = true; rec(k + 1); used[s] = false; }
      place[h] = -1;
    }
  })(0);
  return { count, first };
}
export const isUnique = P => solve(P, 2).count === 1;

// ---------- Generator ----------
// spec: {seed (string), rows, cols, kinds, intro?, weights?, rules:[min,max], windows:[min,max]}
const BASE_W = { window: 3, nowindow: 1.2, feed: 2, nofeed: 1.4, end: 1.4, next: 3, notnext: 2, across: 3, notacross: 1.6, side: 2, door: 2 };

function facts(L, kinds, target, n) {
  const out = [];
  for (let a = 0; a < n; a++) for (const k of kinds) if (!KINDS[k].pair && KINDS[k].test(L, target[a])) out.push({ k, a });
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    if (a === b) continue;
    for (const k of kinds) {
      const K = KINDS[k];
      if (!K.pair || (K.sym && b < a)) continue;
      if (K.test(L, target[a], target[b])) out.push({ k, a, b });
    }
  }
  return out;
}
const owned = (rules, h) => rules.filter(r => r.a === h).length;

export function generate(spec) {
  const { rows = 1, cols = 3, kinds, intro = null, rules: [minR, maxR] = [1, 99], windows: [minW, maxW] = [1, 2], maxPerHorse = 2 } = spec;
  const W = { ...BASE_W, ...(spec.weights || {}) };
  const maxKind = { door: 3, side: 3, ...(spec.maxKind || {}) };
  const n = rows * cols;
  for (let attempt = 0; attempt < 400; attempt++) {
    const R = rng(hashStr(`${spec.seed}#${attempt}`));
    const feedSide = R() < 0.5 ? 'L' : 'R';
    const nw = minW + Math.floor(R() * (maxW - minW + 1));
    const windows = shuffle(R, [...Array(n).keys()]).slice(0, nw).sort((x, y) => x - y);
    const L = makeLayout({ rows, cols, feedSide, windows });
    const horses = shuffle(R, HORSES.map((h, i) => ({ ...h, id: i }))).slice(0, n);
    const target = shuffle(R, [...Array(n).keys()]);
    // Efraimidis–Spirakis weighted shuffle of every true fact.
    const pool = facts(L, kinds, target, n).map(f => ({ f, key: Math.log(R() || 1e-9) / (W[f.k] || 1) })).sort((x, y) => y.key - x.key).map(x => x.f);
    const P = { layout: L, horses, rules: [] };
    let introRule = null;
    if (intro) { introRule = pool.find(f => f.k === intro); if (!introRule) continue; P.rules.push(introRule); }
    let unique = false;
    for (const f of pool) {
      if (f === introRule) continue;
      const g = { ...f };
      if (KINDS[g.k].pair && KINDS[g.k].sym && owned(P.rules, g.b) < owned(P.rules, g.a)) [g.a, g.b] = [g.b, g.a];
      if (owned(P.rules, g.a) >= maxPerHorse) continue;
      if (P.rules.filter(r => r.k === g.k).length >= (maxKind[g.k] ?? 99)) continue;
      P.rules.push(g);
      if (solve(P, 2).count === 1) { unique = true; break; }
    }
    if (!unique) continue;
    // Prune: drop every rule the answer doesn't need (the new rule kind always stays).
    for (const r of shuffle(R, P.rules.slice())) {
      if (r === introRule) continue;
      const without = { ...P, rules: P.rules.filter(x => x !== r) };
      if (solve(without, 2).count === 1) P.rules = without.rules;
    }
    // The new rule kind must pull its weight too, or the lesson teaches nothing.
    if (introRule && solve({ ...P, rules: P.rules.filter(x => x !== introRule) }, 2).count === 1) continue;
    if (P.rules.length < minR || P.rules.length > maxR) continue;
    // Order the rules by horse so cards read top to bottom, and keep the plan.
    P.rules.sort((x, y) => x.a - y.a || Object.keys(KINDS).indexOf(x.k) - Object.keys(KINDS).indexOf(y.k));
    const sol = solve(P, 2);
    return { ...P, solution: sol.first, seed: spec.seed, attempt };
  }
  throw new Error('Could not build a puzzle for ' + spec.seed);
}

// ---------- Levels ----------
export const TIERS = [
  { id: 1, name: 'Pony Row', blurb: 'One row of stalls', reward: 10 },
  { id: 2, name: 'Big Barn', blurb: 'Two rows and an aisle', reward: 20 },
  { id: 3, name: 'Show Barn', blurb: 'Eight fussy horses', reward: 30 }
];
// Each early level brings in one new rule kind (intro) and the first levels only use a few kinds,
// so the game teaches itself.
const T1 = ['window', 'next', 'notnext', 'nofeed', 'end', 'nowindow', 'feed'];
export const LEVELS = (() => {
  const out = [];
  const add = (o) => out.push({ id: out.length + 1, ...o });
  // Tier 1: rows of 3, then 4.
  add({ tier: 1, rows: 1, cols: 3, kinds: ['window', 'next'], intro: 'window', rules: [2, 3], windows: [1, 1] });
  add({ tier: 1, rows: 1, cols: 3, kinds: ['window', 'next', 'notnext'], intro: 'notnext', rules: [2, 3], windows: [1, 1] });
  add({ tier: 1, rows: 1, cols: 3, kinds: ['window', 'next', 'notnext', 'nofeed'], intro: 'nofeed', rules: [2, 3], windows: [1, 1] });
  add({ tier: 1, rows: 1, cols: 3, kinds: ['window', 'next', 'notnext', 'nofeed', 'end'], intro: 'end', rules: [2, 3], windows: [1, 2] });
  add({ tier: 1, rows: 1, cols: 4, kinds: ['window', 'next', 'notnext', 'nofeed', 'end'], intro: 'next', rules: [3, 4], windows: [1, 2] });
  add({ tier: 1, rows: 1, cols: 4, kinds: ['window', 'next', 'notnext', 'nofeed', 'end', 'nowindow'], intro: 'nowindow', rules: [3, 5], windows: [2, 2] });
  add({ tier: 1, rows: 1, cols: 4, kinds: T1, intro: 'feed', rules: [3, 5], windows: [1, 2] });
  for (let i = 0; i < 3; i++) add({ tier: 1, rows: 1, cols: 4, kinds: T1, rules: [4, 6], windows: [1, 2], weights: { window: 1.5, next: 2 } });
  // Tier 2: two rows of 3 facing an aisle.
  const T2 = [...T1, 'across', 'notacross', 'side'];
  add({ tier: 2, rows: 2, cols: 3, kinds: [...T1, 'across'], intro: 'across', rules: [4, 6], windows: [2, 3] });
  add({ tier: 2, rows: 2, cols: 3, kinds: [...T1, 'across', 'side'], intro: 'side', rules: [4, 7], windows: [2, 3] });
  add({ tier: 2, rows: 2, cols: 3, kinds: T2, intro: 'notacross', rules: [4, 7], windows: [2, 3] });
  for (let i = 0; i < 7; i++) add({ tier: 2, rows: 2, cols: 3, kinds: T2, rules: [5, 8], windows: [2, 3], weights: { window: 1.5, across: 2, feed: 1 } });
  // Tier 3: two rows of 4, every kind, fewer give-away rules.
  const T3 = [...T2, 'door'];
  add({ tier: 3, rows: 2, cols: 4, kinds: T3, intro: 'door', rules: [6, 11], windows: [2, 4] });
  for (let i = 0; i < 9; i++) add({ tier: 3, rows: 2, cols: 4, kinds: T3, rules: [7, 12], windows: [2, 4], weights: { window: 1.2, feed: 1, across: 1.6, next: 2, notnext: 2.4, notacross: 2, door: 1.4 } });
  return out;
})();

const cache = new Map();
export function levelPuzzle(id) {
  const key = 'L' + id;
  if (cache.has(key)) return cache.get(key);
  const spec = LEVELS[id - 1];
  if (!spec) throw new Error('No level ' + id);
  const P = { ...generate({ ...spec, seed: `stalls/${GEN}/level/${id}` }), id: 'L' + id, level: id, tier: spec.tier, intro: spec.intro || null };
  cache.set(key, P);
  return P;
}

// ---------- Daily stall ----------
// Seeded by the calendar date, so everyone gets the same barn that day. Weekends get the big 2×4 barn.
export function dateKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function dailySpec(date) {
  const day = new Date(date + 'T12:00:00Z').getUTCDay();
  const big = day === 0 || day === 6;
  const kinds = [...T1, 'across', 'notacross', 'side', ...(big ? ['door'] : [])];
  return big ? { tier: 3, rows: 2, cols: 4, kinds, rules: [7, 12], windows: [2, 4], weights: { notnext: 2.4, door: 1.4, notacross: 2 } }
             : { tier: 2, rows: 2, cols: 3, kinds, rules: [5, 8], windows: [2, 3] };
}
export function dailyPuzzle(date) {
  const key = 'D' + date;
  if (cache.has(key)) return cache.get(key);
  const spec = dailySpec(date);
  const P = { ...generate({ ...spec, seed: `stalls/${GEN}/daily/${date}` }), id: 'D' + date, daily: date, tier: spec.tier, intro: null };
  cache.set(key, P);
  return P;
}

// ---------- Hints ----------
// One correct horse into its stall: prefer horses that are wrong or missing, the most constrained first.
export function hintMove(P, place) {
  const wrong = P.horses.map((_, h) => h).filter(h => place[h] !== P.solution[h]);
  if (!wrong.length) return null;
  const weight = h => P.rules.filter(r => r.a === h || r.b === h).length;
  wrong.sort((x, y) => (place[y] >= 0) - (place[x] >= 0) || weight(y) - weight(x) || x - y);
  // Fix a misplaced horse first if any horse is sitting somewhere wrong (it is the most useful nudge).
  const h = wrong.find(x => place[x] >= 0) ?? wrong[0];
  return { horse: h, stall: P.solution[h] };
}
// Apply a move: horse h to stall s (or -1 = back to the tray). Whoever was in s swaps to h's old stall.
export function moveHorse(place, h, s) {
  const next = place.slice(), from = next[h];
  if (s >= 0) { const other = next.indexOf(s); if (other >= 0 && other !== h) next[other] = from; }
  next[h] = s;
  return next;
}

// ---------- Scoring ----------
export const REWARD = { tiers: [10, 20, 30], daily: 40, dayCap: 300 };
export const starsFor = hints => (hints <= 0 ? 3 : hints === 1 ? 2 : 1);
export function emptyRecord() { return { v: 1, solved: {}, daily: {}, paid: { date: '', ids: [], coins: 0 } }; }
export function normalRecord(r) {
  const e = emptyRecord();
  if (!r || typeof r !== 'object' || r.v !== 1) return e;
  return { v: 1, solved: { ...(r.solved || {}) }, daily: { ...(r.daily || {}) }, paid: { ...e.paid, ...(r.paid || {}), ids: [...(r.paid?.ids || [])] } };
}
export const unlocked = (rec, id) => id === 1 || !!rec.solved['L' + (id - 1)];
export function dailyStreak(rec, today) {
  let n = 0;
  const d = new Date(today + 'T12:00:00Z');
  if (!rec.daily[today]) d.setUTCDate(d.getUTCDate() - 1); // today not done yet: count up to yesterday
  for (;;) { const k = d.toISOString().slice(0, 10); if (!rec.daily[k]) break; n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}
// Records a solve and works out the Trotties. Pure: returns {record, coins, lines, stars, firstSolve}.
// A puzzle pays once per day (a level solved again tomorrow pays again), and the game pays at most
// REWARD.dayCap Trotties a day in total.
export function recordSolve(record, { id, tier, daily = false, hints = 0, ms = 0, today }) {
  const rec = normalRecord(record);
  if (rec.paid.date !== today) rec.paid = { date: today, ids: [], coins: 0 };
  const stars = starsFor(hints);
  const prev = daily ? rec.daily[daily] : rec.solved[id];
  const firstSolve = !prev;
  const best = { stars: Math.max(stars, prev?.stars || 0), ms: prev?.ms ? Math.min(prev.ms, ms || prev.ms) : ms, hints: Math.min(hints, prev?.hints ?? hints) };
  if (daily) rec.daily[daily] = best; else rec.solved[id] = best;
  const lines = [];
  let coins = 0;
  const base = daily ? REWARD.daily : (REWARD.tiers[(tier || 1) - 1] || REWARD.tiers[0]);
  const label = daily ? 'Daily stall' : `Level ${String(id).replace(/^L/, '')}`;
  if (daily && daily !== today) lines.push(`${label} from another day · no Trotties`);
  else if (rec.paid.ids.includes(id)) lines.push(`${label} · already paid today`);
  else {
    coins = Math.max(0, Math.min(base, REWARD.dayCap - rec.paid.coins));
    rec.paid.ids.push(id);
    rec.paid.coins += coins;
    lines.push(coins < base ? `${label} · ${coins} 🪙 (daily limit reached)` : `${label} solved · ${coins} 🪙`);
  }
  return { record: rec, coins, lines, stars, firstSolve };
}
