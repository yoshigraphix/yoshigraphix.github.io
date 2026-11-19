// Home, stage 2: Stable and Games open as panels over the 3D stall instead of leaving it (horselandia.js is a
// classic script; it calls window.TrottPanels.open(kind) and dispatches 'trottville:rendered' after every render).
// Game pages (board games, valley games, the steeplechase) play in a full-screen frame over home and post
// 'trottville:close-board' to come back, exactly as they do inside the 3D world.
import {BARN_GAMES} from './world-content.mjs?v=158';
import {iconHTML,GAME_PX} from './pixel-icons.js?v=158';
import {BOARD_GAMES} from './board-games.mjs?v=158';
import {VALLEY_GAMES} from './valley-games.mjs?v=158';
import {log} from './play-log.js?v=158';
import {devStatsBoot} from './test-friends.js?v=158';
devStatsBoot();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let panel=null,frame=null;

function shell(kind,title,body){close();panel=document.createElement('div');panel.className='hp-panel';panel.dataset.kind=kind;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',title);
  panel.innerHTML=`<div class="hp-card"><header><h2>${esc(title)}</h2><button type="button" class="hp-x" aria-label="Close">×</button></header><div class="hp-body">${body}</div></div>`;
  document.body.append(panel);requestAnimationFrame(()=>panel?.classList.add('in'));panel.querySelector('.hp-x').focus({preventScroll:true});return panel;}
export function close(){panel?.remove();panel=null;}

// The stable: the same page as #stable, drawn inside the panel and redrawn after every render while open.
function stableBody(){return window.TrottHome?.stableHTML?.()||'<p>Your stable is loading…</p>';}
function openStable(){shell('stable','My stable',stableBody());}

// One emoji style for every tile: the barn games' world icons are plain glyphs (♧ ▤ ◒), so the menu gives them
// emoji and colours here; repeated emoji (three 🌾, two 🐎) are split so each game reads at a glance.
const LOOK={muck:['🧹','#b9a06a'],hay:['🌾','#d8b44a'],water:['🪣','#6fb2d9'],groom:['✨','#c99ad8'],tack:['🃏','#e08a7a'],
  hayland:['🗺️'],fling:['🎯','#d8b44a'],steeple:['🏇','#8cc46f'],haystakes:['🏁']};
const card=(g,attrs)=>{const [icon,color]=LOOK[g.id]||[];return `<button type="button" class="hp-game" ${attrs} style="--c:${color||g.color||'#8cc46f'}"><span class="hp-icon" aria-hidden="true">${iconHTML(icon||g.icon,GAME_PX[g.id],'px-lg')}</span><b>${esc(g.name)}</b><small>${esc(g.blurb||g.description||'')}</small></button>`;};
function openGames(){
  const barn=BARN_GAMES.filter(g=>g.where==='barn').map(g=>card(g,`data-hp-world="game:${g.id}"`)).join('');
  const out=[{id:'feed',name:'Appleoosa',icon:'🍎',description:'Sort apples on the orchard belt.',intent:'game:feed'},
    {id:'fling',name:'Hay’s for Horses',icon:'🌾',description:'Fling hay bales into the loft.',intent:'game:fling'},
    {id:'steeple',name:'Steeplechase',icon:'🐎',description:'Jump farm fences on horseback.',intent:'steeple'}].map(g=>card(g,`data-hp-world="${g.intent}"`)).join('');
  shell('games','Games',`<h3 class="hp-h">Valley games</h3><div class="hp-grid">${VALLEY_GAMES.map(g=>card(g,`data-hp-page="${esc(g.file)}" data-hp-name="${esc(g.name)}"`)).join('')}</div>
    <h3 class="hp-h">In the barn</h3><div class="hp-grid">${barn}</div>
    <h3 class="hp-h">Out riding</h3><div class="hp-grid">${out}</div>
    <h3 class="hp-h">Board games</h3><div class="hp-grid">${BOARD_GAMES.map(g=>card(g,`data-hp-page="${esc(g.file)}" data-hp-name="${esc(g.name)}"`)).join('')}</div>`);}

// A game page in a full-screen frame over home.
export function openPage(file,name='Game'){closeFrame();frame=document.createElement('div');frame.className='hp-frame';
  const f=document.createElement('iframe');f.title=name;f.src=file+(file.includes('?')?'&':'?')+'in=world';f.allow='fullscreen';frame.append(f);document.body.append(frame);
  window.TrottAudio?.want('games');log('game',{id:file.replace(/\.html.*/,''),from:'home'});}
function closeFrame(){if(!frame)return;frame.remove();frame=null;window.TrottAudio?.want('stall');}
addEventListener('message',e=>{if(frame&&e.source===frame.querySelector('iframe')?.contentWindow&&(e.data==='trottville:close-board'||e.data==='trottville:close-steeple'))closeFrame();});

export function open(kind){if(kind==='stable')openStable();else if(kind==='games')openGames();}
document.addEventListener('click',e=>{if(!panel)return;
  if(e.target===panel||e.target.closest('.hp-x')){close();return;}
  const page=e.target.closest('[data-hp-page]');if(page){close();openPage(page.dataset.hpPage,page.dataset.hpName);return;}
  const w=e.target.closest('[data-hp-world]');if(w){close();window.TrottHome?.goWorld?.(w.dataset.hpWorld);return;}
  // Anything that leaves home (a horse profile, another page) closes the panel.
  if(e.target.closest('[data-route],a[href^="#"]'))queueMicrotask(()=>{if(location.hash&&!/^#(home)?$/.test(location.hash))close();});});
addEventListener('trottville:rendered',()=>{if(panel?.dataset.kind==='stable'){const b=panel.querySelector('.hp-body'),y=b.scrollTop;b.innerHTML=stableBody();b.scrollTop=y;}});
addEventListener('hashchange',()=>{if(!/^#(home)?$/.test(location.hash))close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel){close();}});
window.TrottPanels={open,close,openPage};
