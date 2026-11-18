// Sounds + Music switches and music outside the 3D world (horselandia.js is a classic script, so it can't import).
// Any button with data-audio="sounds" or data-audio="music" toggles that switch and repaints its own label.
// Outside the world every page plays the home stall track; world.js picks the world's tracks itself.
import {soundsOn,setSounds,sfx} from './sfx.js?v=157';
import {musicOn,setMusic,want} from './music.js?v=157';
export const gfxOn=()=>{try{return localStorage.getItem('trottville-gfx')!=='lite';}catch{return true;}};
export const audioLabel=kind=>kind==='gfx'?(gfxOn()?'✨ Pretty effects on':'✨ Pretty effects off'):kind==='music'?(musicOn()?'🎵 Music on':'🎵 Music off'):(soundsOn()?'🔊 Sounds on':'🔇 Sounds off');
function paint(){for(const b of document.querySelectorAll('[data-audio]')){b.textContent=audioLabel(b.dataset.audio);b.setAttribute('aria-pressed',String(b.dataset.audio==='gfx'?gfxOn():b.dataset.audio==='music'?musicOn():soundsOn()));}}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-audio]');if(!b)return;
  if(b.dataset.audio==='gfx'){const on=!gfxOn();try{localStorage.setItem('trottville-gfx',on?'full':'lite');}catch{}window.dispatchEvent(new CustomEvent('trottville:gfx',{detail:{on}}));}
  else if(b.dataset.audio==='music')setMusic(!musicOn());else{setSounds(!soundsOn());if(soundsOn())sfx('pop');}paint();});
addEventListener('trottville:gfx',()=>paint());
new MutationObserver(()=>{if(document.querySelector('[data-audio]:not([aria-pressed])'))paint();}).observe(document.body,{childList:true,subtree:true});
const route=()=>location.hash.slice(1).split(/[/?&]/)[0]||'home';
function placeMusic(){if(route()!=='world')want('stall');}
addEventListener('hashchange',placeMusic);placeMusic();paint();
window.TrottAudio={sfx,want,audioLabel};
