// Background music: one looping tune per place, cross-faded when you move between them.
// Tunes are files in assets/music/<id>.mp3 (made in ElevenLabs, each ~27 s with its end already blended into its
// start, so a Web Audio loop is gapless). A missing file is simply silent. Music starts after the first tap (phone
// autoplay rules), stops while the page is hidden, and has its own switch (localStorage trottville-music-v1 = 'off'),
// separate from Sounds. Only the playing tune and the last two are kept decoded (phone memory).
//   want(place) → place = a tune id below, or 'stall' | 'valley' | 'town' (holiday tune if one is on, else ranch /
//   town square), or 'games' | 'race' | null (silence).
import {audioContext} from './sfx.js?v=158';
export const TRACKS={winter:'Winter',desert:'Desert',forest:'Forest',town:'Town square',ranch:'Ranch',beach:'Beach',
  sky:'Sky island',glowmoss:'Glowmoss Hollow',night:'Night',winterlights:'Winterlights',harvest:'Harvest Time',
  spring:'Spring',summerfair:'Summer Fair'};
const KEY='trottville-music-v1',VOLUME=.4,FADE=2.5,KEEP=3;
// Holiday tunes by date: Winterlights Dec 1 – Jan 6, Harvest Time all October, Spring Mar 20 – May 31, Summer Fair July.
export function holidayTune(d=new Date()){const m=d.getMonth(),day=d.getDate();
  if(m===11||(m===0&&day<=6))return 'winterlights';if(m===9)return 'harvest';if((m===2&&day>=20)||m===3||m===4)return 'spring';
  if(m===6)return 'summerfair';return null;}
function resolve(place){if(place==='stall'||place==='valley')return holidayTune()||'ranch';if(place==='town')return holidayTune()||'town';
  return TRACKS[place]?place:null;}

const buffers=new Map(),missing=new Set();let wanted=null,voice=null,out=null;
export const musicOn=()=>{try{return localStorage.getItem(KEY)!=='off';}catch{return true;}};
// Decode once; keep the newest KEEP (Map order = last used), never dropping the one playing.
function load(ctx,id){let p=buffers.get(id);if(p){buffers.delete(id);buffers.set(id,p);return p;}
  p=fetch(`assets/music/${id}.mp3`).then(r=>{if(!r.ok)throw new Error(r.status);return r.arrayBuffer();})
    .then(b=>new Promise((ok,no)=>{const q=ctx.decodeAudioData(b,ok,no);q?.then?.(ok,no);}))
    .catch(()=>{missing.add(id);buffers.delete(id);return null;});
  buffers.set(id,p);for(const k of buffers.keys()){if(buffers.size<=KEEP)break;if(k!==id&&k!==voice?.id)buffers.delete(k);}return p;}
function fadeOut(v,ctx){if(!v?.src)return;          // still loading: the load callback sees it's no longer current
  const t=ctx.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setValueAtTime(v.gain.gain.value,t);
  v.gain.gain.linearRampToValueAtTime(0,t+FADE);try{v.src.stop(t+FADE+.05);}catch{}}
function apply(){const id=musicOn()&&!document.hidden?wanted:null;const ctx=audioContext();if(!ctx)return;
  if(!out){out=ctx.createGain();out.connect(ctx.destination);}
  if(voice?.id===id)return;
  fadeOut(voice,ctx);voice=null;if(!id||missing.has(id))return;
  const v={id,src:null,gain:null};voice=v;
  load(ctx,id).then(buf=>{if(voice!==v||!buf)return;           // moved on while it loaded
    const t=ctx.currentTime;v.src=ctx.createBufferSource();v.src.buffer=buf;v.src.loop=true;v.gain=ctx.createGain();
    v.gain.gain.setValueAtTime(0,t);v.gain.gain.linearRampToValueAtTime(VOLUME,t+FADE);v.src.connect(v.gain).connect(out);v.src.start(t);});}
export function want(place){wanted=resolve(place);apply();}
export function setMusic(on){try{localStorage.setItem(KEY,on?'on':'off');}catch{}apply();window.dispatchEvent(new CustomEvent('trottville:music',{detail:{on}}));}
export const current=()=>voice?.id||null;
document.addEventListener('visibilitychange',apply);
// The first tap anywhere unlocks audio on phones.
addEventListener('pointerdown',()=>{if(wanted&&!voice)apply();},{capture:true});
