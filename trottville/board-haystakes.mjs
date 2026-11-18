// Haystakes — a push-your-luck horse race for 2–4 riders. Pure rules: no DOM, so node can test it.
//
// The track is an oval with four lanes. Straights have the same number of spaces in every lane, but the
// bends get longer the further out you run (8 / 9 / 10 / 11 spaces), so the rail is the short way round —
// and the crowded one: a rider can never pass through another rider in the same lane.
//
// A turn: (maybe play one card) → Ease up OR roll the hoof die. After each roll you may stop or PUSH and
// roll again; every push costs more stamina (1, 2, 3 …). A stumble face ends the turn: keep half.
// Then pick a lane (one lane over is free, two lanes costs 1 stamina) and trot that many spaces.
// Each round the rider at the back goes first.

export const LANES = 4;
export const STRAIGHT = 7;
export const BEND = [8, 9, 10, 11];
export const MAX_STA = 10;
export const START_STA = 10;
export const HAND_MAX = 3;
export const START_HAND = 2;
export const EASE_STA = 3;
export const FACES = [1, 2, 3, 4, 5, 0]; // 0 = stumble
export const TURN_CAP = 900;              // safety net: a race is ranked by position if it ever runs this long

export const CARDS = {
  wind:  { short: '+4 stamina', name: 'Second Wind', icon: '🍃', text: '+4 stamina now.', when: ['start', 'rolled'] },
  spurt: { short: '+2 to your total', name: 'Spurt', icon: '⚡', text: '+2 spaces on this turn’s total.', when: ['rolled'] },
  lucky: { short: 'Roll 2 dice, keep best', name: 'Lucky Shoe', icon: '🍀', text: 'Your next roll uses two dice — keep the better one.', when: ['start', 'rolled'] },
  sugar: { short: 'Saves a stumble', name: 'Sugar Cube', icon: '🍬', text: 'When you stumble, eat it instead and keep your total.', when: [] },
  spook: { short: 'Rider ahead −3 stamina', name: 'Spook', icon: '👻', text: 'The rider just ahead of you loses 3 stamina (if you lead: the one behind).', when: ['start', 'rolled'] }
};
const DECK = { wind: 7, spurt: 6, lucky: 6, sugar: 5, spook: 6 };

export const PERSONAS = {
  cautious: { label: 'Cautious', blurb: 'Banks small rolls, keeps her breath, loves a slipstream.', names: [['Nell', 'Buttercup'], ['Hazel', 'Pudding'], ['Pip', 'Marigold']] },
  bold:     { label: 'Bold', blurb: 'Pushes the die hard and dares you to keep up.', names: [['Rory', 'Comet'], ['Blaze', 'Rocket'], ['Jet', 'Thunder']] },
  sly:      { label: 'Sly', blurb: 'Spooks the leader, drafts behind you, parks in your lane.', names: [['Vix', 'Thistle'], ['Sage', 'Nettle'], ['Wren', 'Bramble']] }
};

// ---------- Geometry (track parameter t in [0,1) per lap) ----------
export const laneLen = l => 2 * STRAIGHT + 2 * BEND[l];
export function cellT(l, i) {
  const b = BEND[l];
  if (i < STRAIGHT) return (i / STRAIGHT) * 0.25;
  if (i < STRAIGHT + b) return 0.25 + ((i - STRAIGHT) / b) * 0.25;
  if (i < 2 * STRAIGHT + b) return 0.5 + ((i - STRAIGHT - b) / STRAIGHT) * 0.25;
  return 0.75 + ((i - 2 * STRAIGHT - b) / b) * 0.25;
}
export const isBend = (l, i) => (i >= STRAIGHT && i < STRAIGHT + BEND[l]) || i >= 2 * STRAIGHT + BEND[l];
// The space in lane l level with track position t (closest; ties go to the space behind).
export function mapCell(l, t) {
  let best = 0, bestD = Infinity, lapDelta = 0;
  for (let i = 0; i < laneLen(l); i++) {
    const ti = cellT(l, i);
    let d = ti - t, ld = 0;
    if (d > 0.5) { d -= 1; ld = -1; } else if (d < -0.5) { d += 1; ld = 1; }
    const ad = Math.abs(d) - (d <= 0 ? 1e-9 : 0);
    if (ad < bestD) { bestD = ad; best = i; lapDelta = ld; }
  }
  return { cell: best, lapDelta };
}

// ---------- Random ----------
export function rnd(s) {
  s.seed = (s.seed + 0x6D2B79F5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (s, arr) => arr[Math.floor(rnd(s) * arr.length)];
function shuffle(s, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- Setup ----------
// seats: [{name, horse, kind:'human'|'bot', persona, color}]
export function createGame({ seats, laps = 3, seed = 1 } = {}) {
  if (!Array.isArray(seats) || seats.length < 2 || seats.length > 4) throw new Error('Haystakes needs 2–4 riders');
  const s = { seed: seed | 0 || 1, laps: Math.max(1, laps | 0), deck: [], discard: [], riders: [], order: [], turnPos: 0,
    round: 0, turnCount: 0, finishOrder: [], phase: 'start', turn: null, over: false, startEvents: [] };
  for (const [k, n] of Object.entries(DECK)) for (let i = 0; i < n; i++) s.deck.push(k);
  shuffle(s, s.deck);
  const lanes = shuffle(s, [0, 1, 2, 3]);           // the draw for the gate
  s.riders = seats.map((seat, i) => ({ id: i, name: seat.name || `Rider ${i + 1}`, horse: seat.horse || '', kind: seat.kind === 'bot' ? 'bot' : 'human',
    persona: seat.kind === 'bot' ? (PERSONAS[seat.persona] ? seat.persona : 'cautious') : null, color: seat.color || '#888',
    lane: lanes[i], cell: 0, lap: 0, sta: START_STA, hand: [], finished: false, place: null, drafts: 0, stumbles: 0 }));
  for (const r of s.riders) for (let i = 0; i < START_HAND; i++) draw(s, r);
  newRound(s);
  s.startEvents = beginTurn(s);
  return s;
}

function draw(s, r) {
  if (r.hand.length >= HAND_MAX) return null;
  if (!s.deck.length) { s.deck = shuffle(s, s.discard); s.discard = []; }
  if (!s.deck.length) return null;
  const c = s.deck.pop();
  r.hand.push(c);
  return c;
}

// ---------- Standings ----------
export function progress(s, r) { return r.finished ? 1e6 - r.place : r.lap + cellT(r.lane, r.cell); }
export function standings(s) {
  return [...s.riders].sort((a, b) => progress(s, b) - progress(s, a) || a.lane - b.lane || a.id - b.id);
}
export const active = s => s.turn ? s.riders[s.turn.rider] : null;
export const occupant = (s, lane, cell, except = -1) => s.riders.findIndex(r => !r.finished && r.id !== except && r.lane === lane && r.cell === cell);
export const pushCost = s => (s.turn ? s.turn.pushes + 1 : 1);

function newRound(s) {
  s.round++;
  // Back of the field moves first; on a tie the outside lane (worse draw) goes first.
  s.order = s.riders.filter(r => !r.finished).sort((a, b) => progress(s, a) - progress(s, b) || b.lane - a.lane || a.id - b.id).map(r => r.id);
  s.turnPos = 0;
}

function beginTurn(s) {
  const ev = [];
  while (s.turnPos < s.order.length && s.riders[s.order[s.turnPos]].finished) s.turnPos++;
  if (s.turnPos >= s.order.length) newRound(s);
  const r = s.riders[s.order[s.turnPos]];
  s.turn = { rider: r.id, total: 0, pushes: 0, card: null, lucky: false, budget: 0, stumbled: false, eased: false, rolls: [] };
  s.phase = 'start';
  ev.push({ t: 'turn', rider: r.id });
  const field = s.riders.filter(x => !x.finished);
  if (field.length > 1 && standings(s).filter(x => !x.finished).at(-1).id === r.id) {
    const c = draw(s, r);
    if (c) ev.push({ t: 'draw', rider: r.id, card: c, why: 'crowd' });
  }
  return ev;
}

// ---------- Legal actions ----------
export function legalActions(s) {
  if (s.over || !s.turn) return [];
  const r = active(s), out = [];
  const cardsFor = phase => {
    if (s.turn.card) return;
    const seen = new Set();
    for (const c of r.hand) if (!seen.has(c) && CARDS[c].when.includes(phase)) { seen.add(c); out.push({ type: 'card', card: c }); }
  };
  if (s.phase === 'start') {
    cardsFor('start');
    out.push({ type: 'ease' }, { type: 'roll' });
  } else if (s.phase === 'rolled') {
    cardsFor('rolled');
    if (r.sta >= pushCost(s)) out.push({ type: 'push' });
    out.push({ type: 'stop' });
  } else if (s.phase === 'stumble') {
    if (!s.turn.card && r.hand.includes('sugar')) out.push({ type: 'sugar' });
    out.push({ type: 'accept' });
  } else if (s.phase === 'lane') {
    for (let l = 0; l < LANES; l++) if (previewLane(s, r.id, l).ok) out.push({ type: 'lane', lane: l });
  }
  return out;
}
export const isLegal = (s, a) => legalActions(s).some(x => x.type === a.type && x.card === a.card && x.lane === a.lane);

// Where would rider ri end up running `budget` spaces in lane `lane`?
export function previewLane(s, ri, lane, budget = s.turn ? s.turn.budget : 0) {
  const r = s.riders[ri], dl = Math.abs(lane - r.lane);
  if (lane < 0 || lane >= LANES || dl > 2) return { ok: false, why: 'far' };
  const cost = dl === 2 ? 1 : 0;
  if (cost > r.sta) return { ok: false, why: 'tired' };
  let cell = r.cell, lap = r.lap;
  if (lane !== r.lane) { const m = mapCell(lane, cellT(r.lane, r.cell)); cell = m.cell; lap += m.lapDelta; }
  if (occupant(s, lane, cell, ri) >= 0) return { ok: false, why: 'blocked' };
  const path = [{ lane, cell, lap }];
  let steps = budget, blocked = false, finished = false, laps = 0;
  const n = laneLen(lane);
  while (steps > 0) {
    let nc = cell + 1, nl = lap;
    if (nc >= n) { nc = 0; nl++; }
    if (nl >= s.laps) { finished = true; path.push({ lane, cell: nc, lap: nl }); cell = nc; lap = nl; break; }
    if (occupant(s, lane, nc, ri) >= 0) { blocked = true; break; }
    if (nl > lap) laps++;
    cell = nc; lap = nl; steps--;
    path.push({ lane, cell, lap });
  }
  const draft = !finished && occupant(s, lane, (cell + 1) % n, ri) >= 0;
  const gain = finished ? Infinity : (lap + cellT(lane, cell)) - (r.lap + cellT(r.lane, r.cell));
  return { ok: true, lane, cost, path, end: { lane, cell, lap }, blocked, finished, draft, gain, moved: path.length - 1, lapCross: laps };
}

// ---------- Apply ----------
function rollFace(s) { return pick(s, FACES); }

export function applyAction(s, a) {
  if (!isLegal(s, a)) throw new Error('Illegal action ' + JSON.stringify(a) + ' in phase ' + s.phase);
  const r = active(s), t = s.turn, ev = [];
  switch (a.type) {
    case 'card': {
      r.hand.splice(r.hand.indexOf(a.card), 1); s.discard.push(a.card); t.card = a.card;
      const e = { t: 'card', rider: r.id, card: a.card };
      if (a.card === 'wind') { const b = r.sta; r.sta = Math.min(MAX_STA, r.sta + 4); e.gain = r.sta - b; }
      if (a.card === 'spurt') { t.total += 2; e.total = t.total; }
      if (a.card === 'lucky') t.lucky = true;
      if (a.card === 'spook') {
        const field = standings(s).filter(x => !x.finished), i = field.findIndex(x => x.id === r.id);
        const target = i > 0 ? field[i - 1] : field[i + 1];
        if (target) { const b = target.sta; target.sta = Math.max(0, target.sta - 3); e.target = target.id; e.loss = b - target.sta; }
      }
      ev.push(e);
      break;
    }
    case 'ease': {
      const b = r.sta; r.sta = Math.min(MAX_STA, r.sta + EASE_STA);
      t.eased = true; t.budget = 1; s.phase = 'lane';
      ev.push({ t: 'ease', rider: r.id, gain: r.sta - b });
      const c = draw(s, r); if (c) ev.push({ t: 'draw', rider: r.id, card: c, why: 'ease' });
      break;
    }
    case 'push':
      r.sta -= pushCost(s); t.pushes++;
      ev.push({ t: 'push', rider: r.id, pushes: t.pushes, sta: r.sta });
      // fall through to roll
    case 'roll': {
      let face = rollFace(s), dice = [face];
      if (t.lucky) { const f2 = rollFace(s); dice = [face, f2]; face = (face === 0 || f2 === 0) ? Math.max(face, f2) : Math.max(face, f2); t.lucky = false; }
      t.rolls.push(face);
      ev.push({ t: 'roll', rider: r.id, face, dice });
      if (face === 0) {
        r.stumbles++;
        if (!t.card && r.hand.includes('sugar')) { s.phase = 'stumble'; ev.push({ t: 'stumble', rider: r.id, canSugar: true }); }
        else ev.push(...stumble(s));
      } else { t.total += face; s.phase = 'rolled'; }
      break;
    }
    case 'sugar':
      r.hand.splice(r.hand.indexOf('sugar'), 1); s.discard.push('sugar'); t.card = 'sugar';
      s.phase = t.total > 0 ? 'rolled' : 'start';
      ev.push({ t: 'card', rider: r.id, card: 'sugar', total: t.total });
      break;
    case 'accept':
      ev.push(...stumble(s));
      break;
    case 'stop':
      t.budget = t.total; s.phase = 'lane';
      ev.push({ t: 'stop', rider: r.id, total: t.total });
      break;
    case 'lane': {
      const p = previewLane(s, r.id, a.lane);
      r.sta -= p.cost;
      const last = p.path.at(-1);
      r.lane = last.lane; r.cell = last.cell; r.lap = last.lap;
      const e = { t: 'move', rider: r.id, path: p.path, from: a.from, cost: p.cost, blocked: p.blocked, draft: false, finished: p.finished };
      ev.push(e);
      if (p.finished) {
        r.finished = true; s.finishOrder.push(r.id); r.place = s.finishOrder.length;
        ev.push({ t: 'finish', rider: r.id, place: r.place });
      } else {
        if (p.draft) { r.sta = Math.min(MAX_STA, r.sta + 1); r.drafts++; e.draft = true; }
        for (let i = 0; i < p.lapCross; i++) { const c = draw(s, r); if (c) ev.push({ t: 'draw', rider: r.id, card: c, why: 'lap' }); }
      }
      ev.push(...endTurn(s));
      break;
    }
  }
  return ev;
}

function stumble(s) {
  const t = s.turn;
  t.stumbled = true;
  t.total = t.pushes === 0 && t.total === 0 ? 1 : Math.max(1, Math.floor(t.total / 2));
  t.budget = t.total; s.phase = 'lane';
  return [{ t: 'stumbled', rider: t.rider, total: t.total }];
}

function endTurn(s) {
  s.turnCount++;
  const humans = s.riders.filter(r => r.kind === 'human'), left = s.riders.filter(r => !r.finished);
  if ((humans.length && humans.every(r => r.finished)) || left.length <= 1 || s.turnCount >= TURN_CAP) return finishRace(s);
  s.turnPos++;
  return beginTurn(s);
}

function finishRace(s) {
  // Anyone still running is placed by how far round they are.
  const rest = standings(s).filter(r => !r.finished);
  for (const r of rest) { s.finishOrder.push(r.id); r.place = s.finishOrder.length; r.finished = true; r.unfinished = true; }
  s.over = true; s.phase = 'over'; s.turn = null;
  return [{ t: 'over', order: [...s.finishOrder] }];
}

export function abandon(s) { s.over = true; s.phase = 'over'; s.abandoned = true; s.turn = null; }

// ---------- Computer riders ----------
const TUNE = {
  cautious: { target: 6, reserve: 2, ease: 2, wind: 4, draft: 1.2, block: 0.2, inner: 0.35, risk: 0 },
  bold:     { target: 9, reserve: 0, ease: 1, wind: 2, draft: 0.3, block: 0.2, inner: 0.2, risk: 2 },
  sly:      { target: 7, reserve: 2, ease: 2, wind: 4, draft: 1.5, block: 1.4, inner: 0.3, risk: 1 }
};
const CELLS_PER_LAP = 32;

function bestReach(s, ri, budget) {
  let best = -Infinity;
  for (let l = 0; l < LANES; l++) { const p = previewLane(s, ri, l, budget); if (p.ok) best = Math.max(best, p.finished ? 99 : p.gain); }
  return best;
}
function distToFinish(s, r) { return (s.laps - r.lap - cellT(r.lane, r.cell)) * laneLen(r.lane); }

export function botAction(s) {
  const acts = legalActions(s);
  if (!acts.length) return null;
  const r = active(s), t = s.turn, k = TUNE[r.persona] || TUNE.cautious, has = c => acts.some(a => a.type === 'card' && a.card === c);
  const field = standings(s).filter(x => !x.finished), myPlace = field.findIndex(x => x.id === r.id);
  const leaderGap = (progress(s, field[0]) - progress(s, r)) * CELLS_PER_LAP;
  const finalLap = r.lap >= s.laps - 1;
  if (s.phase === 'start') {
    if (has('wind') && r.sta <= k.wind) return { type: 'card', card: 'wind' };
    if (has('spook')) {
      const target = myPlace > 0 ? field[myPlace - 1] : null;
      if (r.persona === 'sly' && target && target.sta >= 2) return { type: 'card', card: 'spook' };
      if (r.persona === 'bold' && myPlace === 1 && target && target.sta >= 3) return { type: 'card', card: 'spook' };
      if (r.persona === 'cautious' && r.hand.length >= HAND_MAX && target) return { type: 'card', card: 'spook' };
    }
    if (has('lucky') && r.persona !== 'sly' && r.sta >= 2) return { type: 'card', card: 'lucky' };
    const easeAt = k.ease + (finalLap && distToFinish(s, r) < 10 ? -2 : 0);
    if (r.sta <= easeAt) return { type: 'ease' };
    return { type: 'roll' };
  }
  if (s.phase === 'rolled') {
    const d = distToFinish(s, r);
    if (t.total >= d) return { type: 'stop' };
    if (has('spurt') && (t.total >= (r.persona === 'bold' ? 3 : 5) || d - t.total <= 2)) return { type: 'card', card: 'spurt' };
    let target = k.target + (myPlace >= field.length - 1 && leaderGap > 6 ? k.risk + 1 : 0) + (finalLap && myPlace > 0 ? k.risk : 0);
    const cost = pushCost(s), canPush = acts.some(a => a.type === 'push');
    // Pushing is pointless if every lane is boxed in already.
    const now = bestReach(s, r.id, t.total), more = bestReach(s, r.id, t.total + 3);
    if (more <= now + 1e-9) return { type: 'stop' };
    if (r.persona === 'sly') { // stop if a lane lands in someone's slipstream
      for (let l = 0; l < LANES; l++) { const p = previewLane(s, r.id, l, t.total); if (p.ok && p.draft && !p.blocked && t.total >= 3) return { type: 'stop' }; }
    }
    if (has('lucky') && t.total >= 4 && t.total < target && r.sta >= cost) return { type: 'card', card: 'lucky' };
    if (!canPush && has('wind') && t.total < target) return { type: 'card', card: 'wind' };
    if (canPush && t.total < target && r.sta - cost >= k.reserve) return { type: 'push' };
    return { type: 'stop' };
  }
  if (s.phase === 'stumble') return acts.some(a => a.type === 'sugar') ? { type: 'sugar' } : { type: 'accept' };
  if (s.phase === 'lane') {
    let best = null, bestScore = -Infinity;
    for (const a of acts) {
      const p = previewLane(s, r.id, a.lane);
      let sc = p.finished ? 1e4 : p.gain * CELLS_PER_LAP;
      sc -= p.cost * 0.9;
      if (p.draft) sc += k.draft;
      if (!p.finished) {
        const e = p.end, n = laneLen(e.lane), behind = occupant(s, e.lane, (e.cell - 1 + n) % n, r.id);
        if (behind >= 0) sc += k.block;
        // Before a bend, the rail is worth a little.
        let bendSoon = false; for (let i = 1; i <= 4; i++) if (isBend(e.lane, (e.cell + i) % n)) bendSoon = true;
        if (bendSoon) sc += (LANES - 1 - e.lane) * k.inner;
      }
      sc += rnd(s) * 0.05;
      if (sc > bestScore) { bestScore = sc; best = a; }
    }
    return best;
  }
  return acts.at(-1);
}

// ---------- Rewards (Trotties) ----------
// ~10 per minute of racing (at least 10, at most 150), plus a placing bonus. Nothing for abandoning.
export function rewardFor({ place, field, minutes, abandoned = false }) {
  if (abandoned || !place) return { coins: 0, lines: [] };
  const time = Math.max(10, Math.min(150, Math.round(minutes * 10)));
  const bonus = place === field && field > 1 ? 0 : ([30, 15, 5][place - 1] || 0);
  const ord = ['1st', '2nd', '3rd', '4th'][place - 1];
  return { coins: time + bonus, lines: [`Race finished · ${time} 🪙`, bonus ? `${ord} place · ${bonus} 🪙` : null].filter(Boolean) };
}
