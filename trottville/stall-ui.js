// Decorating sheets for the home stall: the slot picker (what goes in this spot) and the Decor store (buy with
// Trotties from the same wallet the top-bar counter shows). Bottom sheets, no native dialogs. Buttons use
// data-st="…" (never data-action / data-route / data-tab, which horselandia.js's global click handler owns).
import {CATALOG,ITEM,SLOT,buy,itemsForSlot,slotOf,owns} from './stall-decor.mjs?v=161';
import {iconHTML} from './pixel-icons.js?v=161';
import {loadWallet,saveWallet,coinHTML} from './character-looks.mjs?v=161';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('en-US');
const toast=m=>window.TrottToast?window.TrottToast(m):console.log(m);
// Styles live in stall.css; make sure they're on the page even before index.html links it.
if(typeof document!=='undefined'&&!document.querySelector('link[href="stall.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='stall.css';document.head.append(l);}

export const coins=()=>loadWallet().coins;
function paintCoins(){const n=coinHTML(coins());for(const el of document.querySelectorAll('[data-trottcoins]')){(el.querySelector('b')||el).innerHTML=n;}
  const w=loadWallet();window.dispatchEvent(new CustomEvent('trottcoins:change',{detail:{coins:w.coins}}));}
// Buy an item: checks the rules, takes the Trotties, updates every counter. Returns the new stall or null.
export function purchase(stall,itemId){const w=loadWallet(),res=buy(stall,w.coins,itemId);
  if(!res.ok){toast(res.short?`Not enough Trotties: you need ${fmt(res.short)} more. Earn them in games and races.`:res.reason+'.');return null;}
  saveWallet({...loadWallet(),coins:loadWallet().coins-res.cost});paintCoins();return res.stall;}

let sheet=null,onCloseCb=null;
export function closeStallSheet(){const s=sheet,cb=onCloseCb;sheet=null;onCloseCb=null;if(!s)return;s.classList.remove('in');s.addEventListener('transitionend',()=>s.remove(),{once:true});setTimeout(()=>s.remove(),400);cb?.();}
function openSheet(title,html,handlers,onClose){closeStallSheet();const s=document.createElement('div');s.className='st-sheet';s.setAttribute('role','dialog');s.setAttribute('aria-modal','true');s.setAttribute('aria-label',title);
  s.innerHTML=`<div class="st-card"><div class="st-head"><h2>${esc(title)}</h2><span class="tc-counter st-coins" data-trottcoins aria-label="Your Trotties"><span aria-hidden="true">🪙</span><b>${coinHTML(coins())}</b></span><button type="button" class="st-x" data-st="close" aria-label="Close">×</button></div><div class="st-body">${html}</div></div>`;
  s.addEventListener('click',e=>{if(e.target===s){closeStallSheet();return;}const b=e.target.closest('[data-st]');if(!b||b.disabled)return;const k=b.dataset.st;if(k==='close'){closeStallSheet();return;}handlers[k]?.(b.dataset.v,b);});
  s.addEventListener('keydown',e=>{if(e.key==='Escape')closeStallSheet();});
  (document.fullscreenElement||document.body).append(s);sheet=s;onCloseCb=onClose;requestAnimationFrame(()=>{s.classList.add('in');s.querySelector('.st-x')?.focus({preventScroll:true});});return s;}

const slotName=id=>SLOT[id]?.label||id;
// What goes in this spot: your items that fit, the one that's up now (with Take down), and Get more.
export function openSlotSheet({stall,slotId,onPlace,onRemove,onShop,onClose}){const here=stall.placed[slotId],list=itemsForSlot(stall,slotId);
  const cur=here?`<div class="st-current"><span class="st-ico" aria-hidden="true">${iconHTML(ITEM[here].icon,ITEM[here].px,'px-lg')}</span><div><small>Here now</small><b>${esc(ITEM[here].name)}</b></div><button type="button" class="st-ghost" data-st="remove">Take down</button></div>`:'';
  const grid=list.length?`<div class="st-grid">${list.map(i=>{const at=slotOf(stall,i.id);return `<button type="button" class="st-item ${i.id===here?'on':''}" data-st="place" data-v="${i.id}" ${i.id===here?'aria-pressed="true"':''}><span class="st-ico" aria-hidden="true">${iconHTML(i.icon,i.px,'px-lg')}</span><b>${esc(i.name)}</b><small>${i.id===here?'Here now':at?'Moves from '+esc(slotName(at).toLowerCase()):'In your storage'}</small></button>`;}).join('')}</div>`
    :`<p class="st-empty">Nothing for this spot yet. Find something in the Decor store.</p>`;
  openSheet(slotName(slotId),`${cur}${grid}<button type="button" class="st-primary" data-st="shop">🛍️ Get more in the Decor store</button>`,
    {place:id=>{if(id!==here)onPlace(id);else closeStallSheet();},remove:()=>onRemove(),shop:()=>onShop(SLOT[slotId].type)},onClose);}

const TABS=[['all','All'],['wall','Walls'],['floor','Floor'],['shelf','Shelf'],['beam','Beam'],['door','Door'],['rug','Rugs']];
// The Decor store: everything, filterable by spot type. forSlot (optional) = buying something that fits it puts it there.
export function openStoreSheet({stall,type='all',forSlot=null,onBought,onClose}){let tab=type||'all';
  const body=()=>{const list=CATALOG.filter(i=>tab==='all'||i.fits.includes(tab));
    return `<p class="st-lead">Spend Trotties on things for your stall. You keep everything you buy; tap a spot while decorating to put it up or move it.</p>
    <div class="st-tabs" role="tablist" aria-label="Decor type">${TABS.map(([k,l])=>`<button type="button" role="tab" aria-selected="${k===tab}" class="${k===tab?'on':''}" data-st="tab" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="st-grid st-shop">${list.map(i=>{const have=owns(stall,i.id),afford=coins()>=i.price;return `<div class="st-item st-buy ${have?'owned':''}"><span class="st-ico" aria-hidden="true">${iconHTML(i.icon,i.px,'px-lg')}</span><b>${esc(i.name)}</b><small>${esc(i.text)}</small>
      ${have?(forSlot&&i.fits.includes(SLOT[forSlot].type)?`<button type="button" class="st-price" data-st="hang" data-v="${i.id}" aria-label="Hang ${esc(i.name)} here">Hang it</button>`:`<span class="st-owned">${i.price?'Owned ✓':'Free ✓'}</span>`):`<button type="button" class="st-price ${afford?'':'short'}" data-st="buy" data-v="${i.id}" aria-label="Buy ${esc(i.name)} for ${i.price} Trotties">${fmt(i.price)} 🪙</button>`}</div>`;}).join('')}</div>`;};
  const s=openSheet('Decor store',body(),{
    tab:v=>{tab=v;s.querySelector('.st-body').innerHTML=body();},
    hang:id=>{onBought(stall,id,forSlot);closeStallSheet();toast(`${ITEM[id].name} is up in your stall!`);},
    buy:id=>{const next=purchase(stall,id);if(!next)return;stall=next;const it=ITEM[id],place=forSlot&&it.fits.includes(SLOT[forSlot].type);
      onBought(next,id,place?forSlot:null);
      if(place){closeStallSheet();toast(`${it.name} is yours and up in your stall!`);}
      else{toast(`${it.name} is yours! Tap a spot while decorating to put it up.`);s.querySelector('.st-body').innerHTML=body();}}},onClose);
  s.classList.add('st-wide');return s;}
