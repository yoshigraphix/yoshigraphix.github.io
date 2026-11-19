// Buying Trottville Game Cards with real money (TEST MODE). See docs/payments-plan.md.
// Off unless supabase-config.js sets payments:"test" (or "live"), and only for signed-in players who pass the
// 13+ check. The price list lives on the server (supabase/functions/_shared/cards.js); this file only asks for a
// card by id, sends the player to Stripe's own Checkout page, and on return claims credited stars exactly once.
// No secrets here: the Stripe keys live in Supabase's edge-function secrets.
import {loadWallet,saveWallet} from './character-looks.mjs?v=161';

export const AGE_BLOCK_KEY='trottville-age-block',AGE_BLOCK_MS=24*36e5,MIN_AGE=13;
export const paymentsMode=(cfg=globalThis.MEADOWGATE_SUPABASE)=>['test','live'].includes(cfg?.payments)?cfg.payments:'off';
// Whole years old at the end of the birth month (matches private.hl_age_years on the server).
export function ageYears(year,month,now=new Date()){return now.getUTCFullYear()-year-(now.getUTCMonth()+1<month?1:0);}
export function ageBlocked(store=globalThis.localStorage,now=Date.now()){try{return Number(store.getItem(AGE_BLOCK_KEY))>now;}catch{return false;}}
function blockAge(store=globalThis.localStorage,now=Date.now()){try{store.setItem(AGE_BLOCK_KEY,String(now+AGE_BLOCK_MS));}catch{}}
// Where Stripe sends the player back: this page (hash kept, so they land in the world again) minus any old ?stars= flag.
export function returnUrl(href=globalThis.location?.href){const u=new URL(href);u.searchParams.delete('stars');return u.toString();}
export const addStars=(w,n)=>({...w,stars:(w.stars||0)+Math.max(0,Math.floor(n))});

const cloud=()=>globalThis.MeadowCloud;
export const canBuy=()=>paymentsMode()!=='off'&&!!cloud()?.active&&!!cloud()?.client;

async function stars(action,payload={}){const {data,error}=await cloud().client.rpc('hl_stars',{p_action:action,p_payload:payload});if(error)throw error;return data;}

// ui: {toast(text), askAge() → Promise<{year,month}|null>}
export async function buyCard(cardId,ui){
  if(paymentsMode()==='off'){ui.toast('Card sales aren’t switched on yet.');return false;}
  if(!cloud()?.active){ui.toast('Sign in to your game account to buy a card.');return false;}
  if(ageBlocked()){ui.toast('Game Cards are for players 13 and older.');return false;}
  try{
    let st=await stars('state');
    if(!st.ageSet){const a=await ui.askAge();if(!a)return false;
      if(ageYears(a.year,a.month)<MIN_AGE){blockAge();ui.toast('Game Cards are for players 13 and older.');return false;}
      const r=await stars('age',{year:a.year,month:a.month});if(!r.adult){blockAge();ui.toast('Game Cards are for players 13 and older.');return false;}
      st={...st,ageSet:true,adult:true};}
    if(st.adult!==true){ui.toast('Game Cards are for players 13 and older.');return false;}
    const {data,error}=await cloud().client.functions.invoke('create-checkout',{body:{card:cardId,returnUrl:returnUrl()}});
    if(error||!data?.url){ui.toast(data?.error||'The card shop is busy. Try again in a minute.');return false;}
    ui.toast(data.test?'Opening the test checkout…':'Opening the secure checkout…');
    location.assign(data.url);return true;
  }catch(e){ui.toast('The card shop couldn’t be reached. Check your connection.');return false;}
}

// Back from Stripe (?stars=done|cancel): tidy the address, then claim once the account has opened.
// onResult(kind, stars): kind 'done' | 'cancel'.
export function watchReturn(onResult){
  let kind=null;try{const u=new URL(location.href);kind=u.searchParams.get('stars');if(kind){u.searchParams.delete('stars');history.replaceState(history.state,'',u);}}catch{}
  if(kind==='cancel'){queueMicrotask(()=>onResult('cancel',0));return;}
  if(kind!=='done'||paymentsMode()==='off')return;
  // n can be 0 if Stripe's confirmation hasn't landed yet; the Card shop claims again whenever it opens.
  const go=async()=>onResult('done',await claimStars());
  if(cloud()?.active)go();else addEventListener('meadow:cloud',function f(e){if(!e.detail?.user)return;removeEventListener('meadow:cloud',f);go();});
}

// Move any stars Stripe has credited into the wallet (exactly once: the server marks them claimed).
export async function claimStars(){
  if(!canBuy())return 0;
  try{const r=await stars('claim');const n=Number(r?.stars)||0;if(n>0)saveWallet(addStars(loadWallet(),n));return n;}catch{return 0;}
}
