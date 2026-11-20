// Friends v2 (server: supabase/migrations/202611080006_friends_invites.sql, RPC public.hl_friends; plan in
// docs/friends-races-plan.md). A unique username picked after sign-in, friend requests that must be accepted, rider
// profiles, race invites (Join / Busy) and friends-only stable visits with a fixed Thank you. No free text between
// players anywhere: usernames are the only words a player types, and the server refuses rude ones.
// Signed-in (cloud) riders only. Loaded by ranch-ui.js (bell) and world.js (profiles, invites).
// Buttons here use data-friends="…" (never data-action/route/tab, which horselandia's global click handler owns).
import {horsePortrait} from './horse-portrait.js?v=162';
import {paintCounters,paintChip} from './coin-collect.js?v=162';
import {normalizeWallet,WALLET_KEY} from './character-looks.mjs?v=162';
import {COATS,solidCoat,BADGE_DEFS,TIER_NAMES,PETS} from './ranch.mjs?v=162';
import {testOn,testAllowed,testCall,setTest,resetTest,TEST_ME} from './test-friends.js?v=162';
import {usernameProblem,friendsApi,RACES,raceName,activityText,profileFacts,levelFor,inviteTargets} from './friends-logic.mjs?v=162';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const HEARTBEAT_MS=10000;
const cloud=()=>window.MeadowCloud;
// Test friends (owner-only switch, test-friends.js) stand in for a signed-in account and the server.
const signedIn=()=>{if(testOn())return true;const c=cloud();return !!(c?.active&&c.ready&&c.client);};
const toast=m=>window.TrottToast?window.TrottToast(m):console.log(m);
const ERRORS={HL_SIGN_IN_REQUIRED:'Sign in to play with friends.',HL_NAME_REQUIRED:'Pick your username first.',
  HL_NAME_BAD:'That name isn’t allowed. Try another one.',HL_NAME_TAKEN:'Someone already has that name. Try adding a number.',
  HL_NAME_COOLDOWN:'You can change your username once every 30 days.',
  HL_FRIEND_UNKNOWN:'No rider has that username. Check the spelling.',HL_FRIEND_ALREADY:'You’re already friends (or you already asked).',
  HL_FRIEND_RATE_LIMIT:'Slow down a little and try again in a moment.',HL_FRIEND_LIMIT:'That friend list is full.',
  HL_FRIEND_NO_REQUEST:'That friend request is gone.',HL_FRIEND_NOT_FRIENDS:'You can only do that with friends.',
  HL_FRIEND_HORSE:'That horse isn’t in this stable any more.',HL_FRIEND_ALREADY_FED:'You already fed this horse today. Come back tomorrow!',
  HL_FRIEND_OWNER_CAP:'These horses have had lots of visitors today. Try again tomorrow!',
  HL_FRIEND_VISITOR_CAP:'You’ve fed lots of horses today. Your own horses need you too!',HL_FRIEND_ALREADY_THANKED:'You already said thanks.',
  HL_FRIEND_NOTE:'That note is gone.',HL_INVITE_GONE:'That invite has run out. Ask your friend to invite you again.',
  HL_INVITE_NO_ROOM:'Ride out into the 3D world first, then invite friends.',HL_ROOM_FULL:'That race is full.',
  HL_SOCIAL_RATE_LIMIT:'Slow down a little and try again in a moment.',HL_TAME_CLOSED:'Your friend has switched off friend taming for this horse.',
  HL_TAME_DONE:'This horse is already tamed!',HL_TAME_LIMIT:'That’s all the taming help you can give today. Come back tomorrow!',
  HL_TRADE_NOT_ALLOWED:'Legendary horses and your free horse can’t be traded.',HL_TRADE_LIMIT:'You already have 3 open offers. Wait for answers first.',
  HL_TRADE_DUPLICATE:'You already offered this horse.',HL_TRADE_STATE:'That offer has changed. Have a look again.',HL_TRADE_UNKNOWN:'That offer is gone.',
  HL_TRADE_COOLING:'Nearly! Traded horses can be collected 24 hours after saying yes.',HL_TRADE_HORSE:'That horse can’t be traded.',
  HL_CLUB_ALREADY:'You’re already in a club. Leave it first.',HL_CLUB_NAME:'That club name isn’t allowed. Use 3–24 letters, numbers or spaces.',
  HL_CLUB_TAKEN:'A club already has that name.',HL_CLUB_UNKNOWN:'No club has that name. Check the spelling.',
  HL_CLUB_NO_FRIEND:'You can join a club when one of your friends is in it.',HL_CLUB_FULL:'That club is full (30 riders).',
  HL_SOCIAL_OFF:'This needs a game server update that’s on its way. Try again soon!'};
export const friendError=e=>{const m=String(e?.message||e||'');for(const [k,v] of Object.entries(ERRORS))if(m.includes(k))return v;
  if(/hl_social/i.test(m))return ERRORS.HL_SOCIAL_OFF;
  if(/hl_friends|PGRST202|Could not find the function/i.test(m))return 'Friends are switched off on the server for now.';
  return /fetch|network|Failed/i.test(m)?'Friends need an internet connection.':'Friends aren’t available right now. Try again later.';};

let data=null,timer=0,busy=false,known=null,uidSeen=null,missing=false,onlineSeen=null;
const shownOnline=new Set();
// My valley: the "friend online" pills (home and 3D world) can be switched off in Friends.
const PILLS_KEY='trott-friend-pills';
export const pillsOn=()=>{try{return localStorage.getItem(PILLS_KEY)!=='off';}catch{return true;}};
const shownThanks=new Set(),shownInvites=new Set(),shownReplies=new Set(),knownRequests=new Set();

// A request that turns into a friendship (they had asked you too): the reply's 'friends' is always the friend LIST
// (the server's common tail overwrites the single name), so check the list for that rider.
const nowFriends=(r,name)=>Array.isArray(r?.friends)&&r.friends.some(f=>String(f?.username).toLowerCase()===String(name).toLowerCase());
async function call(action,payload={}){if(!signedIn())throw Error('HL_SIGN_IN_REQUIRED');
  const {data:reply,error}=testOn()?{data:await testCall('friends',action,payload)}:await cloud().client.rpc('hl_friends',{p_action:action,p_payload:payload});
  if(error){if(/PGRST202|Could not find the function/i.test(error.message||error.code||''))missing=true;throw error;}
  missing=false;if(reply?.error)throw Error(reply.error);accept(reply);return reply;}

function accept(reply){if(friendsApi(reply)!=='v2')return;const first=!known;const ids=new Set((reply.notes||[]).map(n=>n.id));
  const fresh=first?[]:(reply.notes||[]).filter(n=>!known.has(n.id));known=ids;data=reply;
  // A friend's meal changed your cloud stable (care + points): pull it so the horse shows as fed.
  if(fresh.some(n=>n.meal)){const c=cloud();if(c&&!c.queueCount&&!c.busy)c.refresh().catch(()=>{});}
  for(const n of fresh.slice(0,2))popNote(n);
  for(const r of reply.requests?.incoming||[]){if(!knownRequests.has(r.username)){knownRequests.add(r.username);if(!first)popRequest(r);}}
  const pending=(reply.thanks||[]).filter(t=>!shownThanks.has(t.id));
  if(pending.length){pending.forEach(t=>shownThanks.add(t.id));popThanks(pending);void call('seen',{thanks:pending.map(t=>t.id)}).catch(()=>{});}
  // A re-invite replaces the old one on the server: drop pop-ups for invites that are gone, then show new ones.
  const live=new Set((reply.invites||[]).map(i=>'invite:'+i.id));popQueue=popQueue.filter(p=>!p.id.startsWith('invite:')||live.has(p.id));
  if(popEl?.dataset.id.startsWith('invite:')&&!live.has(popEl.dataset.id))closePop();
  for(const i of reply.invites||[])if(!shownInvites.has(i.id)){shownInvites.add(i.id);popInvite(i,reply.serverNow);}
  const answers=(reply.replies||[]).filter(r=>!shownReplies.has(r.id));
  if(answers.length){answers.forEach(r=>shownReplies.add(r.id));
    for(const r of answers)toast(r.reply==='join'?`${r.from} joined your ${RACES[r.race]?.short||'race'}! 🏇`:`${r.from} is busy right now. Ask again later.`);
    window.dispatchEvent(new CustomEvent('friends:replies',{detail:answers}));void call('seen',{replies:answers.map(r=>r.id)}).catch(()=>{});}
  // A friend came online since the last heartbeat: a calm pill with Join (once per friend per session; the first list is the baseline).
  const nowOn=new Set((reply.friends||[]).filter(f=>f.online).map(f=>f.username));
  if(onlineSeen&&pillsOn())for(const n of nowOn)if(!onlineSeen.has(n)&&!shownOnline.has(n)){shownOnline.add(n);popOnline(n);}
  onlineSeen=nowOn;
  if(cardWant&&!cardSent&&reply.me?.username){clearTimeout(cardTimer);cardTimer=setTimeout(sendCard,800);}
  window.dispatchEvent(new CustomEvent('friends:change'));
  if(sheet?.dataset.kind==='friends'&&!sheet.contains(document.activeElement?.closest?.('input')))openFriends();}

// Activity tells friends whether you're free: world.js / the games set window.TrottActivity ('roaming' | 'game' | 'race').
async function heartbeat(){clearTimeout(timer);if(!signedIn()){stop();return;}
  let wait=missing?120000:HEARTBEAT_MS;
  if(!busy&&document.visibilityState==='visible'&&navigator.onLine){busy=true;try{await call('hello',{activity:window.TrottActivity||'roaming'});}
    catch(e){/* a reload within 3 s of the last hello: try again shortly */if(/HL_FRIEND_RATE_LIMIT/.test(e?.message))wait=3500;}finally{busy=false;}}
  timer=setTimeout(heartbeat,wait);}
function stop(){clearTimeout(timer);timer=0;data=null;known=null;onlineSeen=null;shownOnline.clear();cardSent='';shownThanks.clear();shownInvites.clear();shownReplies.clear();knownRequests.clear();window.dispatchEvent(new CustomEvent('friends:change'));}
function sync(){const c=cloud();const uid=testOn()?TEST_ME:signedIn()?c.user.id:null;if(uid===uidSeen)return;uidSeen=uid;stop();if(uid)void heartbeat();}
window.addEventListener('meadow:cloud',()=>queueMicrotask(sync));
window.addEventListener('trottville:test-friends',()=>queueMicrotask(sync));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&signedIn()&&!busy)void heartbeat();});
window.addEventListener('online',()=>{if(signedIn())void heartbeat();});
setTimeout(sync,0);

// ---------- What other modules read ----------
export const friendsReady=()=>signedIn()&&!!data&&!missing;
export const isSignedIn=()=>signedIn();// v95: only signed-in riders can keep a market horse
export const myUsername=()=>data?.me?.username||null;
export const friendsList=()=>data?.friends||[];
export const onlineFriends=()=>friendsList().filter(f=>f.online);
export const isFriend=name=>friendsList().some(f=>f.username.toLowerCase()===String(name).toLowerCase());
export function refresh(){if(signedIn())return heartbeat();}
// #11: a herd that lives on this device (ranch-ui, guests + test friends) shares a visiting card so friends can
// feed it. Signed-in cloud stables are read by the server directly, so nothing is sent for those.
let cardSent='',cardTimer=0,cardWant=null;
// v124 (notes #44/#45/#48): account saves, friend taming, trades and clubs go through public.hl_social
// (supabase/migrations/202611150001_social_plus.sql). Until that is applied, calls fail and the features say so.
let socialOff=false;export const socialReady=()=>signedIn()&&!socialOff;
export async function social(action,payload={}){if(!signedIn())throw Error('HL_SIGN_IN_REQUIRED');
  const {data:reply,error}=testOn()?{data:testSocial(action,payload)}:await cloud().client.rpc('hl_social',{p_action:action,p_payload:payload});
  if(error){if(/PGRST202|Could not find the function|hl_social/i.test((error.message||'')+(error.code||''))){socialOff=true;throw Error('HL_SOCIAL_OFF');}throw error;}
  socialOff=false;return reply;}
// Test friends: a tiny stand-in so the owner can try help-taming, trades and clubs without the server.
const tsoc={tames:[],trades:[],club:null,n:1,helped:{}};
function testSocial(a,p){const fl=friendsList().map(f=>f.username),day=new Date().toISOString().slice(0,10);
  if(a==='save')return {saved:{revision:1}};if(a==='load')return {save:null};
  if(a==='tame'){if(!fl.includes(p.username))throw Error('HL_FRIEND_NOT_FRIENDS');const k=day+p.username+p.horseId,done=tsoc.helped[k]||0,pct=Math.min(2,Number(p.pct)||0,10-done);
    if(pct<=0)throw Error('HL_TAME_LIMIT');tsoc.helped[k]=done+pct;return {tamed:{horseId:p.horseId,pct,leftToday:10-done-pct}};}
  if(a==='tames')return {tames:tsoc.tames.splice(0)};if(a==='tames_ack')return {acked:true};
  if(a==='trade_offer'){if(!fl.includes(p.username))throw Error('HL_FRIEND_NOT_FRIENDS');const t={id:tsoc.n++,mine:true,with:p.username,horse:p.horse,price:p.price|0,status:'accepted',settled:false,ready:true};tsoc.trades.unshift(t);
    // A computer friend answers at once and collects straight away, so the owner can see the whole path.
    t.status='collected';return {offered:{id:t.id}};}
  if(a==='trades')return {trades:tsoc.trades};
  const t=tsoc.trades.find(x=>x.id===Number(p.id));
  if(a==='trade_settle'){if(!t||t.settled)throw Error('HL_TRADE_STATE');t.settled=true;return {settled:{id:t.id,horseId:t.horse.id,price:t.price}};}
  if(a==='trade_cancel'||a==='trade_answer'||a==='trade_claim')throw Error('HL_TRADE_STATE');
  const me={username:data?.me?.username||'You',role:'owner',online:true,you:true,badges:[]};
  if(a==='club_create'){if(!/^[A-Za-z][A-Za-z0-9 ]{2,23}$/.test(p.name||''))throw Error('HL_CLUB_NAME');tsoc.club={name:p.name,motto:p.motto|0,since:day,owner:true,members:[me,...friendsList().slice(0,3).map(f=>({username:f.username,role:'member',online:f.online,badges:[]}))]};}
  if(a==='club_join')throw Error('HL_CLUB_UNKNOWN');if(a==='club_leave')tsoc.club=null;return {club:tsoc.club};}
export function shareHerd(card){if(!card||!signedIn()||(!testOn()&&cloud()?.active&&!window.TrottAccountRanch?.on))return;cardWant=card;clearTimeout(cardTimer);cardTimer=setTimeout(sendCard,1500);}
async function sendCard(){const c=cardWant;if(!c||!data?.me?.username||missing)return;const k=JSON.stringify(c);if(k===cardSent)return;
  try{await call('herd',c);cardSent=k;}catch(e){if(/RATE_LIMIT/.test(e?.message||''))cardTimer=setTimeout(sendCard,4000);}}
export const friendNotes=()=>signedIn()?(data?.notes||[]):[];

// ---------- Time text: "yesterday at 10:00 pm" (12-hour, the player's own clock) ----------
export function when(ms,now=Date.now()){const d=new Date(ms),n=new Date(now);
  const t=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).replace(/\s?AM/,' am').replace(/\s?PM/,' pm');
  const midnight=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();const ago=Math.round((midnight(n)-midnight(d))/864e5);
  const label=ago<=0?'today':ago===1?'yesterday':ago<7?'on '+d.toLocaleDateString('en-US',{weekday:'long'}):'on '+d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return {label,time:t,text:`${label} at ${t}`};}
export const noteText=n=>`${n.from} fed your horse ${n.horseName} ${when(n.at).text}`;

// ---------- Bell (ranch-ui.js draws these inside its Notifications sheet) ----------
export const unseenCount=()=>signedIn()?(data?.unseen||0):0;
export function markSeen(){if(signedIn()&&data?.notes?.some(n=>!n.seen))void call('seen',{notes:true}).catch(()=>{});}
export function bellHTML(){
  if(!signedIn())return `<div class="fr-bell-cta"><span>🐴</span><div><b>Play with friends</b><small>Sign in to add friends, race together and feed each other’s horses.</small></div><a class="secondary" href="#account">Sign in</a></div>`;
  const notes=data?.notes||[],asks=data?.requests?.incoming||[];
  return `${asks.map(r=>`<div class="rn-bell-item fr-note fr-new"><span>👋</span><div><b>${esc(r.username)} wants to be friends</b><small>${esc(when(r.at).text)}</small></div><button type="button" class="primary" data-friends="accept" data-v="${esc(r.username)}">Accept</button></div>`).join('')}
  ${notes.map(n=>{const w=when(n.at);return `<div class="rn-bell-item fr-note${n.seen?'':' fr-new'}"><span>🥕</span><div><b>${esc(n.from)} fed ${esc(n.horseName)}</b><small>${esc(w.text)}${n.meal?' · today’s meal':' · a treat'}</small></div>${n.thanked?'<span class="fr-thanked">Thanked 💛</span>':`<button type="button" class="secondary fr-thank" data-friends="thank" data-v="${n.id}" aria-label="Say thanks to ${esc(n.from)}">💛 Thanks</button>`}</div>`;}).join('')}
  <div class="fr-bell-cta"><span>🐴</span><div><b>Friends</b><small>${onlineFriends().length?`${onlineFriends().length} online now`:'Add friends by their username'}</small></div><button type="button" class="secondary" data-friends="open">Friends</button></div>`;}

// ---------- Sheets ----------
let sheet=null;
function openSheet(title,html,kind){closeSheet();document.querySelectorAll('.rn-sheet').forEach(s=>s.querySelector('[data-ranch="close"]')?.click());
  sheet=document.createElement('div');sheet.className='rn-sheet fr-sheet';sheet.dataset.kind=kind;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label',title);
  sheet.innerHTML=`<div class="rn-sheet-card"><div class="rn-sheet-head"><h2>${esc(title)}</h2><button type="button" class="rn-x" data-friends="close" aria-label="Close">×</button></div><div class="rn-sheet-body">${html}</div></div>`;
  host().append(sheet);requestAnimationFrame(()=>sheet?.classList.add('in'));return sheet;}
function closeSheet(){sheet?.remove();sheet=null;}
const host=()=>document.fullscreenElement||[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;
const dot=on=>`<i class="fr-dot${on?' on':''}" aria-label="${on?'Online':'Offline'}"></i>`;
// The 3D world registers itself here while it is open (world.js): invites need you to be in a valley.
const world=()=>window.TrottWorld?.open?window.TrottWorld:null;

// v137: offline, friends can't work at all, so say so instead of offering Sign in / a list that never loads.
function offlineSheet(){openSheet('Friends',`<div class="fr-empty"><div class="fr-big">📴</div><h3>Friends need the internet</h3><p>You’re offline right now. Your horses, care and trail rides still work, and friends will be back when you’re online.</p><button type="button" class="primary" data-friends="close">OK</button></div>`,'friends');}
function signInSheet(){if(!navigator.onLine){offlineSheet();return;}openSheet('Friends',`<div class="fr-empty"><div class="fr-big">🐴</div><h3>Sign in to play with friends</h3><p>With a game account you pick a username, add your friends, race together and feed each other’s horses.</p><a class="primary" href="#account" data-friends="close">Sign in</a></div>${testSwitch()}`,'friends');}

// Username picker: required before friends, valleys or invites. The rule shows live as you type.
let nameThen=null,nameMsg='';
export function openNamePicker(then=null){if(!signedIn()){signInSheet();return;}nameThen=then;const now=data?.me?.username;
  openSheet(now?'Change your username':'Pick your username',`<div class="fr-empty"><div class="fr-big">🪪</div><p>${now?`You’re <b>${esc(now)}</b> now. You can change it once every 30 days.`:'This is the name other riders see. Tell it to your friends so they can add you.'}</p></div>
  <form class="fr-add" data-friends-form="claim"><label for="fr-name-in">Username</label><div><input id="fr-name-in" maxlength="16" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="TrotStar" value="${esc(now||'')}"><button type="submit" class="primary">Save</button></div>
  <p class="fr-hint" id="fr-name-hint">${esc(nameMsg||'3–16 letters or numbers, starting with a letter. Not your real name.')}</p></form>`,'name');
  const input=sheet.querySelector('input');input.focus();nameMsg='';}
document.addEventListener('input',e=>{if(e.target.id!=='fr-name-in')return;const hint=document.getElementById('fr-name-hint'),p=usernameProblem(e.target.value);
  hint.textContent=p||'Looks good!';hint.classList.toggle('ok',!p);});
export function needName(){return signedIn()&&!!data&&!data.me.username;}

let confirmRemove=null,addMsg='';
export function openFriends(){
  if(!navigator.onLine){offlineSheet();return;}
  if(!signedIn()){signInSheet();return;}
  if(missing){openSheet('Friends','<div class="fr-empty"><div class="fr-big">🐴</div><h3>Friends are almost here</h3><p>Usernames, friend requests and racing together switch on once the game server is updated.</p></div>','friends');return;}
  if(!data){openSheet('Friends','<p class="fr-wait">Opening your friends list…</p>','friends');void heartbeat();return;}
  if(!data.me.username){openNamePicker(openFriends);return;}
  const list=data.friends||[],asks=data.requests?.incoming||[],asked=data.requests?.outgoing||[],inWorld=!!world();
  openSheet('Friends',`${testSwitch()}${valleyHTML()}<div class="fr-code"><small>Your username</small><b>${esc(data.me.username)}</b><small>Tell it to a friend. They type it here to add you.${data.me.canRename?' <button type="button" class="text-button" data-friends="rename">Change</button>':''}</small></div>
  <form class="fr-add" data-friends-form="add"><label for="fr-user-in">Add a friend by username</label><div><input id="fr-user-in" maxlength="16" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Their username"><button type="submit" class="primary">Ask</button></div>${addMsg?`<p class="fr-msg">${esc(addMsg)}</p>`:''}</form>
  ${asks.length?`<h3 class="fr-h">Want to be your friend</h3><div class="fr-list">${asks.map(r=>`<div class="fr-row"><span class="fr-wave">👋</span><div><b>${esc(r.username)}</b><small>asked ${esc(when(r.at).label)}</small></div><button type="button" class="primary" data-friends="accept" data-v="${esc(r.username)}">Accept</button><button type="button" class="text-button" data-friends="decline" data-v="${esc(r.username)}">Not now</button></div>`).join('')}</div>`:''}
  ${list.length?`<h3 class="fr-h">Friends · ${list.filter(f=>f.online).length} online</h3><div class="fr-list">${list.map(f=>`<div class="fr-row">${dot(f.online)}<div><button type="button" class="fr-name" data-friends="profile" data-v="${esc(f.username)}">${esc(f.username)}</button><small>${esc(activityText(f))}</small></div>
    ${confirmRemove===f.username?`<button type="button" class="secondary" data-friends="removeyes" data-v="${esc(f.username)}">Remove</button><button type="button" class="text-button" data-friends="removeno">Keep</button>`:
    `${f.online?`<button type="button" class="primary" data-friends="joinfriend" data-v="${esc(f.username)}">Join</button>`:''}<button type="button" class="${f.online?'secondary':'primary'}" data-friends="visit" data-v="${esc(f.username)}">Visit</button><button type="button" class="fr-more" data-friends="remove" data-v="${esc(f.username)}" aria-label="Remove ${esc(f.username)}">×</button>`}</div>`).join('')}</div>`
  :'<p class="rn-ok">No friends yet. Ask a friend for their username, or tap a rider you meet in the 3D world.</p>'}
  <div class="fr-two fr-social"><button type="button" class="secondary" data-friends="trades">🔁 Trades</button><button type="button" class="secondary" data-friends="club">🏇 Club</button></div>
  ${inWorld&&list.some(f=>f.online)?'<button type="button" class="primary full" data-friends="inviteall">Invite friends to a race</button>':''}
  ${asked.length?`<p class="small">Waiting for ${asked.map(n=>`<b>${esc(n)}</b> <button type="button" class="text-button" data-friends="cancel" data-v="${esc(n)}">cancel</button>`).join(', ')} to accept.</p>`:''}
  <p class="small">Friends can race together, visit each other’s stables and feed each other’s horses once a day. There’s no chat: talk on your phone like you do for other games.</p>
  <label class="fr-switch"><input type="checkbox" data-friends-toggle="pills" ${pillsOn()?'checked':''}><span>Tell me when a friend comes online</span></label>`,'friends');}

// Owner-only: a playtest switch for computer-run test friends. Real players never get this markup (testAllowed()).
function testSwitch(){if(!testAllowed())return '';
  return testOn()?`<div class="fr-test"><b>🧪 Test friends are on</b><small>Computer riders, only you see them. Nothing is sent to the game server.</small><div><button type="button" class="secondary" data-friends="testoff">Turn off</button><button type="button" class="text-button" data-friends="testreset">Start over</button><button type="button" class="text-button" data-friends="testcoins">+200,000 test Trotties</button></div></div>`
    :`<div class="fr-test"><b>🧪 Owner playtest</b><small>Play with 8 computer-run riders (about 3 online) to test friends, visits, feeding and races. Only you see this.</small><div><button type="button" class="primary" data-friends="teston">Use test friends</button><button type="button" class="text-button" data-friends="testcoins">+200,000 test Trotties</button></div></div>`;}

// ---------- A rider's profile (tap them in the world, or their name in the list) ----------
const coatFor=h=>{if(h?.coat&&typeof h.coat==='object')return h.coat;const name=String(h?.color||'').toLowerCase().replace('gray','grey'),key=Object.keys(COATS).find(k=>name.includes(k));return key?solidCoat(key):undefined;};
const horsePic=(h,shot)=>horsePortrait({id:h.id,coat:coatFor(h),size:h.size},{bg:'#e9eee5',key:'fr|'+h.id+'|'+h.color+(shot||''),...(shot?{shot,w:320,h:220}:{})})||(h.image?'assets/'+h.image:'assets/horse-icon.svg');
export async function openProfile(username,{focus='rider'}={}){if(!signedIn()){signInSheet();return;}
  if(needName()){openNamePicker(()=>openProfile(username,{focus}));return;}
  openSheet(username,'<p class="fr-wait">Saying hello…</p>','profile');
  try{const r=await call('profile',{username});drawProfile(r.profile,focus);}catch(e){closeSheet();toast(friendError(e));}}
function drawProfile(p,focus){const h=p.riding,facts=profileFacts(p),inWorld=!!world();
  const horse=h?`<article class="fr-ride${focus==='horse'?' fr-focus':''}"><img src="${esc(horsePic(h,'body'))}" alt=""><div><small>Riding</small><b>${esc(h.name)}</b><span>${esc([h.breed,h.color].filter(Boolean).join(' · '))}</span>${h.trait?`<small>${esc(h.trait)}</small>`:''}</div></article>`:'';
  const action={you:'<p class="fr-done">That’s you!</p>',
    friend:`${p.online?`<button type="button" class="primary full" data-friends="joinfriend" data-v="${esc(p.username)}">Join ${esc(p.username)}</button>`:''}<div class="fr-two">${inWorld&&p.online?`<button type="button" class="secondary" data-friends="invite" data-v="${esc(p.username)}">Invite to a race</button>`:''}<button type="button" class="${inWorld&&p.online?'secondary':'primary'}" data-friends="visit" data-v="${esc(p.username)}">Visit stable</button></div>`,
    asked:'<p class="fr-done">Friend request sent ✓</p>',
    'asks-you':`<button type="button" class="primary full" data-friends="accept" data-v="${esc(p.username)}" data-then="profile">Accept friend request</button>`,
    none:`<button type="button" class="primary full" data-friends="add" data-v="${esc(p.username)}">Add friend</button>`}[p.friend]||'';
  openSheet(p.username,`${focus==='horse'?horse:''}<div class="fr-card"><div class="fr-badge">${levelFor(p.points)}<small>level</small></div><div><b>${esc(p.username)}</b><small>${dot(p.online)} ${esc(activityText(p))}${p.friend==='friend'?' · Friend':''}</small></div></div>
  <dl class="fr-facts">${facts.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${focus==='horse'?'':horse}${action}`,'profile');sheet.dataset.user=p.username;}

// ---------- Race invites ----------
// The picker: which race, and which online friends (or all of them). world.js decides the default race.
let invitePick=null;
export function openInvite({race='summit',usernames=null}={}){if(!world()){toast(ERRORS.HL_INVITE_NO_ROOM);return;}
  if(needName()){openNamePicker(()=>openInvite({race,usernames}));return;}
  const online=onlineFriends();invitePick={race,names:new Set(usernames||online.map(f=>f.username))};drawInvite(online);}
function drawInvite(online=onlineFriends()){const p=invitePick;
  openSheet('Invite friends to race',`<div class="fr-races">${Object.values(RACES).map(r=>`<button type="button" class="fr-race${p.race===r.id?' on':''}" data-friends="race" data-v="${r.id}" aria-pressed="${p.race===r.id}"><span>${r.icon}</span>${esc(r.name)}</button>`).join('')}</div>
  ${online.length?`<div class="fr-list">${online.map(f=>`<label class="fr-row fr-pick"><input type="checkbox" data-friends-pick value="${esc(f.username)}" ${p.names.has(f.username)?'checked':''}><div><b>${esc(f.username)}</b><small>${esc(activityText(f))}</small></div></label>`).join('')}</div>
  <button type="button" class="primary full" data-friends="sendinvite">Invite ${p.names.size===online.length?'all online friends':p.names.size+' friend'+(p.names.size===1?'':'s')}</button>`
  :'<p class="rn-ok">None of your friends are online right now. Plan a time together, then invite them when they log in.</p>'}
  <p class="small">They get Join or Busy. Joining brings them straight to you, no travelling. Invites last 2 minutes.</p>`,'invite');}
export async function invite(race,picked){const names=picked==='all'?'all':inviteTargets(friendsList(),picked);
  if(names!=='all'&&!names.length)throw Error('HL_FRIEND_UNKNOWN');
  const r=await call('invite',{race,...(names==='all'?{all:true}:{usernames:names})});
  window.dispatchEvent(new CustomEvent('friends:invited',{detail:{race,count:r.invited||0,roomId:r.roomId}}));return r.invited||0;}

// Join: the server moves you into the host's valley as a racer. The world (open or opening) takes it from there.
async function answer(id,reply,btn){if(btn)btn.disabled=true;
  try{const r=await call('answer',{id:Number(id),reply});
    if(reply==='busy'){toast('Okay! They’ll know you’re busy.');return;}
    const join=r.joined;if(!join)return;
    if(world())window.dispatchEvent(new CustomEvent('friends:join',{detail:join}));
    else{try{sessionStorage.setItem('trottville-join',JSON.stringify({...join,at:Date.now()}));}catch{}location.hash='#world';}}
  catch(e){toast(friendError(e));if(btn)btn.disabled=false;}}

// ---------- Visiting a friend's stable ----------
export async function openVisit(username){if(!signedIn()){openFriends();return;}
  openSheet('Visiting…','<p class="fr-wait">Riding over…</p>','visit');
  try{const r=await call('visit',{username});drawVisit(r.stable);}catch(e){closeSheet();toast(friendError(e));}}
// v124: the barn wall behind their horses: best badges and the barn pet (note #45), shown to visitors.
export function wallHTML(w){const bs=(w?.badges||[]).map(b=>({...b,d:BADGE_DEFS.find(d=>d.id===b.id)})).filter(b=>b.d),pet=PETS.find(p=>p.id===w?.pet?.id);
  if(!bs.length&&!pet)return '';
  return `<div class="fr-wall">${bs.length?`<div class="rn-badgewall">${bs.map(b=>`<span class="t${b.tier}" title="${esc(TIER_NAMES[b.tier]+' '+b.d.name)}">${b.d.icon}</span>`).join('')}</div>`:''}
  ${pet?`<small>${pet.icon} ${esc(w.pet.name||pet.name)} the ${esc(pet.kind.toLowerCase())} says hi</small>`:''}</div>`;}
const tameTag=h=>typeof h.tame!=='number'||h.tame>=100?'':`<small class="fr-tame">🪢 Taming ${Math.floor(h.tame)}%</small>`;
let lastVisit=null;
function drawVisit(s){lastVisit=s;
  openSheet(`${s.username}’s stable`,`<p class="fr-who">${dot(s.online)} ${s.online?`${esc(s.username)} is online now`:`${esc(s.username)} is away. They’ll see your note next time they visit.`}</p>${wallHTML(s.wall)}
  ${s.horses.length?`<div class="fr-horses">${s.horses.map(h=>`<article class="fr-horse"><img src="${esc(horsePic(h))}" alt=""><b>${esc(h.name)}</b><small>${esc([h.breed,h.color].filter(Boolean).join(' · '))}</small>${tameTag(h)}
    ${typeof h.tame==='number'&&h.tame<100&&h.tameOpen!==false?`<button type="button" class="secondary" data-friends="helptame" data-v="${esc(s.username)}" data-h="${esc(h.id)}">🪢 Help tame</button>`:''}
    ${h.fedByYou?'<span class="fr-done">✓ You fed them today</span>':`<button type="button" class="primary" data-friends="feed" data-v="${esc(s.username)}" data-h="${esc(h.id)}" ${s.visitsLeft?'':'disabled'}>${h.fedToday?'🍎 Give a treat':'🥕 Feed'}</button>`}</article>`).join('')}</div>`
  :'<p class="rn-ok">No horses here yet.</p>'}
  ${s.visitsLeft?'':'<p class="small">These horses have had lots of visitors today. Come back tomorrow!</p>'}
  <div class="fr-two"><button type="button" class="secondary" data-friends="open">Back to friends</button><button type="button" class="secondary" data-friends="tradeto" data-v="${esc(s.username)}">🔁 Offer a horse</button></div>`,'visit');}
export const visitHorse=(username,id)=>lastVisit?.username===username?lastVisit.horses.find(h=>h.id===id)||null:null;
export {horsePic as friendHorsePic};

// ---------- v124 clubs (note #48): one club each, join when a friend is in it, up to 30 riders ----------
// No free text: the name is filtered on the server like usernames and the motto is picked from this list.
export const MOTTOS=['Ride together, smile together','Hooves up, hearts open','Every horse is a friend','Fast hooves, kind hands','Mud is just glitter for horses',
  'Carrots for everyone!','Brave riders, calm horses','Sunrise rides and starry nights','We jump the big ones','Gentle hands win trust'];
let clubMsg='';
export async function openClub(){if(!signedIn()){signInSheet();return;}openSheet('Club','<p class="fr-wait">Opening the clubhouse…</p>','club');
  try{drawClub((await social('club')).club);}catch(e){closeSheet();toast(friendError(e));}}
function drawClub(c){
  if(!c){openSheet('Clubs',`<div class="fr-empty"><div class="fr-big">🏇</div><h3>Join or start a club</h3><p>Clubs are groups of up to 30 riders. You can join a club when a friend of yours is already in it.</p></div>
    ${clubMsg?`<p class="fr-msg">${esc(clubMsg)}</p>`:''}
    <form class="fr-add" data-friends-form="clubjoin"><label for="fr-club-in">Join a friend’s club by its name</label><div><input id="fr-club-in" maxlength="24" autocomplete="off" spellcheck="false" placeholder="Club name"><button type="submit" class="primary">Join</button></div></form>
    <form class="fr-add" data-friends-form="clubmake"><label for="fr-club-new">Or start your own</label><div><input id="fr-club-new" maxlength="24" autocomplete="off" spellcheck="false" placeholder="New club name"><button type="submit" class="secondary">Start</button></div>
    <label for="fr-club-motto">Motto</label><select id="fr-club-motto" class="fr-motto">${MOTTOS.map((m,i)=>`<option value="${i}">${esc(m)}</option>`).join('')}</select></form>
    <p><button type="button" class="secondary" data-friends="open">Back to friends</button></p>`,'club');return;}
  openSheet(c.name,`<p class="fr-motto-line">“${esc(MOTTOS[c.motto]||MOTTOS[0])}”</p><p class="small">Since ${esc(c.since)} · ${c.members.length}/30 riders</p>
    <div class="fr-list">${c.members.map(m=>`<div class="fr-row">${dot(m.online)}<div><b>${esc(m.username)}${m.you?' (you)':''}</b><small>${m.role==='owner'?'👑 Club leader':'Member'}</small></div>
      <div class="rn-badgewall fr-mini">${(m.badges||[]).slice(0,4).map(b=>{const d=BADGE_DEFS.find(x=>x.id===b.id);return d?`<span class="t${b.tier}">${d.icon}</span>`:'';}).join('')}</div>
      ${m.you?'':`<button type="button" class="secondary" data-friends="profile" data-v="${esc(m.username)}">Profile</button>`}</div>`).join('')}</div>
    <p class="small">Tell friends the club name so they can join.</p>
    <div class="fr-two"><button type="button" class="secondary" data-friends="open">Back to friends</button><button type="button" class="text-button" data-friends="clubleave">Leave club</button></div>`,'club');}

// ---------- Pop-ups: thanks, meals, friend requests and race invites ----------
let popQueue=[],popEl=null;
function pop(html,{ms=9000,id=''}={}){popQueue.push({html,ms,id});if(!popEl)nextPop();}
// Calm stacking: thanks, meals and friend requests wait while a sheet or panel is open and show once it closes
// (watched, no timers). Race invites can't wait (2 minutes), so they show at once and the daily gift steps back.
const SHEETS='.rn-sheet,.tc-sheet,.hp-panel,.h3-sheet,.st-sheet,.pl-sheet';let popWait=null;
function nextPop(){if(popEl)return;const head=popQueue[0];if(!head){popEl=null;return;}
  if(!head.id.startsWith('invite:')&&document.querySelector(SHEETS)){if(!popWait){popWait=new MutationObserver(()=>{if(!document.querySelector(SHEETS)){popWait.disconnect();popWait=null;nextPop();}});popWait.observe(document.body,{childList:true,subtree:true});}return;}
  const p=popQueue.shift();popEl=document.createElement('div');popEl.className='fr-pop';popEl.setAttribute('role','status');popEl.dataset.id=p.id;
  popEl.innerHTML=p.html+'<button type="button" class="fr-pop-x" data-friends="popclose" aria-label="Dismiss">×</button>';host().append(popEl);requestAnimationFrame(()=>popEl?.classList.add('in'));
  popEl._t=setTimeout(closePop,p.ms);}
function closePop(){if(!popEl)return;clearTimeout(popEl._t);const el=popEl;el.classList.remove('in');setTimeout(()=>el.remove(),250);popEl=null;setTimeout(nextPop,300);}
function popThanks(list){for(const t of list)pop(`<div class="fr-pop-main"><span class="fr-pop-icon">💛</span><div><b>${esc(t.from)} says thank you!</b><small>for feeding ${esc(t.horseName)}</small></div></div>
  ${t.fromOnline?`<button type="button" class="primary fr-pop-go" data-friends="popvisit" data-v="${esc(t.from)}">Go visit your friend, they’re online</button>`:''}`,{ms:t.fromOnline?14000:8000});}
function popOnline(name){pop(`<div class="fr-pop-main"><span class="fr-pop-icon">🐴</span><div><b>${esc(name)} is online</b><small>Ride together in the valley</small></div></div>
  <button type="button" class="primary fr-pop-go" data-friends="joinfriend" data-v="${esc(name)}">Join ${esc(name)}</button>`,{ms:9000});}
// Who is riding in a valley right now (hl_room 'friends_here'): from the 3D world, or straight from home.
async function friendsHere(){const w=world();if(w?.friendsHere)return w.friendsHere();
  try{if(testOn())return testCall('room','friends_here',{}).friends||[];const c=cloud();if(!c?.client)return [];const {data:d,error}=await c.client.rpc('hl_room',{p_action:'friends_here',p_payload:{}});if(error)throw error;return d?.friends||[];}catch{return [];}}
// Join: in the world, drop in near them now; at home, ride out first (world.js joins once the valley connects).
async function joinFriend(name,btn){if(btn)btn.disabled=true;try{const here=(await friendsHere()).find(f=>f.username.toLowerCase()===String(name).toLowerCase());
    if(!here){toast(`${name} isn’t riding in the valley right now. Try again when they ride out!`);return;}
    if(here.together){toast(`You’re already riding with ${name}!`);closeSheet();return;}
    if(here.full){toast(`${name}’s valley is full (20 riders). Try again soon.`);return;}
    closeSheet();const w=world();if(w?.joinFriend){await w.joinFriend(here.username);return;}
    try{sessionStorage.setItem('trott-join-friend',here.username);}catch{}toast(`Riding out to join ${here.username}…`);location.hash='world';}
  finally{if(btn)btn.disabled=false;}}
function valleyHTML(){const v=world()?.valley?.();if(!v)return '';
  return `<div class="fr-valley"><div class="fr-valley-top"><span class="fr-big-ic">🏞️</span><div><b>${esc(v.name)}</b><small>${v.riders} rider${v.riders===1?'':'s'} here now · ${v.privacy==='open'?'Open (up to 20)':'Friends only'}</small></div></div>
  ${v.mine?`<label class="fr-switch"><input type="checkbox" data-friends-toggle="open" ${v.privacy==='open'?'checked':''}><span>Let other riders join (up to 20)</span></label>`:`<button type="button" class="secondary full" data-friends="rideown">🏠 Ride on your own</button>`}
  <button type="button" class="text-button" data-friends="explore">🧭 Explore other riders’ valleys</button></div>`;}
function popNote(n){pop(`<div class="fr-pop-main"><span class="fr-pop-icon">🥕</span><div><b>${esc(n.from)} just fed ${esc(n.horseName)}!</b><small>Say thanks from the bell</small></div></div>
  <button type="button" class="primary fr-pop-go" data-friends="thank" data-v="${n.id}">Say thanks</button>`);}
function popRequest(r){pop(`<div class="fr-pop-main"><span class="fr-pop-icon">👋</span><div><b>${esc(r.username)} wants to be friends</b><small>Friends can race and visit stables</small></div></div>
  <div class="fr-two"><button type="button" class="primary fr-pop-go" data-friends="accept" data-v="${esc(r.username)}">Accept</button><button type="button" class="secondary fr-pop-go" data-friends="popclose">Later</button></div>`,{ms:15000});}
// Invites jump the queue: they only last 2 minutes and show even inside a barn game.
function popInvite(i,serverNow=Date.now()){dispatchEvent(new Event('trottville:gift-later'));const left=Math.max(5000,120000-(serverNow-i.at));const r=RACES[i.race]||{icon:'🏁',name:'a race'};
  popQueue.unshift({html:`<div class="fr-pop-main"><span class="fr-pop-icon">${r.icon}</span><div><b>${esc(i.from)} invites you to race!</b><small>${esc(raceName(i.race))}</small></div></div>
  <div class="fr-two"><button type="button" class="primary fr-pop-go" data-friends="join" data-v="${i.id}">Join</button><button type="button" class="secondary fr-pop-go" data-friends="busy" data-v="${i.id}">Busy, ask me later</button></div>`,ms:left,id:'invite:'+i.id});
  if(popEl&&!popEl.dataset.id.startsWith('invite:'))closePop();else if(!popEl)nextPop();}

// ---------- Clicks ----------
async function thank(id,btn){if(btn)btn.disabled=true;try{await call('thank',{id:Number(id)});toast('Thank you sent 💛');}catch(e){toast(friendError(e));if(btn)btn.disabled=false;}}
async function act(action,username,done){try{const r=await call(action,{username});if(done)toast(done(r));}catch(e){toast(friendError(e));}}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-friends]');if(!b)return;const k=b.dataset.friends,v=b.dataset.v;
  if(k==='close'){closeSheet();confirmRemove=null;addMsg='';return;}
  if(k==='open'){confirmRemove=null;openFriends();return;}
  if(k==='teston'||k==='testoff'){const on=k==='teston',inWorld=!!world();setTest(on);closeSheet();
    toast(inWorld?(on?'Test friends on. Leave the 3D world and come back to meet them.':'Test friends off. Leave the 3D world to ride alone again.'):(on?'Test friends on. Your computer friends are riding over…':'Test friends off.'));
    if(on)setTimeout(openFriends,400);return;}
  if(k==='testcoins'){if(!testAllowed())return;try{const w=normalizeWallet(JSON.parse(localStorage.getItem(WALLET_KEY)||'null'));w.coins=(w.coins||0)+200000;localStorage.setItem(WALLET_KEY,JSON.stringify(w));paintCounters(w.coins);paintChip();toast(`Test top-up: you now have ${w.coins.toLocaleString()} Trotties.`);}catch{toast('Could not top up on this device.');}return;}
  if(k==='testreset'){resetTest();stop();uidSeen=null;sync();closeSheet();toast('Test friends start over: pick a username.');setTimeout(openFriends,400);return;}
  if(k==='rename'){openNamePicker(openFriends);return;}
  if(k==='visit'){openVisit(v);return;}
  if(k==='profile'){openProfile(v);return;}
  if(k==='popclose'){closePop();return;}
  if(k==='joinfriend'){if(b.closest('.fr-pop'))closePop();void joinFriend(v,b);return;}
  if(k==='explore'){closeSheet();await world()?.explore?.();return;}
  if(k==='rideown'){closeSheet();await world()?.rideOwn?.();return;}
  if(k==='popvisit'){closePop();openVisit(v);return;}
  if(k==='thank'){if(b.closest('.fr-pop'))closePop();thank(v,b);return;}
  if(k==='join'||k==='busy'){closePop();answer(v,k,b);return;}
  if(k==='accept'){if(b.closest('.fr-pop'))closePop();b.disabled=true;await act('accept',v,()=>`You and ${v} are friends now!`);if(b.dataset.then==='profile')openProfile(v);return;}
  if(k==='decline'){await act('decline',v);return;}
  if(k==='cancel'){await act('cancel',v,()=>'Request cancelled.');return;}
  if(k==='add'){b.disabled=true;try{const r=await call('request',{username:v});toast(nowFriends(r,v)?`You and ${v} are friends now!`:`Friend request sent to ${v}.`);openProfile(v);}catch(err){toast(friendError(err));b.disabled=false;}return;}
  if(k==='invite'){openInvite({race:window.TrottWorld?.defaultRace?.()||'summit',usernames:[v]});return;}
  if(k==='inviteall'){openInvite({race:window.TrottWorld?.defaultRace?.()||'summit'});return;}
  if(k==='race'){invitePick.race=v;drawInvite();return;}
  if(k==='sendinvite'){b.disabled=true;const online=onlineFriends(),names=[...invitePick.names];
    try{const n=await invite(invitePick.race,names.length===online.length?'all':names);closeSheet();toast(n?`Invited ${n} friend${n===1?'':'s'}. Waiting for them to join…`:'Nobody could be invited right now.');}
    catch(err){toast(friendError(err));b.disabled=false;}return;}
  if(k==='remove'){confirmRemove=v;openFriends();return;}
  if(k==='removeno'){confirmRemove=null;openFriends();return;}
  if(k==='removeyes'){confirmRemove=null;await act('remove',v,()=>'Removed. You can add each other again later.');openFriends();return;}
  if(k==='helptame'){const h=visitHorse(v,b.dataset.h);if(h){closeSheet();window.dispatchEvent(new CustomEvent('friends:helptame',{detail:{username:v,horse:h}}));}return;}
  if(k==='tradeto'){closeSheet();window.dispatchEvent(new CustomEvent('friends:tradeto',{detail:{username:v}}));return;}
  if(k==='trades'){closeSheet();window.dispatchEvent(new CustomEvent('friends:trades'));return;}
  if(k==='club'){clubMsg='';openClub();return;}
  if(k==='clubleave'){b.disabled=true;try{await social('club_leave');toast('You left the club.');drawClub(null);}catch(err){toast(friendError(err));b.disabled=false;}return;}
  if(k==='feed'){b.disabled=true;try{const r=await call('feed',{username:v,horseId:b.dataset.h});const f=r.fed;
      toast(f.meal?`You fed ${f.horseName}! ${r.stable.username} will get a note.`:`${f.horseName} loved the treat! ${r.stable.username} will get a note.`);drawVisit(r.stable);}
    catch(err){toast(friendError(err));b.disabled=false;}return;}});
document.addEventListener('change',e=>{if(!e.target.matches('[data-friends-pick]')||!invitePick)return;const n=invitePick.names;e.target.checked?n.add(e.target.value):n.delete(e.target.value);drawInvite();});
document.addEventListener('submit',async e=>{const f=e.target.closest('[data-friends-form]');if(!f)return;e.preventDefault();const value=(f.querySelector('input')?.value||'').trim();
  if(f.dataset.friendsForm==='clubjoin'||f.dataset.friendsForm==='clubmake'){const make=f.dataset.friendsForm==='clubmake';
    if(!/^[A-Za-z][A-Za-z0-9 ]{2,23}$/.test(value)){clubMsg=ERRORS.HL_CLUB_NAME;drawClub(null);return;}
    try{const r=await social(make?'club_create':'club_join',make?{name:value,motto:Number(f.querySelector('select')?.value)||0}:{name:value});clubMsg='';toast(make?`Welcome to your new club, ${value}!`:`You joined ${r.club?.name||value}!`);drawClub(r.club);}
    catch(err){clubMsg=friendError(err);drawClub(null);}return;}
  if(f.dataset.friendsForm==='claim'){const p=usernameProblem(value);if(p){nameMsg=p;openNamePicker(nameThen);return;}
    try{await call('claim',{username:value});toast(`Hi ${value}! Your friends can add you now.`);const then=nameThen;nameThen=null;closeSheet();then?.();window.dispatchEvent(new CustomEvent('friends:named'));}
    catch(err){nameMsg=friendError(err);openNamePicker(nameThen);}return;}
  const p=usernameProblem(value);if(p){addMsg='Usernames: '+p.toLowerCase();openFriends();return;}
  try{const r=await call('request',{username:value});addMsg=nowFriends(r,value)?`You and ${value} are friends now!`:`Asked ${r.requested||value}. You’ll be friends once they accept.`;}catch(err){addMsg=friendError(err);}openFriends();});
// Pop-ups and sheets must sit inside the open modal dialog (the top layer) to be seen: follow dialogs opening and closing.
new MutationObserver(()=>{const h=host();for(const el of [popEl,sheet])if(el&&el.parentElement!==h)h.append(el);}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
document.addEventListener('fullscreenchange',()=>{const h=host();for(const el of [popEl,sheet])if(el&&el.parentElement!==h)h.append(el);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet){e.stopPropagation();closeSheet();}},true);

// Styles live next to this file; loaded once so no extra tag is needed in index.html.
if(!document.querySelector('link[href="friends.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='friends.css';document.head.append(l);}
// Test hook.
export const __friends={get data(){return data;},accept,stop,popInvite};

// My valley switches: Open / Friends only (your own valley) and the friend-online pills.
document.addEventListener('change',async e=>{const t=e.target.closest?.('[data-friends-toggle]');if(!t)return;
  if(t.dataset.friendsToggle==='pills'){try{localStorage.setItem(PILLS_KEY,t.checked?'on':'off');}catch{}toast(t.checked?'You’ll see a pill when a friend comes online.':'Friend-online pills are off.');return;}
  if(t.dataset.friendsToggle==='open'){t.disabled=true;const ok=await world()?.setPrivacy?.(t.checked);if(!ok)t.checked=!t.checked;t.disabled=false;if(sheet?.dataset.kind==='friends')openFriends();}});
