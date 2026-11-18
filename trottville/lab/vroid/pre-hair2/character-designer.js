// Character designer: a full-screen overlay with a live 3D preview of your rider and tabs for hair, eyes, face,
// nose & mouth, outfits and the card shop. Outfits come in three tiers: free, coins (earned by playing) and
// stars (from Trottville Game Cards). Locked outfits can be tried on; Done keeps only what you own.
// Card sales are not switched on in this practice version: only practice codes redeem, saved on this device.
import * as T from './vendor/three-0.180.0/three.module.js';
import {makeChibiCharacter} from './chibi-character.js';
import {canBuy,buyCard,claimStars,paymentsMode} from './star-shop.js';
import {log as playLog,askWouldBuy} from './play-log.js';
import {HAIR_STYLES,HAIR_GROUPS,HAIR_COLORS,HAIR_TIPS,EYE_SHAPES,EYE_COLORS,FACES,SKINS,NOSES,NOSE_SIZES,MOUTHS,BLUSHES,EYESHADOWS,LIPS,LINERS,OUTFITS,GAME_CARDS,normalizeLook,loadLook,saveLook,loadWallet,saveWallet,owns,buyOutfit,redeemCard} from './character-looks.mjs';

const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TABS=[['hair','Hair'],['eyes','Eyes'],['face','Face & skin'],['nosemouth','Nose & mouth'],['makeup','Makeup'],['outfits','Outfits'],['shop','Card shop']];
// A crossed-out swatch for "none".
const NONE_SW='linear-gradient(135deg,#fff 44%,#d9534a 44%,#d9534a 56%,#fff 56%)';

export function openDesigner(host,{onSave,onClose,tab='hair'}={}){
  let shopLogged=false,look=loadLook(),wallet=loadWallet(),saved=look.outfit,active=tab,hairGroup=(HAIR_STYLES.find(h=>h[0]===look.hair)||HAIR_STYLES[0])[2],character=null,raf=0,yaw=0,drag=null,closed=false;
  const root=document.createElement('div');root.className='cdz';root.setAttribute('role','dialog');root.setAttribute('aria-label','Character designer');
  root.innerHTML=`<header class="cdz-top"><b>Your rider</b><span class="cdz-purse" aria-live="polite"></span><button type="button" class="cdz-close" aria-label="Close">✕</button></header>
    <div class="cdz-stage"><canvas aria-label="Your rider. Drag to turn."></canvas></div>
    <nav class="cdz-tabs" role="tablist">${TABS.map(([id,l])=>`<button type="button" role="tab" data-cdz-tab="${id}">${l}</button>`).join('')}</nav>
    <section class="cdz-panel"></section>
    <footer class="cdz-foot"><div class="cdz-buy" hidden></div><button type="button" class="cdz-done">Done</button></footer>
    <div class="cdz-modal" hidden><div class="cdz-modal-card"></div></div><div class="cdz-toast" role="status"></div>`;
  host.append(root);
  const $=s=>root.querySelector(s),canvas=$('canvas');

  // ---- 3D preview ----
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(26,1,.1,50),turn=new T.Group();scene.add(turn);
  const sun=new T.DirectionalLight('#fff0d8',3);sun.position.set(-3,6,6);scene.add(sun,new T.HemisphereLight('#f4fbff','#90ac6a',2.1));
  const pad=new T.Mesh(new T.CylinderGeometry(.9,.95,.12,40),new T.MeshStandardMaterial({color:'#8cc66e',roughness:1}));pad.position.y=-.06;turn.add(pad);
  const camAt={y:1,d:5.2},camGoal={y:1,d:5.2};
  function rebuild(){character?.dispose();character=makeChibiCharacter(T,look);turn.add(character.root);}
  function frameFor(t){Object.assign(camGoal,['outfits','shop'].includes(t)?{y:1,d:5.4}:{y:1.66,d:2.3});}
  function resize(){const r=canvas.parentElement.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:yaw};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(drag)yaw=drag.y+(e.clientX-drag.x)*.012;});
  const end=()=>{drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  let last=performance.now();
  function loop(now){const dt=Math.min(.1,(now-last)/1000);last=now;if(!drag){yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));yaw+=(Math.sin(now*.0007)*.35-yaw)*Math.min(1,dt*1.5);}turn.rotation.y=yaw;
    camAt.y+=(camGoal.y-camAt.y)*Math.min(1,dt*6);camAt.d+=(camGoal.d-camAt.d)*Math.min(1,dt*6);
    camera.position.set(0,camAt.y+.15,camAt.d);camera.lookAt(0,camAt.y,0);character?.update(dt,{pose:'stand'});renderer.render(scene,camera);raf=requestAnimationFrame(loop);}

  // ---- Panels ----
  const chips=(key,list)=>`<div class="cdz-chips">${list.map(([v,l])=>`<button type="button" data-set="${key}" data-v="${v}" aria-pressed="${String(look[key])===v}">${esc(l)}</button>`).join('')}</div>`;
  const swatches=(key,list,label)=>`<div class="cdz-swatches" aria-label="${label}">${list.map(c=>`<button type="button" data-set="${key}" data-v="${c}" aria-pressed="${look[key]===c}" aria-label="${label} ${c==='none'?'none':c}" style="--sw:${c==='none'?NONE_SW:c}"></button>`).join('')}</div>`;
  const onOff=[['false','Off'],['true','On']];
  const tierBadge=o=>owns(wallet,o.id)?(look.outfit===o.id?'<em class="on">Wearing</em>':'<em>Owned</em>'):o.tier==='free'?'<em>Free</em>':o.tier==='coins'?`<em class="coin">🪙 ${o.price}</em>`:`<em class="star">⭐ ${o.price}</em>`;
  function paint(){
    $('.cdz-purse').innerHTML=`<span title="Trotties, earned by playing">🪙 ${wallet.coins}</span><span title="Stars, from Game Cards">⭐ ${wallet.stars}</span>`;
    root.querySelectorAll('[data-cdz-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.cdzTab===active)));
    const P=$('.cdz-panel');
    // 39 styles: pick a group first, then a style in it.
    if(active==='hair')P.innerHTML=`<h3>Style</h3><div class="cdz-chips cdz-hgroups">${HAIR_GROUPS.map(([g,l])=>`<button type="button" data-hgroup="${g}" aria-pressed="${hairGroup===g}">${esc(l)}</button>`).join('')}</div>`+
      `<div style="margin-top:10px">${chips('hair',HAIR_STYLES.filter(h=>h[2]===hairGroup))}</div><h3>Colour</h3>${swatches('hairColor',HAIR_COLORS,'Hair colour')}<h3>Tips</h3>${swatches('hairTip',HAIR_TIPS,'Hair tips')}`;
    if(active==='eyes')P.innerHTML=`<h3>Shape</h3>${chips('eyes',EYE_SHAPES)}<h3>Colour</h3>${swatches('eyeColor',EYE_COLORS,'Eye colour')}`;
    if(active==='face')P.innerHTML=`<h3>Face shape</h3>${chips('face',FACES)}<h3>Skin</h3>${swatches('skin',SKINS,'Skin tone')}`;
    if(active==='nosemouth')P.innerHTML=`<h3>Nose</h3>${chips('nose',NOSES)}<h3>Nose size</h3>${chips('noseSize',NOSE_SIZES)}<h3>Mouth</h3>${chips('mouth',MOUTHS)}`;
    if(active==='makeup')P.innerHTML=`<h3>Blush</h3>${swatches('blush',BLUSHES,'Blush')}<h3>Eyeshadow</h3>${swatches('eyeshadow',EYESHADOWS,'Eyeshadow')}<h3>Lip tint</h3>${swatches('lips',LIPS,'Lip tint')}`+
      `<h3>Eyeliner</h3>${chips('liner',LINERS)}<h3>Freckles</h3>${chips('freckles',onOff)}<h3>Beauty mark</h3>${chips('mole',onOff)}`;
    if(active==='outfits')P.innerHTML=[['free','Free basics'],['coins','Earn with Trotties'],['card','Game Card outfits']].map(([tier,title])=>`<h3>${title}</h3><div class="cdz-outfits">${OUTFITS.filter(o=>o.tier===tier).map(o=>`<button type="button" data-outfit="${o.id}" aria-pressed="${look.outfit===o.id}" class="${owns(wallet,o.id)?'':'locked'}"><span class="cdz-dots">${[o.colors.top,o.colors.trim,o.colors.bottom,o.colors.cape||o.colors.scarf||o.colors.boots].map(c=>`<i style="--c:${c}"></i>`).join('')}</span><b>${esc(o.name)}</b>${tierBadge(o)}</button>`).join('')}</div>`).join('')+
      `<p class="cdz-fine">Trotties come from playing: discover places, finish barn games like Appleoosa, ride to places on the map, and race. Stars come from Trottville Game Cards.</p>`;
    const selling=active==='shop'&&canBuy();if(active==='shop'&&shopLogged!==true){shopLogged=true;playLog('shop',{selling});}
    if(active==='shop')P.innerHTML=`<h3>Trottville Game Cards</h3><div class="cdz-cards">${GAME_CARDS.map(c=>{const inner=`<small>TROTTVILLE</small><b>$${c.dollars}</b><span>⭐ ${c.stars.toLocaleString()} stars</span>${c.bonus?`<em>${c.bonus}</em>`:''}`;
        return `<button type="button" class="cdz-card cdz-card-${c.dollars}" data-card="${c.id}" aria-label="${selling?'Buy':'The'} $${c.dollars} card, ${c.stars.toLocaleString()} stars">${inner}</button>`;}).join('')}</div>
      ${selling?`<p class="cdz-test">${paymentsMode()==='test'?'TEST MODE · no real money. Use Stripe’s test card 4242 4242 4242 4242.':'Tap a card to buy it. You’ll pay on Stripe’s secure page.'}</p>`:''}
      <div class="cdz-shop-actions">${selling?'':'<button type="button" data-info="buy">About Game Cards</button>'}<button type="button" data-info="gift">Send one as a gift</button></div>
      <h3>Redeem a card</h3><form class="cdz-redeem"><input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="TROT-XXXX-XXXX" aria-label="Card code"><button type="submit">Redeem</button></form>
      <p class="cdz-fine">${selling?'Game Cards are for players 13 and older. Stars you buy are added to this device’s wallet.':'Practice version: real cards aren’t on sale yet, and stars here are saved on this device only.'}</p>`;
    P.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{if(selling){buyCard(b.dataset.card,{toast,askAge});return;}
      askWouldBuy(GAME_CARDS.find(c=>c.id===b.dataset.card)).then(v=>{if(v!=null)toast(v?'Thanks! That helps a lot.':'Thanks for telling us.');});});
    P.querySelectorAll('[data-set]').forEach(b=>b.onclick=()=>{look=normalizeLook({...look,[b.dataset.set]:b.dataset.v});rebuild();paint();});
    P.querySelectorAll('[data-hgroup]').forEach(b=>b.onclick=()=>{hairGroup=b.dataset.hgroup;paint();});
    P.querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>{look={...look,outfit:b.dataset.outfit};rebuild();paint();});
    P.querySelectorAll('[data-info]').forEach(b=>b.onclick=()=>info(b.dataset.info));
    const f=P.querySelector('.cdz-redeem');if(f)f.onsubmit=e=>{e.preventDefault();const r=redeemCard(wallet,f.code.value);if(!r.ok){toast(r.reason);return;}wallet=r.wallet;saveWallet(wallet);f.code.value='';toast('Card added: +'+r.stars.toLocaleString()+' stars!');paint();};
    paintBuy();}
  // Trying on something you don't own shows what it costs, and how to earn it if you can't afford it yet.
  function paintBuy(){const bar=$('.cdz-buy'),o=OUTFITS.find(x=>x.id===look.outfit);
    if(!o||owns(wallet,o.id)){bar.hidden=true;return;}bar.hidden=false;const purse=o.tier==='card'?'stars':'coins',have=wallet[purse],icon=purse==='stars'?'⭐':'🪙';
    bar.innerHTML=have>=o.price?`<span>Trying on <b>${esc(o.name)}</b></span><button type="button" class="cdz-buy-go">Buy for ${icon} ${o.price}</button>`
      :`<span>Trying on <b>${esc(o.name)}</b>. You need ${icon} ${o.price-have} more.</span><button type="button" class="cdz-buy-how">${purse==='stars'?'Get stars':'How to earn'}</button>`;
    bar.querySelector('.cdz-buy-go')?.addEventListener('click',()=>{const r=buyOutfit(wallet,o.id);if(!r.ok){toast(r.reason);return;}wallet=r.wallet;saveWallet(wallet);toast(o.name+' is yours!');paint();});
    bar.querySelector('.cdz-buy-how')?.addEventListener('click',()=>{if(purse==='stars'){active='shop';frameFor(active);paint();}else info('earn');});}
  // 13+ check (asked once per account; year and month only). Resolves {year,month} or null if cancelled.
  function askAge(){return new Promise(res=>{const m=$('.cdz-modal'),card=m.querySelector('.cdz-modal-card'),y=new Date().getFullYear();
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    card.innerHTML=`<h3>When were you born?</h3><p>Game Cards are for players 13 and older. We only keep the month and year.</p>
      <form class="cdz-age"><select name="month" aria-label="Birth month" required><option value="">Month</option>${months.map((n,i)=>`<option value="${i+1}">${n}</option>`).join('')}</select>
      <select name="year" aria-label="Birth year" required><option value="">Year</option>${Array.from({length:100},(_,i)=>y-i).map(v=>`<option>${v}</option>`).join('')}</select>
      <div class="cdz-age-go"><button type="button" class="cdz-ok cdz-ok-quiet" data-x>Cancel</button><button type="submit" class="cdz-ok">Continue</button></div></form>`;
    m.hidden=false;const f=card.querySelector('form'),done=v=>{m.hidden=true;res(v);};
    f.querySelector('[data-x]').onclick=()=>done(null);
    f.onsubmit=e=>{e.preventDefault();const year=+f.year.value,month=+f.month.value;if(!year||!month)return;done({year,month});};
    f.month.focus();});}
  function info(kind){const m=$('.cdz-modal'),card=m.querySelector('.cdz-modal-card');
    card.innerHTML={buy:`<h3>Game Cards</h3><p>Card sales aren’t switched on yet. When they are, players 13 and older will be able to buy a $5 to $100 Trottville Game Card here in the game. Tap a card above to tell us if you’d buy it.</p>`,
      gift:`<h3>Gifting a card</h3><p>Coming later: family can send a Trottville Game Card as a gift (a birthday, a holiday), by email or as a printed card, and the code goes straight to the rider.</p>`,
      earn:`<h3>Earning Trotties</h3><p>🪙 +25 for each new place you discover<br>🪙 +20 for finishing a barn game (score 500+ in Appleoosa or Hay’s for Horses)<br>🪙 +5 for each ride to a place on the map<br>🪙 +10 for finishing a steeplechase, +30 for a new best time</p>`}[kind]+`<button type="button" class="cdz-ok">OK</button>`;
    m.hidden=false;card.querySelector('.cdz-ok').onclick=()=>m.hidden=true;card.querySelector('.cdz-ok').focus();}
  let toastT=0;function toast(t){const el=$('.cdz-toast');el.textContent=t;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),2600);}

  root.querySelectorAll('[data-cdz-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.cdzTab;frameFor(active);paint();b.scrollIntoView({inline:'nearest',block:'nearest',behavior:'smooth'});});
  function close(){if(closed)return;closed=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);removeEventListener('keydown',key,true);character?.dispose();renderer.dispose();pad.geometry.dispose();pad.material.dispose();root.remove();onClose?.();}
  $('.cdz-done').onclick=()=>{let kept=look;if(!owns(wallet,look.outfit)){kept={...look,outfit:owns(wallet,saved)?saved:'stablehand'};}
    saveLook(kept);onSave?.(kept,look.outfit!==kept.outfit?OUTFITS.find(o=>o.id===look.outfit).name:null);close();};
  $('.cdz-close').onclick=close;
  function key(e){if(e.key!=='Escape')return;e.stopPropagation();if(!$('.cdz-modal').hidden)$('.cdz-modal').hidden=true;else close();}
  addEventListener('keydown',key,true);addEventListener('resize',resize);
  rebuild();frameFor(active);Object.assign(camAt,camGoal);paint();resize();raf=requestAnimationFrame(loop);
  // Stars bought with a Game Card (test mode) that haven't reached this device yet.
  claimStars().then(n=>{if(!n||closed)return;wallet=loadWallet();toast('Game Card added: +'+n.toLocaleString()+' stars!');paint();});
  return {close};
}
