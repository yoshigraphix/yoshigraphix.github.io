// Haygglers: a county-fair ranch card game for Trottville. Pure rules, no DOM.
// 8 seasons. Each season: harvest -> snake draft from the Fair Row (buy or sell each pick) -> feed horses -> (show on seasons 4 and 8).
// Resources: hay (🌾) and carrots (🥕, the fair's money). Points: ribbons (🎀).

export const ROUNDS = 8, SHOW_ROUNDS = [4, 8], START = { hay: 3, carrots: 3 }, BASE_INCOME = { carrots: 1 };
export const VARIETY = [0, 0, 2, 5, 9, 14];          // distinct breeds -> ribbons
export const SHOW_PRIZE = { first: 5, tie: 3, second: 2, secondTie: 1, ring: 2 };
export const HAYLOFT_CAP = 4, LEFTOVER = 5;
export const HUNGRY = 2, SELL = 2, SELL_POST = 3, MAX_DISCOUNT = 2;

export const BREEDS = {
  quarter:   { name: 'Quarter Horse', short: 'Quarter', coat: '#b97a45', mane: '#4a2a17', perk: '+1🥕', perkText: 'Earns 1 🥕 every harvest' },
  arabian:   { name: 'Arabian', short: 'Arabian', coat: '#ddd8d0', mane: '#8a837c', perk: '+1⭐', perkText: 'Show stars: one extra ⭐ already counted' },
  welsh:     { name: 'Welsh Pony', short: 'Welsh', coat: '#c8692e', mane: '#f3dfb6', perk: 'eats 0', perkText: 'Tiny appetite: never needs hay' },
  shire:     { name: 'Shire', short: 'Shire', coat: '#3d302c', mane: '#191312', blaze: true, perk: '+1🌾', perkText: 'Hauls 1 🌾 every harvest' },
  appaloosa: { name: 'Appaloosa', short: 'Appy', coat: '#f6f0e4', mane: '#6b6a6a', spots: true, perk: '🎀 pals', perkText: 'Each Appaloosa scores +1 🎀 per other Appaloosa' },
};
export const BREED_IDS = Object.keys(BREEDS);

// Card definitions. cost {h,c}; prod {h,c} per harvest; rib = ribbons at the end; stalls; stars (show power).
const defs = [
  { id: 'meadow', kind: 'field', name: 'Hay Meadow', icon: '🌾', cost: { c: 3 }, prod: { h: 2 }, count: 6 },
  { id: 'patch', kind: 'field', name: 'Carrot Patch', icon: '🥕', cost: { h: 3 }, prod: { c: 2 }, count: 4 },
  { id: 'orchard', kind: 'field', name: 'Apple Orchard', icon: '🍎', cost: { h: 1, c: 3 }, prod: { h: 1, c: 1 }, rib: 1, count: 3 },
  { id: 'clover', kind: 'field', name: 'Clover Field', icon: '🍀', cost: { h: 1, c: 3 }, special: 'clover', perk: '+1🌾 / 🐴', count: 2 },
  { id: 'barn', kind: 'building', name: 'Big Barn', icon: 'barn', cost: { h: 2, c: 3 }, stalls: 2, rib: 1, count: 5 },
  { id: 'hayloft', kind: 'building', name: 'Hayloft', icon: '🪜', cost: { c: 3 }, prod: { h: 1 }, special: 'hayloft', perk: '3🌾→🎀', count: 2 },
  { id: 'post', kind: 'building', name: 'Trading Post', icon: '⚖️', cost: { h: 3 }, prod: { c: 1 }, special: 'post', perk: 'sell +3 · swap 1:1', count: 2 },
  { id: 'ring', kind: 'building', name: 'Show Ring', icon: '🏆', cost: { h: 1, c: 5 }, rib: 3, special: 'ring', perk: '+2🎀 per show win', count: 2 },
  { id: 'foaling', kind: 'building', name: 'Foaling Barn', icon: '🍼', cost: { h: 2, c: 3 }, stalls: 1, special: 'foaling', perk: 'pair → foal', count: 3 },
  { id: 'school', kind: 'building', name: 'Riding School', icon: '🎓', cost: { h: 1, c: 3 }, special: 'school', perk: '+1🥕 / 2🐴', count: 2 },
];
// Horses: per breed two easy horses, one good one, one star.
const HORSE_NAMES = {
  quarter: ['Biscuit', 'Dusty', 'Rodeo Rosie', 'Maverick'],
  arabian: ['Pearl', 'Zephyr', 'Moonlit', 'Sultana'],
  welsh: ['Pippin', 'Button', 'Taffy', 'Bramble'],
  shire: ['Bruno', 'Oakley', 'Big Ben', 'Thunder'],
  appaloosa: ['Dot', 'Speckle', 'Patches', 'Freckles'],
};
const TIERS = [
  { cost: { h: 1, c: 3 }, rib: 2, stars: 1 },
  { cost: { h: 1, c: 3 }, rib: 2, stars: 1 },
  { cost: { h: 2, c: 4 }, rib: 3, stars: 2 },
  { cost: { h: 2, c: 6 }, rib: 5, stars: 3 },
];
for (const b of BREED_IDS) HORSE_NAMES[b].forEach((name, i) => {
  const t = TIERS[i];
  defs.push({ id: `${b}-${i}`, kind: 'horse', breed: b, name, cost: t.cost, rib: t.rib, stars: t.stars + (b === 'arabian' ? 1 : 0), tier: i, count: 1 });
});
for (const b of BREED_IDS) defs.push({ id: `foal-${b}`, kind: 'horse', breed: b, name: 'Foal', foal: true, cost: {}, rib: 1, stars: 0, count: 0 });
defs.push({ id: 'littlebarn', kind: 'building', name: 'Little Barn', icon: 'barn', cost: {}, stalls: 2, count: 0, starter: true });

export const DEFS = Object.fromEntries(defs.map(d => [d.id, d]));
export const DECK_SIZE = defs.reduce((s, d) => s + d.count, 0);

export const SHOW_CATS = {
  herd:   { name: 'Biggest Herd', icon: '🐴', value: p => horsesOf(p).length },
  breeds: { name: 'Most Breeds', icon: '🌈', value: p => breedsOf(p).size },
  stars:  { name: 'Star Power', icon: '⭐', value: p => horsesOf(p).reduce((s, c) => s + (DEFS[c.def].stars || 0), 0) },
  fields: { name: 'Green Acres', icon: '🌱', value: p => p.cards.filter(c => DEFS[c.def].kind === 'field').length },
  hay:    { name: 'Haystack', icon: '🌾', value: p => p.hay },
  stalls: { name: 'Roomiest Ranch', icon: '🏠', value: p => stallsOf(p) },
};
export const SHOW_NAMES = ['Midsummer Show', 'Harvest Fair'];

export const STYLES = {
  farmer:  { name: 'Nana Bea', icon: '👵', blurb: 'Fields first, horses later', engine: 1.5, horse: 0.9, breed: 0.8, show: 0.8, deny: 0 },
  breeder: { name: 'Dusty Boots', icon: '🤠', blurb: 'Collects every breed, loves foals', engine: 1.0, horse: 1.1, breed: 1.8, show: 0.7, deny: 0 },
  showoff: { name: 'Ribbon Rita', icon: '🎀', blurb: 'Chases shows and snatches your cards', engine: 0.9, horse: 1.1, breed: 0.9, show: 1.8, deny: 0.4 },
};

// ---------- helpers ----------
export const def = c => DEFS[c.def];
export const horsesOf = p => p.cards.filter(c => DEFS[c.def].kind === 'horse');
export const adultsOf = p => horsesOf(p).filter(c => !DEFS[c.def].foal);
export const breedsOf = p => new Set(horsesOf(p).map(c => DEFS[c.def].breed));
export const stallsOf = p => p.cards.reduce((s, c) => s + (DEFS[c.def].stalls || 0), 0);
export const freeStalls = p => stallsOf(p) - horsesOf(p).length;
export const has = (p, special) => p.cards.filter(c => DEFS[c.def].special === special).length;
export const swapRate = p => has(p, 'post') ? 1 : 2;
export const sellValue = p => has(p, 'post') ? SELL_POST : SELL;
export const eaters = p => horsesOf(p).filter(c => DEFS[c.def].breed !== 'welsh').length;

function rnd(state) { // mulberry32 kept in state so games are reproducible and serialisable
  let t = (state.rng = (state.rng + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle(state, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(state) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

let uidSeq = 0;
const inst = (id, n) => ({ uid: `${id}#${n ?? ++uidSeq}`, def: id, discount: 0 });

// Effective cost after a bargain discount (carrots come off first).
export function costOf(card) {
  const d = DEFS[card.def]; let c = d.cost.c || 0, h = d.cost.h || 0, off = card.discount || 0;
  const cc = Math.min(c, off); c -= cc; off -= cc; h = Math.max(0, h - off);
  return { h, c };
}
// How a player would pay: returns {h,c} actually spent, or null if they can't. Short of one resource -> swap the other at 2:1 (1:1 with a Trading Post).
export function payment(p, cost) {
  const r = swapRate(p), missH = Math.max(0, cost.h - p.hay), missC = Math.max(0, cost.c - p.carrots);
  if (missH && missC) return null;
  if (missH) { const c = cost.c + missH * r; return c <= p.carrots ? { h: cost.h - missH, c } : null; }
  if (missC) { const h = cost.h + missC * r; return h <= p.hay ? { h, c: cost.c - missC } : null; }
  return { h: cost.h, c: cost.c };
}
export function canBuy(p, card) {
  const d = DEFS[card.def];
  if (d.kind === 'horse' && freeStalls(p) <= 0) return false;
  return !!payment(p, costOf(card));
}

// ---------- setup ----------
export function newGame({ players, seed = 1 } = {}) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) throw new Error('2–4 players');
  const state = { rng: seed >>> 0, round: 1, first: 0, pick: 0, order: [], row: [], deck: [], discard: [], over: false, log: [],
    rowSize: players.length * 2 + 1, shows: [], showResults: [], players: [] };
  state.players = players.map((pl, i) => ({ name: pl.name || `Player ${i + 1}`, kind: pl.kind === 'bot' ? 'bot' : 'human', style: pl.style || null,
    hay: START.hay, carrots: START.carrots, cards: [inst('littlebarn', `p${i}`), inst('meadow', `p${i}s`)], showRibbons: 0, showWins: 0, hungry: 0, sold: 0, bought: 0 }));
  let n = 0; for (const d of defs) for (let k = 0; k < d.count; k++) state.deck.push(inst(d.id, `d${n++}`));
  shuffle(state, state.deck);
  const cats = shuffle(state, Object.keys(SHOW_CATS));
  state.shows = [cats.slice(0, 2), cats.slice(2, 4)];
  state.startEvents = beginRound(state);
  return state;
}

function deal(state) {
  const fresh = [];
  while (state.row.length < state.rowSize) {
    if (!state.deck.length) { if (!state.discard.length) break; state.deck = shuffle(state, state.discard); state.discard = []; }
    const c = state.deck.pop(); c.discount = 0; state.row.push(c); fresh.push(c.uid);
  }
  return fresh;
}

export function harvestGain(p) {
  let h = 0, c = BASE_INCOME.carrots;
  for (const card of p.cards) { const d = DEFS[card.def]; h += d.prod?.h || 0; c += d.prod?.c || 0; }
  for (const a of adultsOf(p)) { const b = DEFS[a.def].breed; if (b === 'quarter') c++; if (b === 'shire') h++; }
  h += has(p, 'clover') * Math.min(4, horsesOf(p).length);
  c += has(p, 'school') * Math.floor(horsesOf(p).length / 2);
  return { h, c };
}
function harvest(state, pi) {
  const p = state.players[pi], g = harvestGain(p), foals = [];
  p.hay += g.h; p.carrots += g.c;
  for (let k = 0; k < has(p, 'foaling'); k++) {
    if (freeStalls(p) <= 0) break;
    const counts = {}; for (const a of adultsOf(p)) { const b = DEFS[a.def].breed; counts[b] = (counts[b] || 0) + 1; }
    const pairs = Object.entries(counts).filter(([, v]) => v >= 2).sort((a, b) => b[1] - a[1] || BREED_IDS.indexOf(a[0]) - BREED_IDS.indexOf(b[0]));
    if (!pairs.length) break;
    // Breed the pair whose foal helps most: rotate through breeds with pairs so two barns can make two different foals.
    const breed = pairs[k % pairs.length][0], foal = inst(`foal-${breed}`);
    p.cards.push(foal); foals.push(foal.uid);
  }
  return { t: 'harvest', p: pi, h: g.h, c: g.c, foals };
}

function beginRound(state) {
  const ev = [{ t: 'season', round: state.round }];
  for (let i = 0; i < state.players.length; i++) ev.push(harvest(state, i));
  const n = state.players.length, f = state.first, fwd = Array.from({ length: n }, (_, k) => (f + k) % n);
  state.order = [...fwd, ...fwd.slice().reverse()];
  state.pick = 0;
  ev.push({ t: 'deal', fresh: deal(state) });
  return ev;
}

// ---------- turns ----------
export const current = state => state.over ? -1 : state.order[state.pick];
export const isOver = state => state.over;
export const picksLeftFor = (state, pi) => state.order.slice(state.pick).filter(x => x === pi).length;

export function legalActions(state) {
  if (state.over) return [];
  if (!state.row.length) return [{ type: 'pass' }];
  const p = state.players[current(state)], out = [];
  state.row.forEach((card, i) => { if (canBuy(p, card)) out.push({ type: 'buy', uid: card.uid }); out.push({ type: 'sell', uid: card.uid }); });
  return out;
}
export function isLegal(state, a) {
  return legalActions(state).some(x => x.type === a?.type && (x.type === 'pass' || x.uid === a.uid));
}

export function applyAction(state, a) {
  if (!isLegal(state, a)) throw new Error('Illegal action ' + JSON.stringify(a));
  const pi = current(state), p = state.players[pi], ev = [];
  if (a.type === 'pass') { p.carrots += 1; ev.push({ t: 'pass', p: pi, c: 1 }); }
  else {
    const idx = state.row.findIndex(c => c.uid === a.uid), card = state.row[idx];
    state.row.splice(idx, 1);
    if (a.type === 'buy') {
      const pay = payment(p, costOf(card)); p.hay -= pay.h; p.carrots -= pay.c; card.discount = 0; p.cards.push(card); p.bought++;
      ev.push({ t: 'buy', p: pi, uid: card.uid, def: card.def, pay });
    } else {
      const v = sellValue(p); p.carrots += v; p.sold++; card.discount = 0; state.discard.push(card);
      ev.push({ t: 'sell', p: pi, uid: card.uid, def: card.def, c: v });
    }
  }
  state.pick++;
  if (state.pick >= state.order.length) ev.push(...endRound(state));
  return ev;
}

function feed(state, pi) {
  const p = state.players[pi], need = eaters(p), r = swapRate(p);
  const fromHay = Math.min(need, p.hay); p.hay -= fromHay;
  let rest = need - fromHay, fromCarrots = 0;
  while (rest > 0 && p.carrots >= r) { p.carrots -= r; fromCarrots += r; rest--; }
  p.hungry += rest;
  return { t: 'feed', p: pi, need, hay: fromHay, carrots: fromCarrots, hungry: rest };
}

export function judgeShow(state, cats) {
  const n = state.players.length, results = [];
  for (const cat of cats) {
    const vals = state.players.map(p => SHOW_CATS[cat].value(p)), awards = Array(n).fill(0), wins = Array(n).fill(false);
    const top = Math.max(...vals);
    if (top > 0) {
      const firsts = vals.map((v, i) => v === top ? i : -1).filter(i => i >= 0);
      for (const i of firsts) { awards[i] = firsts.length > 1 ? SHOW_PRIZE.tie : SHOW_PRIZE.first; wins[i] = true; }
      if (firsts.length === 1 && n >= 3) {
        const rest = vals.filter((v, i) => i !== firsts[0]), second = Math.max(...rest);
        if (second > 0) { const seconds = vals.map((v, i) => v === second && i !== firsts[0] ? i : -1).filter(i => i >= 0);
          for (const i of seconds) awards[i] = seconds.length > 1 ? SHOW_PRIZE.secondTie : SHOW_PRIZE.second; }
      }
    }
    results.push({ cat, vals, awards, wins });
  }
  return results;
}

function endRound(state) {
  const ev = [];
  for (const c of state.row) c.discount = Math.min(MAX_DISCOUNT, (c.discount || 0) + 1);
  for (let i = 0; i < state.players.length; i++) ev.push(feed(state, i));
  const showIdx = SHOW_ROUNDS.indexOf(state.round);
  if (showIdx >= 0) {
    const res = judgeShow(state, state.shows[showIdx]), ringBonus = state.players.map(() => 0);
    for (const r of res) r.wins.forEach((w, i) => { if (w) { state.players[i].showWins++; ringBonus[i] += has(state.players[i], 'ring') * SHOW_PRIZE.ring; } });
    state.players.forEach((p, i) => { p.showRibbons += res.reduce((s, r) => s + r.awards[i], 0) + ringBonus[i]; });
    const entry = { t: 'show', idx: showIdx, name: SHOW_NAMES[showIdx], results: res, ringBonus };
    state.showResults.push(entry); ev.push(entry);
  }
  if (state.round >= ROUNDS) { state.over = true; ev.push({ t: 'end', scores: finalScores(state) }); return ev; }
  state.round++; state.first = (state.first + 1) % state.players.length;
  ev.push(...beginRound(state));
  return ev;
}

// ---------- scoring ----------
export function scoreOf(p) {
  const cards = p.cards.reduce((s, c) => s + (DEFS[c.def].rib || 0), 0);
  const apps = horsesOf(p).filter(c => DEFS[c.def].breed === 'appaloosa').length;
  const appaloosa = apps * (apps - 1);
  const variety = VARIETY[breedsOf(p).size];
  const hayloft = has(p, 'hayloft') * Math.min(HAYLOFT_CAP, Math.floor(p.hay / 3));
  const leftovers = Math.floor((p.hay + p.carrots) / LEFTOVER);
  const shows = p.showRibbons, hungry = -HUNGRY * p.hungry;
  const total = cards + appaloosa + variety + shows + hayloft + leftovers + hungry;
  return { cards, appaloosa, variety, shows, hayloft, leftovers, hungry, total };
}
export const SCORE_LINES = [
  ['cards', '🎀', 'Ribbons on cards'], ['variety', '🌈', 'Breed variety'], ['appaloosa', '🐆', 'Appaloosa pals'],
  ['shows', '🏆', 'Show ribbons'], ['hayloft', '🪜', 'Hayloft hay'], ['leftovers', '🧺', 'Leftovers (5 → 1)'], ['hungry', '😟', 'Hungry horses'],
];
export function finalScores(state) {
  const rows = state.players.map((p, i) => ({ i, name: p.name, ...scoreOf(p), horses: horsesOf(p).length, spare: p.hay + p.carrots }));
  const ranked = rows.slice().sort((a, b) => b.total - a.total || b.horses - a.horses || b.spare - a.spare);
  const best = ranked[0];
  const winners = ranked.filter(r => r.total === best.total && r.horses === best.horses && r.spare === best.spare).map(r => r.i);
  return { rows, ranked: ranked.map(r => r.i), winners };
}

// ---------- computer ranchers ----------
function resVal(left) { return 0.26 + 0.035 * left; }
// How much a card is worth to player pi right now, in ribbons, ignoring its price.
export function cardWorth(state, pi, card, styleId) {
  const S = STYLES[styleId] || STYLES.farmer, p = state.players[pi], d = DEFS[card.def];
  const left = ROUNDS - state.round, rv = resVal(left), horses = horsesOf(p).length;
  let v = (d.rib || 0) * S.horse * (d.kind === 'horse' ? 1 : 0.9);
  const prod = (d.prod?.h || 0) + (d.prod?.c || 0);
  v += prod * left * rv * S.engine;
  if (d.special === 'clover') v += Math.min(4, horses + 1) * left * rv * S.engine;
  if (d.special === 'school') v += Math.floor((horses + 1) / 2) * left * rv * S.engine;
  if (d.special === 'post') v += left > 2 ? 0.8 : 0.2;
  if (d.special === 'hayloft') v += Math.min(3, (p.hay + left * 2) / 6);
  if (d.special === 'ring') v += Math.min(2, p.showWins * 0.5 + 0.8) * S.show * (state.round <= 8 ? 1 : 0) * (state.round > 4 ? 0.6 : 1);
  if (d.stalls) {
    const free = freeStalls(p);
    v += (free <= 0 ? 2.4 : free === 1 ? 1.2 : 0.3) * (left >= 1 ? 1 : 0.2) * S.horse * (d.stalls / 2);
  }
  if (d.special === 'foaling') {
    const counts = {}; for (const a of adultsOf(p)) { const b = DEFS[a.def].breed; counts[b] = (counts[b] || 0) + 1; }
    const m = Math.max(0, ...Object.values(counts));
    v += (m >= 2 ? 1 : m === 1 ? 0.45 : 0.15) * Math.min(left, 3) * 1.1 * S.breed;
  }
  if (d.kind === 'horse') {
    const b = d.breed, set = breedsOf(p), apps = horsesOf(p).filter(c => DEFS[c.def].breed === 'appaloosa').length;
    v += (d.stars || 0) * 0.45 * S.show;
    if (!set.has(b)) v += (VARIETY[set.size + 1] - VARIETY[set.size]) * S.breed;
    if (b === 'appaloosa') v += 2 * apps * S.breed;
    if (b === 'quarter') v += left * rv;
    if (b === 'shire') v += left * rv;
    if (b !== 'welsh') v -= left * rv * 0.9; // feed bill
    else v += 0.2;
    // Pair for a foaling barn
    if (has(p, 'foaling') && adultsOf(p).filter(c => DEFS[c.def].breed === b).length === 1) v += Math.min(left, 3) * 0.7 * S.breed;
  }
  // Upcoming show categories this card helps with.
  const nextShow = SHOW_ROUNDS.findIndex(r => r >= state.round);
  if (nextShow >= 0) for (const cat of state.shows[nextShow]) {
    const before = SHOW_CATS[cat].value(p), after = SHOW_CATS[cat].value({ ...p, cards: [...p.cards, card] });
    if (after > before) {
      const best = Math.max(...state.players.filter((_, i) => i !== pi).map(o => SHOW_CATS[cat].value(o)));
      v += (after >= best && before <= best + 1 ? 1.1 : 0.35) * S.show;
    }
  }
  return v;
}

export function actionValue(state, pi, a, styleId) {
  const S = STYLES[styleId] || STYLES.farmer, p = state.players[pi];
  if (a.type === 'pass') return 0;
  const card = state.row.find(c => c.uid === a.uid), left = ROUNDS - state.round, rv = resVal(left);
  let deny = 0;
  if (S.deny) for (let i = 0; i < state.players.length; i++) if (i !== pi && current(state) === pi) {
    const o = state.players[i]; if (canBuy(o, card) && picksLeftFor(state, i) > 0) deny = Math.max(deny, cardWorth(state, i, card, 'farmer') - 1.5);
  }
  const denyV = Math.max(0, deny) * S.deny;
  if (a.type === 'sell') return sellValue(p) * rv + denyV;
  const pay = payment(p, costOf(card)), spent = pay.h + pay.c;
  // Hay is needed to feed the herd: spending your last hay costs extra.
  const hayPinch = Math.max(0, eaters(p) - (p.hay - pay.h)) * 0.25;
  return cardWorth(state, pi, card, styleId) - spent * rv - hayPinch + denyV;
}

export function botAction(state, styleId, rand = Math.random) {
  const acts = legalActions(state), pi = current(state);
  if (!acts.length) return null;
  let best = acts[0], bv = -Infinity;
  for (const a of acts) { const v = actionValue(state, pi, a, styleId) + rand() * 0.35; if (v > bv) { bv = v; best = a; } }
  return best;
}

// A simple "how am I doing" score for the HUD (what you'd get if the game ended now).
export const liveScore = p => scoreOf(p).total;
