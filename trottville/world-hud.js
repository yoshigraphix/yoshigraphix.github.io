// World HUD v47 (2026-11-09): Pokémon-GO-style layout over the 3D world.
// On screen (used all the time): place + compass + quest (top-left), coins + sky (top-right), Map (right),
// Interact / Jump / Mount + the profile disc (bottom-right). The profile disc shows your horse, its level, and a
// stamina ring while riding; tap it for the menu with the tools you only need now and then.
// The original buttons are MOVED (not copied), so their ids and handlers in world.js keep working.
import {horsePortrait} from './horse-portrait.js?v=158';

const MENU=[['#world-companions-toggle','Horses'],['#world-journal','To-do'],['#world-barn','Barn games'],['#world-style','Me'],
  ['#world-friends','Friends'],['#world-camera-toggle','Camera'],['#world-fullscreen','Fullscreen'],['#world-exit','Exit']];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const horseLevel=h=>Math.floor(Math.sqrt((h?.xp||0)/40))+1;

export function createHud({stage}){
  const $=s=>stage.querySelector(s);
  stage.classList.add('hud-v2');
  const watchers=[];const watch=(el,fn,opts)=>{if(!el)return;const m=new MutationObserver(fn);m.observe(el,opts);watchers.push(m);fn();};

  // Top-left column: place, compass, quest.
  const tl=document.createElement('div');tl.className='hud-tl';stage.append(tl);
  const place=document.createElement('div');place.className='hud-place';place.innerHTML='<svg class="hud-pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg><b></b>';tl.append(place);
  watch($('#world-location'),()=>{place.querySelector('b').textContent=$('#world-location')?.textContent||'';},{childList:true,characterData:true,subtree:true});
  const compass=document.createElement('div');compass.className='hud-compass';compass.hidden=true;
  compass.innerHTML='<i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2l6 18-6-4-6 4z"/></svg></i><span><b></b><small></small></span>';tl.append(compass);
  const pill=$('.wq-pill');if(pill){tl.append(pill);
    // UI pass 2026-11-10: the Quest Log button gets a line-drawn book to match Map and the menu (was the 📖 emoji).
    const book=pill.querySelector('.wq-book');if(book)book.innerHTML='<img class="px-ic world-px" src="assets/icons/book.webp" alt="" aria-hidden="true" draggable="false">';}

  // Top-right column: coins, sky. Clear-sky emoji become Yoshi's pixel sun/moon/sunrise/sunset (2026-11-10).
  const SKY_PX={'☀':'sun','🌙':'moon','🌄':'sunrise','🌅':'sunrise','🌇':'sunset','🌆':'sunset','⛅':'wx-partly','☁':'wx-cloudy','🌫':'wx-fog','🌧':'wx-rain','⛈':'wx-storm','🌬':'wx-wind','🌨':'wx-snow','🌈':'rainbow'};
  const tr=document.createElement('div');tr.className='hud-tr';stage.append(tr);
  const coins=$('.world-coins');if(coins)tr.append(coins);
  const sky=document.createElement('div');sky.className='hud-sky';sky.innerHTML='<i aria-hidden="true"></i><small></small>';tr.append(sky);
  watch($('#world-weather'),()=>{const t=($('#world-weather')?.textContent||'').trim();const m=t.match(/^(\S+)\s+(.*?)(?:\s·\s(.*))?$/);
    const em=m?m[1]:'☀️',px=SKY_PX[em.replace(/\uFE0F/g,'')];const night=/Night|Dusk|Midnight/.test(t)||em.startsWith('🌙');sky.classList.toggle('is-night',night);sky.querySelector('i').innerHTML=px?`<img class="px-ic" src="assets/icons/${px}.webp" alt="" draggable="false">`:em;sky.querySelector('small').textContent=m?m[2]:t;sky.title=t;sky.setAttribute('aria-label',t);},{childList:true,characterData:true,subtree:true});

  // v152 (2026-11-17, Yoshi: "unify and make it amazing, think Pokémon GO"): one bottom dock, the same bar as the
  // home stall: horse disc · Map · big raised Ride in the middle · Jump · Friends. Contextual Interact floats above it.
  const side=document.createElement('div');side.className='hud-side';stage.append(side);
  const dock=document.createElement('nav');dock.className='hud-dock';dock.setAttribute('aria-label','Actions');stage.append(dock);
  const slot=(el,cap,cls='')=>{if(!el)return null;el.classList.add('hud-dock-btn');if(cls)el.classList.add(cls);el.dataset.cap=cap;dock.append(el);return el;};
  const map=$('#world-map');

  // Profile disc + menu.
  const prof=document.createElement('button');prof.type='button';prof.className='hud-profile';prof.setAttribute('aria-haspopup','dialog');prof.setAttribute('aria-expanded','false');prof.setAttribute('aria-label','Your horse and menu');
  prof.innerHTML='<svg class="hud-ring" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="37"/><circle class="hud-ring-fill" cx="40" cy="40" r="37" pathLength="100"/></svg><span class="hud-face"><img alt=""></span><b class="hud-lvl">1</b><i class="hud-dot" hidden></i>';
  slot(prof,'Menu','hud-dock-prof');slot(map,'Map');
  const mountB=slot($('#world-mount'),'Ride','hud-dock-main');slot($('#world-jump'),'Jump');
  // Short caption under the big button, following world.js's own label (Ride / Mount / Get off / Call / Back).
  watch(mountB,()=>{const t=mountB?.getAttribute('aria-label')||'';const c=/^Dismount/.test(t)?'Get off':/^Mount/.test(t)?'Mount':/^Ride/.test(t)?'Ride':/^Back/.test(t)?'Back':'Call';if(mountB&&mountB.dataset.cap!==c)mountB.dataset.cap=c;},{attributes:true,attributeFilter:['aria-label']});
  const sheet=document.createElement('div');sheet.className='hud-menu';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Menu');
  sheet.innerHTML='<div class="hud-menu-card"><header><span class="hud-face big"><img alt=""></span><div><b class="hud-name">Your horse</b><small class="hud-sub"></small><span class="hud-xp"><i></i></span></div></header><div class="hud-grid"></div></div>';
  stage.append(sheet);
  const grid=sheet.querySelector('.hud-grid');
  for(const [sel,label]of MENU){const b=$(sel);if(!b)continue;b.classList.add('hud-tile');
    if(!b.querySelector('.world-icon-caption')){const c=document.createElement('span');c.className='world-icon-caption';c.setAttribute('aria-hidden','true');b.append(c);}
    if(sel!=='#world-mount')b.querySelector('.world-icon-caption').textContent=label;grid.append(b);}
  // AR photo (note #27): step 1 is a camera test; the module loads only when tapped.
  const ar=document.createElement('button');ar.type='button';ar.className='world-icon hud-tile hud-ar';ar.setAttribute('aria-label','AR photo');
  ar.innerHTML='<img class="px-ic world-px" src="assets/icons/ar.webp" alt="" aria-hidden="true" draggable="false"><span class="world-icon-caption" aria-hidden="true">AR photo</span>';
  let lastHorse=null;ar.onclick=()=>import('./ar-photo.js?v=158').then(m=>m.openArPhoto({stage,horse:lastHorse}));grid.insertBefore(ar,grid.querySelector('#world-camera-toggle'));
  // v113: Collections (horseshoes, wildflowers, bottles, bug jar, scrapbook). world.js listens for the event.
  const col=document.createElement('button');col.type='button';col.className='world-icon hud-tile hud-col';col.setAttribute('aria-label','Collections');
  col.innerHTML='<span class="world-px" aria-hidden="true" style="font-size:30px;line-height:44px">📖</span><span class="world-icon-caption" aria-hidden="true">Collections</span>';
  col.onclick=()=>{open(false);window.dispatchEvent(new Event('trottville:collections'));};grid.insertBefore(col,ar);
  {const fr=$('#world-friends');if(fr){fr.classList.remove('hud-tile');slot(fr,'Friends');}}
  const exit=grid.querySelector('#world-exit');if(exit){exit.classList.add('hud-exit');sheet.querySelector('.hud-menu-card header').append(exit);}
  const open=v=>{sheet.hidden=!v;prof.classList.toggle('open',v);prof.setAttribute('aria-expanded',String(v));};
  prof.addEventListener('click',()=>open(sheet.hidden));
  // A tile does its own job first (its handler runs on the button), then the menu tucks away.
  sheet.addEventListener('click',e=>{if(e.target===sheet||e.target.closest('.hud-tile'))open(false);});
  const onKey=e=>{if(e.key==='Escape'&&!sheet.hidden)open(false);};document.addEventListener('keydown',onKey);

  // Stamina ring + pending-coins dot, read from the existing elements so world.js stays the source of truth.
  const stam=$('#world-stamina');
  watch(stam,()=>{const on=stam&&!stam.hidden,w=parseFloat(stam?.querySelector('b')?.style.width)||100;
    prof.classList.toggle('riding',on);prof.classList.toggle('low',!!stam?.classList.contains('low'));prof.classList.toggle('hot',!!stam?.classList.contains('hot'));
    prof.style.setProperty('--stam',on?w:0);},{attributes:true,subtree:true});
  watch(coins,()=>{prof.querySelector('.hud-dot').hidden=!coins?.classList.contains('tc-has-pending');},{attributes:true,attributeFilter:['class']});

  let lastKey='';
  return {
    horse(h,mounted){if(!h)return;lastHorse=h;const lvl=horseLevel(h),key=[h.id,lvl,mounted,h.name].join('|');if(key===lastKey)return;lastKey=key;
      const src=horsePortrait(h,{shot:'head',w:160});stage.querySelectorAll('.hud-face img').forEach(img=>{if(src)img.src=src;});
      prof.querySelector('.hud-lvl').textContent=lvl;prof.setAttribute('aria-label',`${h.name}, level ${lvl}. Open menu`);
      sheet.querySelector('.hud-name').textContent=h.name;
      sheet.querySelector('.hud-sub').textContent=`Level ${lvl} · ${mounted?'riding together':'walking beside you'}`;
      const xp=h.xp||0,lo=40*(lvl-1)**2,hi=40*lvl**2;sheet.querySelector('.hud-xp i').style.width=Math.max(4,Math.min(100,(xp-lo)/(hi-lo)*100))+'%';},
    track(name,dist,angle){if(!name){compass.hidden=true;return;}compass.hidden=false;
      compass.querySelector('b').textContent=name;compass.querySelector('small').textContent=dist+' m';
      compass.querySelector('i').style.transform=`rotate(${angle}rad)`;},
    open,
    dispose(){watchers.forEach(m=>m.disconnect());document.removeEventListener('keydown',onKey);}
  };
}
