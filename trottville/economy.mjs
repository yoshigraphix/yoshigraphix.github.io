// Trotties: what every game score turns into. Pure (no DOM). Each game scores on its own scale
// (Appleoosa in thousands, Hay's for Horses in hundreds, the steeplechase is a time), so each has a "par":
// the score a decent player makes per minute. Par play pays 10 Trotties a minute; better play pays more
// but tapers (max 2×); idling pays nothing. After 20 minutes of the same game in a day it pays half, so
// switching games is always worth it. Numbers: docs/economy-plan.md. Tune PAR from playtests.
export const PER_MINUTE=10,TAPER_AFTER=20;
export const GAMES={
  feed:{name:'Appleoosa',par:2400,food:'apple'},
  fling:{name:'Hay’s for Horses',par:3000,food:'hay'},
  steeple:{name:'Steeplechase'},
  barn:{name:'Barn game'}
};
// Better-than-par play earns more, gently: 1× at par, 1.5× at double par, capped at 2×.
export const skill=perf=>perf<=1?Math.max(0,perf):Math.min(2,1+(perf-1)*.5);

// minutesToday: how long this game was already played today (for the taper).
export function convertScore(game,{score=0,minutes=0,minutesToday=0}={}){const g=GAMES[game];if(!g?.par)return {coins:0};
  const mins=Math.max(.25,Math.min(15,minutes)),perf=Math.max(0,score)/(g.par*mins);
  const fresh=Math.max(0,Math.min(mins,TAPER_AFTER-minutesToday)),tired=mins-fresh,base=PER_MINUTE*skill(perf);
  const coins=Math.round(base*fresh+base*tired*.5);
  return {coins,perf,tapered:tired>0,lines:[`${Math.max(0,Math.round(score)).toLocaleString()} points → ${coins} 🪙`]};}

// Steeplechase: a finish, a speed bonus against the course's par time, and a personal best.
export function convertRace({time,par,isBest=false}){const speed=Math.max(0,Math.min(20,Math.round((par/time-.8)*50)));
  const coins=15+speed+(isBest?30:0);
  return {coins,lines:['Finished · 15 🪙',speed?`Speed bonus · ${speed} 🪙`:null,isBest?'New personal best · 30 🪙':null].filter(Boolean)};}

// Food from games: Appleoosa sends apples (1 per 5 delivered), Hay's sends hay (1 per full row).
export function foodFrom(game,stats={}){if(game==='feed')return {apple:Math.min(12,Math.floor((stats.delivered||0)/5))};
  if(game==='fling')return {hay:Math.min(12,stats.rows||0)};return {};}

// Play log per day so the taper knows how long each game ran today.
export function logPlay(log,game,minutes,now=Date.now()){const day=new Date(now).toISOString().slice(0,10);const l=log&&log.day===day?log:{day,games:{}};
  return {...l,games:{...l.games,[game]:(l.games[game]||0)+Math.max(0,minutes)}};}
export const minutesToday=(log,game,now=Date.now())=>log&&log.day===new Date(now).toISOString().slice(0,10)?(log.games[game]||0):0;

// Pending coins wait in the wallet until you press Collect, so nothing is ever lost.
let seq=0;
export function queue(wallet,{from,coins=0,food={},lines=[]}){const id=`p${Date.now().toString(36)}${(seq++).toString(36)}`;
  return {...wallet,pending:[...(wallet.pending||[]),{id,from,coins:Math.max(0,Math.floor(coins)),food,lines,at:Date.now()}].slice(-50)};}
export const pendingTotal=w=>(w.pending||[]).reduce((s,p)=>s+p.coins,0);
export function collect(wallet,ids){const take=(wallet.pending||[]).filter(p=>!ids||ids.includes(p.id));
  const food={};for(const p of take)for(const [k,v] of Object.entries(p.food||{}))food[k]=(food[k]||0)+v;
  const coins=take.reduce((s,p)=>s+p.coins,0);
  return {coins,food,wallet:{...wallet,coins:wallet.coins+coins,pending:(wallet.pending||[]).filter(p=>!take.includes(p))}};}
