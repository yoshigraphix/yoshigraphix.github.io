// Time of day and weather for the 3D world. Pure rules (no Three.js), shared by world-sky.js and tests.
// One game day passes every real hour (Yoshi 2026-11-10, so kids who go to bed early still see night): on the hour
// it's dawn (roosters crow for 5 minutes), :15 high noon, :30 sunset, :45 midnight (owls), back to dawn at :00.
// skyAt still takes a game hour 0–24: gameHours() turns the real clock into one.
// Weather changes in 4-minute spells from a seed of the date, so everyone sees the same sky at the same moment.

// Night is truly dark (Yoshi 2026-11-08); lanterns light the way (world-lanterns.js).
// Keyframes by local hour. elev = sun elevation in degrees; colours are hex; night = star/moon amount.
const KEYS=[
  {h:0,    elev:-30,top:'#040915',hor:'#0b1526',glow:'#121f36',sun:'#8ea4d6',sunI:.16,hemiSky:'#33426a',hemiGround:'#121a1c',hemiI:.24,night:1},
  {h:4.75, elev:-30,top:'#040915',hor:'#0b1526',glow:'#121f36',sun:'#8ea4d6',sunI:.16,hemiSky:'#33426a',hemiGround:'#121a1c',hemiI:.24,night:1},
  {h:5.5,  elev:-6, top:'#2a3d6b',hor:'#c88aa0',glow:'#f2a07a',sun:'#f6b48a',sunI:.8, hemiSky:'#b9a6c4',hemiGround:'#5e6a4c',hemiI:1.2,night:.5},
  {h:6.25, elev:4,  top:'#6f9cc9',hor:'#f6c7a3',glow:'#ffb070',sun:'#ffc58a',sunI:1.9,hemiSky:'#e9d9d0',hemiGround:'#7d8e5a',hemiI:1.6,night:0},
  {h:8,    elev:25, top:'#7fbfe0',hor:'#c8e6e5',glow:'#fff2d0',sun:'#fff0d0',sunI:3,  hemiSky:'#effbff',hemiGround:'#91ac67',hemiI:2.2,night:0},
  {h:12.5, elev:62, top:'#86c4e4',hor:'#c8e6e5',glow:'#fff6e0',sun:'#fff0d0',sunI:3.1,hemiSky:'#effbff',hemiGround:'#91ac67',hemiI:2.2,night:0},
  {h:17,   elev:30, top:'#7fbfe0',hor:'#c8e6e5',glow:'#fff2d0',sun:'#fff0d0',sunI:3,  hemiSky:'#effbff',hemiGround:'#91ac67',hemiI:2.2,night:0},
  {h:18.5, elev:12, top:'#7aa9d6',hor:'#f2d3a6',glow:'#ffb35c',sun:'#ffcf8a',sunI:2.6,hemiSky:'#f4e2c8',hemiGround:'#93a463',hemiI:2,  night:0},
  {h:19.5, elev:4,  top:'#5a78b8',hor:'#f7a87a',glow:'#ff7a3d',sun:'#ff9a5a',sunI:2,  hemiSky:'#f0c4b0',hemiGround:'#866f5a',hemiI:1.7,night:0},
  {h:20.4, elev:-1, top:'#3b4d8f',hor:'#e98a8a',glow:'#ff6a4a',sun:'#ff8a6a',sunI:1.1,hemiSky:'#c9a0b4',hemiGround:'#5f5a55',hemiI:1.35,night:.15},
  {h:21.1, elev:-8, top:'#141d42',hor:'#4a3d64',glow:'#5e3e5a',sun:'#a496d0',sunI:.32,hemiSky:'#5a5c8a',hemiGround:'#262c2c',hemiI:.55,night:.7},
  {h:22,   elev:-30,top:'#040915',hor:'#0b1526',glow:'#121f36',sun:'#8ea4d6',sunI:.16,hemiSky:'#33426a',hemiGround:'#121a1c',hemiI:.24,night:1},
  {h:24,   elev:-30,top:'#040915',hor:'#0b1526',glow:'#121f36',sun:'#8ea4d6',sunI:.16,hemiSky:'#33426a',hemiGround:'#121a1c',hemiI:.24,night:1},
];
export const SUNRISE=6.25,SUNSET=20.4;
// Real minute of the hour → game hour. Piecewise so each quarter lands on its moment.
const DAY_KEYS=[[0,6],[15,12.5],[30,20],[45,24],[60,30]];
export function gameHoursAt(minute){const m=((minute%60)+60)%60;let i=0;while(i<DAY_KEYS.length-2&&m>DAY_KEYS[i+1][0])i++;
  const [m0,h0]=DAY_KEYS[i],[m1,h1]=DAY_KEYS[i+1];return (h0+(h1-h0)*(m-m0)/(m1-m0))%24;}
// Dev panel (owner only, test-friends.js): a fixed hour for testing, kept on this device until "Live clock".
const DEV_HOUR_KEY='trottville-dev-hour';let devHour=null;try{const v=globalThis.localStorage?.getItem(DEV_HOUR_KEY);if(v!=null&&v!==''&&Number.isFinite(+v))devHour=+v;}catch{}
export const devHourNow=()=>devHour;
export function setDevHour(h){devHour=h==null?null:((+h%24)+24)%24;try{if(devHour==null)localStorage.removeItem(DEV_HOUR_KEY);else localStorage.setItem(DEV_HOUR_KEY,String(devHour));}catch{}}
// v94: the moon follows the REAL moon (0 new … 1 full), so a full-moon week gives bright, blue, glowing nights.
// The dev panel can pin it (full / none) until "Real moon".
const DEV_MOON_KEY='trottville-dev-moon';let devMoon=null;try{const v=globalThis.localStorage?.getItem(DEV_MOON_KEY);if(v!=null&&v!==''&&Number.isFinite(+v))devMoon=+v;}catch{}
export const devMoonNow=()=>devMoon;
export function setDevMoon(v){devMoon=v==null?null:Math.min(1,Math.max(0,+v));try{if(devMoon==null)localStorage.removeItem(DEV_MOON_KEY);else localStorage.setItem(DEV_MOON_KEY,String(devMoon));}catch{}}
export function moonFull(d=new Date()){if(devMoon!=null)return devMoon;const syn=29.530588853,age=(((d.getTime()-Date.UTC(2000,0,6,18,14))/864e5)%syn+syn)%syn;return (1-Math.cos(2*Math.PI*age/syn))/2;}
export const gameHours=(d=new Date())=>devHour!=null?devHour:gameHoursAt(d.getMinutes()+d.getSeconds()/60+d.getMilliseconds()/60000);
// Roosters crow for the first five minutes of every hour (the game's dawn and early morning).
export const roosterTime=(d=new Date())=>d.getMinutes()<5;
// Owls hoot in the deep of the game night.
export const owlTime=h=>h>=22||h<4;
const hex=s=>[parseInt(s.slice(1,3),16)/255,parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255];
const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

// Sky, light and colour for an hour (0–24, fractions allowed). Colours come back as [r,g,b] 0–1 (sRGB).
export function skyAt(hours){const h=((hours%24)+24)%24;let i=0;while(KEYS[i+1].h<=h&&i<KEYS.length-2)i++;
  const a=KEYS[i],b=KEYS[i+1],t=smooth(0,1,(h-a.h)/(b.h-a.h)),out={hours:h};
  for(const k of Object.keys(a)){if(k==='h')continue;out[k]=typeof a[k]==='string'?hex(a[k]).map((v,j)=>mix(v,hex(b[k])[j],t)):mix(a[k],b[k],t);}
  // The sun rises in the east (+x), passes south (+z) and sets in the west (−x).
  const az=Math.PI*Math.min(1.08,Math.max(-.08,(h-SUNRISE)/(SUNSET-SUNRISE))),e=out.elev*Math.PI/180;
  out.sunDir=[Math.cos(az)*Math.cos(e),Math.sin(e),Math.sin(az)*Math.cos(e)];
  out.glowAmt=smooth(-6,4,out.elev)*(1-smooth(8,22,out.elev))+.15;// the warm horizon glow is strongest when the sun is low
  out.phase=phaseName(h);return out;}

export function phaseName(h){return h<5||h>=21.6?'Night':h<6.5?'Dawn':h<11?'Morning':h<14?'Midday':h<18.5?'Afternoon':h<19.6?'Golden hour':h<20.6?'Sunset':'Dusk';}
// Morning glories open with the sun and close by early afternoon.
export const gloryOpen=h=>smooth(5.3,6.6,h)*(1-smooth(11,12.6,h));
export function clockLabel(hours){const h=((hours%24)+24)%24,hh=Math.floor(h),mm=Math.floor((h-hh)*60),p=hh>=12?'pm':'am';return `${hh%12||12}:${String(mm).padStart(2,'0')} ${p}`;}

// What each weather does. cloud = sky cover, rain/snow = particle amount, fog = 0–1, dim = how much light it
// takes away, wind = 0–1 (pushes you a little at 1), speed = movement multiplier (mud, snow).
export const WEATHER={
  clear:   {label:'Clear',        icon:'☀️',cloud:.12,rain:0, snow:0,fog:0, dim:0,  grey:0,  wind:.15,speed:1},
  partly:  {label:'Partly cloudy',icon:'⛅',cloud:.5, rain:0, snow:0,fog:0, dim:.08,grey:.05,wind:.3, speed:1},
  overcast:{label:'Cloudy',       icon:'☁️',cloud:1,  rain:0, snow:0,fog:.15,dim:.45,grey:.55,wind:.35,speed:1},
  fog:     {label:'Foggy',        icon:'🌫️',cloud:.8, rain:0, snow:0,fog:1, dim:.4, grey:.6, wind:.05,speed:1},
  rain:    {label:'Rain',         icon:'🌧️',cloud:1,  rain:.7,snow:0,fog:.3,dim:.6,grey:.6, wind:.45,speed:.9},
  storm:   {label:'Thunderstorm', icon:'⛈️',cloud:1,  rain:1, snow:0,fog:.4,dim:.75,grey:.7, wind:1,  speed:.8},
  windy:   {label:'Windy',        icon:'🌬️',cloud:.4, rain:0, snow:0,fog:0, dim:.05,grey:.05,wind:1,  speed:1},
  snow:    {label:'Snow',         icon:'🌨️',cloud:1,  rain:0, snow:1,fog:.35,dim:.3, grey:.5, wind:.3, speed:.85},
};
const WEIGHTS=[['clear',34],['partly',24],['overcast',12],['rain',12],['storm',4],['fog',6],['windy',8]];
const WINTER=new Set([11,0,1]);// Dec, Jan, Feb (Date months)

function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>13;h=Math.imul(h,0x5bd1e995);return ((h^(h>>>15))>>>0)/4294967296;}
function draw(r){let total=WEIGHTS.reduce((s,[,w])=>s+w,0),x=r*total;for(const [k,w] of WEIGHTS){if((x-=w)<0)return k;}return 'clear';}

// The weather for a moment (2026-11-16, Yoshi: "weather cycles should be a few minutes"): 4-minute spells, each 45%
// likely to keep the one before. Rain/storm last at most 2 spells (8 min) before it clears to cloud; a storm only
// grows out of rain; fog only in the game's early morning. Seeded by date + spell, so everyone sees the same sky.
// The dev panel can pin a weather on this device (setDevWeather) until "Live weather".
export const SPELL_MIN=4;
const DEV_WEATHER_KEY='trottville-dev-weather';let devWeather=null;try{const v=globalThis.localStorage?.getItem(DEV_WEATHER_KEY);if(v)devWeather=v;}catch{}
export const devWeatherNow=()=>devWeather;
export function setDevWeather(k){devWeather=k&&WEATHER[k]?k:null;try{if(devWeather)localStorage.setItem(DEV_WEATHER_KEY,devWeather);else localStorage.removeItem(DEV_WEATHER_KEY);}catch{}}
const WET_KINDS=new Set(['rain','storm']);
export const spellOf=d=>Math.floor((d.getHours()*60+d.getMinutes())/SPELL_MIN);
// Walks the day from midnight (≤ 360 steps) so every spell agrees with the one before; the last answer is cached.
let memoKey='',memoKind='clear';
function spellKind(y,m,d,spell){const key=`${y}-${m}-${d}-${spell}`;if(key===memoKey)return memoKind;const from=0;let kind='clear',wet=0;
  for(let b=from;b<=spell;b++){if(b===from||hash(`${y}-${m}-${d}-${b}`)>=.45)kind=draw(hash(`${y}-${m}-${d}-${b}-pick`));
    const gh=gameHoursAt((b*SPELL_MIN)%60);if(kind==='fog'&&!(gh>=3&&gh<10))kind='partly';
    if(kind==='storm'&&!wet)kind='rain';if(kind==='rain'&&wet===1&&hash(`${y}-${m}-${d}-${b}-storm`)<.3)kind='storm';   // rain sometimes builds to thunder
    if(WET_KINDS.has(kind)&&wet>=2)kind='overcast';
    wet=WET_KINDS.has(kind)?wet+1:0;}
  if(WINTER.has(m)&&WET_KINDS.has(kind))kind='snow';memoKey=key;memoKind=kind;return kind;}
export function weatherAt(date=new Date()){if(devWeather)return devWeather;return spellKind(date.getFullYear(),date.getMonth(),date.getDate(),spellOf(date));}
// The live weather a number of spells before `date` (same day only; null before midnight).
export function weatherSpellsAgo(date,n){const s=spellOf(date)-n;return s<0?null:spellKind(date.getFullYear(),date.getMonth(),date.getDate(),s);}
// Biomes bend the weather: snow in Frostfall, no rain or fog in the dunes (wind instead).
export function localWeather(kind,biome){if(biome==='snow'&&(kind==='rain'||kind==='storm'))return 'snow';
  if(biome==='desert'){if(kind==='rain'||kind==='storm'||kind==='snow')return 'windy';if(kind==='fog')return 'clear';}
  return kind;}

// Snow cover on the ground (0–1): settles in about 40 s while it snows, melts over about 4 minutes after.
// snow = the current snowfall amount (0–1); dt in seconds.
export function snowCoverStep(cover,snow,dt){
  return snow>.3?Math.min(1,cover+dt/40*Math.min(1,snow*1.4)):Math.max(0,cover-dt/240);}

// The short line for the HUD, e.g. "🌇 7:42 pm · Clear".
export function skyLabel(hours,kind){const p=phaseName(((hours%24)+24)%24),w=WEATHER[kind]||WEATHER.clear;
  const icon=(kind==='clear'||kind==='partly')?({Night:'🌙',Dusk:'🌆',Dawn:'🌄','Golden hour':'🌇',Sunset:'🌇'}[p]||w.icon):w.icon;
  return `${icon} ${clockLabel(hours)} · ${kind==='clear'?p:w.label}`;}
