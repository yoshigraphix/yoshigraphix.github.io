import {roomApi} from './friends-logic.mjs?v=157';
import {fogMerge} from './world-content.mjs?v=157';
import {testOn,testCall} from './test-friends.js?v=157';
const safeName=value=>String(value||'Rider').trim().slice(0,24)||'Rider';
export const roomError=error=>{const message=String(error?.message||error||'Connection lost');const labels={HL_SIGN_IN_REQUIRED:'Sign in to your game account first.',HL_ROOM_NOT_FOUND:'That room is closed, expired, or the code is incorrect.',HL_ROOM_FULL:'This private room already has eight members.',HL_HOST_ONLY:'Only the rider who sent the invites can start this race.',HL_NEED_TWO_RIDERS_AT_START:'Wait until at least one friend has joined the race.',HL_NAME_REQUIRED:'Pick your username first (Friends).',HL_RACE_NOT_RUNNING:'That race isn’t running any more.',HL_RACE_TIME:'That finish time didn’t fit the race clock.',HL_ROOM_LIMIT:'You already host three rooms. Leave one before creating another.'};for(const [code,text]of Object.entries(labels))if(message.includes(code))return text;return message.length<180?message:'The connection needs attention. Try again.';};
export function mergeAdventure(local,remote){const result={...local,...remote,visited:[...new Set([...(local.visited||[]),...(remote.visited||[])])],games:{},supplies:{},daily:{...remote.daily,...local.daily},summit:!!(local.summit||remote.summit),regions:[...new Set([...(local.regions||[]),...(remote.regions||[])])],fog:fogMerge(local.fog,remote.fog),mountainFalls:Math.max(local.mountainFalls||0,remote.mountainFalls||0)};for(const key of new Set([...Object.keys(local.games||{}),...Object.keys(remote.games||{})]))result.games[key]=Math.max(local.games?.[key]||0,remote.games?.[key]||0);for(const k of ['apples','carrots','flowers'])result.supplies[k]=Math.max(local.supplies?.[k]||0,remote.supplies?.[k]||0);const times=[local.bestLap,remote.bestLap].filter(v=>Number(v)>0);result.bestLap=times.length?Math.min(...times):null;const climbs=[local.bestClimb,remote.bestClimb].filter(v=>Number(v)>0);result.bestClimb=climbs.length?Math.min(...climbs):null;return result;}
// Room multiplayer (server: hl_room). With the v2 server (supabase/migrations/202611080005_public_valleys_races.sql)
// signed-in riders drop into a public valley of up to 20 automatically; private rooms by code still work, and a race
// invite answered with Join moves you into the host's room (adopt). No chat: the server refuses it.
// The old server has no valleys; resume() then stays solo until you create/join a private room, as before.
export function createWorldNetwork({getState,onUpdate,onStatus,onProgress,onNotice}){
 const cloud=window.MeadowCloud;let room=null,snapshot=null,closed=false,timer=0,busy=false,teleport=false,lastReply=0,saveTimer=0,api=null;
 // Test friends (owner-only, test-friends.js) answer for hl_room while on; progress still syncs only with a real account.
 const real=()=>cloud?.active&&cloud.ready&&cloud.client,test=testOn(),account=()=>test||real();
 const memoryKey=()=>`horselandia-room-v1:${cloud?.user?.id}`;
 const empty={actors:[],messages:[],race:null};
 async function rpc(action,payload={}){if(!account())throw Error('HL_SIGN_IN_REQUIRED');if(test)return testCall('room',action,{...payload});const {data,error}=await cloud.client.rpc('hl_room',{p_action:action,p_payload:{...(room?.id&&action!=='valley'?{roomId:room.id}:{}),...payload}});if(error)throw error;return data;}
 function remember(){try{if(room?.code)sessionStorage.setItem(memoryKey(),JSON.stringify({code:room.code,nickname:cloud.displayName}));else sessionStorage.removeItem(memoryKey());}catch{}}
 function accept(data){if(closed)return;if(data.notices?.length)try{onNotice?.(data.notices);}catch{}room=data.room;snapshot=data;api=roomApi(data);lastReply=Date.now();onStatus('connected',`${data.actors.length} rider${data.actors.length===1?'':'s'} in ${room.name}`);onUpdate(data);remember();}
 // v142 load limits: no ticks while the tab is hidden (tick again the moment it shows), and a slow 3 s tick while you're
 // the only rider in the room and no race is on (others still see you: the server keeps riders 15 s).
 const hidden=()=>typeof document!=='undefined'&&document.hidden;
 const alone=()=>!snapshot?.race&&(snapshot?.actors?.length||0)<=1;
 const tickDelay=()=>alone()?3000:650;
 function schedule(){clearTimeout(timer);if(!closed&&room&&!hidden())timer=setTimeout(tick,tickDelay());}
 function onVisible(){if(!hidden()&&!closed&&room&&!busy){clearTimeout(timer);void tick();}}
 if(typeof document!=='undefined')document.addEventListener?.('visibilitychange',onVisible);
 async function tick(){if(closed||!room||busy)return;busy=true;try{const data=await rpc('tick',{state:getState(),teleport});teleport=false;accept(data);}catch(error){if(/HL_ROOM_NOT_FOUND|HL_NOT_A_MEMBER/.test(String(error?.message))){room=null;snapshot=null;remember();onUpdate(empty);onStatus('solo','The riding room has closed.');if(api==='v2')void valley();return;}onStatus('reconnecting',roomError(error));if(Date.now()-lastReply>15000)onUpdate({room,actors:[],messages:[],race:null});}finally{busy=false;schedule();}}
 async function join(code,nickname){clearTimeout(timer);const data=await rpc('join',{code,nickname:safeName(nickname)});accept(data);void tick();return data;}
 async function create(nickname){clearTimeout(timer);const data=await rpc('create',{nickname:safeName(nickname)});accept(data);void tick();return data;}
 // The public valley. Quietly stays solo on the old server (no 'valley' action) or before a username is picked.
 async function valley(){if(!account()||closed)return null;clearTimeout(timer);try{const data=await rpc('valley');accept(data);void tick();return data;}
   catch(error){const m=String(error?.message||error);if(/HL_UNKNOWN_ACTION/.test(m))api='v1';else if(/HL_NAME_REQUIRED/.test(m))onStatus('name','Pick a username to meet other riders.');else onStatus('solo','Exploring solo');return null;}}
 // A race invite answered with Join: the server already made you a member of that room.
 async function adopt(roomId){clearTimeout(timer);room={id:roomId};teleport=true;const data=await rpc('tick',{state:getState(),teleport:true});teleport=false;accept(data);schedule();return data;}
 async function leave(){clearTimeout(timer);if(room){const wasPrivate=!room.public;try{await rpc('leave');}finally{room=null;snapshot=null;remember();onUpdate(empty);onStatus('solo','Exploring solo');if(api==='v2'&&wasPrivate)void valley();}}}
 // My valley (202611160002): join a friend (drops you near them), Explore open valleys, the Friends only / Open switch,
 // ride on your own (back to your own valley), and which friends are riding right now. Old server: HL_UNKNOWN_ACTION.
 async function joinFriend(username){clearTimeout(timer);const data=await rpc('join_friend',{username});teleport=true;accept(data);schedule();return data;}
 async function explore(){clearTimeout(timer);const data=await rpc('explore');teleport=true;accept(data);schedule();return data;}
 async function setPrivacy(open){const data=await rpc('privacy',{open:!!open});accept(data);return data;}
 async function rideOwn(){clearTimeout(timer);if(room){try{await rpc('leave');}catch{}}room=null;snapshot=null;remember();onUpdate(empty);return valley();}
 async function friendsHere(){if(!account())return [];try{return (await rpc('friends_here'))?.friends||[];}catch{return [];}}
 async function startRace(){const data=await rpc('race_start');accept(data);return data;}
 async function finishRace(ms){const data=await rpc('race_finish',{ms:Math.round(ms)});accept(data);return data;}
 async function loadProgress(local){if(!real())return;try{const {data,error}=await cloud.client.rpc('hl_progress');if(error)throw error;if(data?.version===1)onProgress(mergeAdventure(local,data));}catch{onStatus('progress_local','Adventure progress is saved on this device. Cloud sync will retry.');}}
 function saveProgress(progress){clearTimeout(saveTimer);if(!real())return;saveTimer=setTimeout(async()=>{if(closed)return;try{const {error}=await cloud.client.rpc('hl_progress',{p_data:progress});if(error)throw error;}catch{onStatus('progress_local','Adventure progress is kept on this device until cloud saving is available.');}},1000);}
 async function resume(){if(!account())return;try{const saved=JSON.parse(sessionStorage.getItem(memoryKey())||'null');if(saved?.code){await join(saved.code,saved.nickname);return;}}catch{try{sessionStorage.removeItem(memoryKey());}catch{}}await valley();}
 return {get tickDelay(){return tickDelay();},get room(){return room;},get snapshot(){return snapshot;},get available(){return !!account();},get v2(){return api==='v2';},create,join,leave,valley,adopt,joinFriend,explore,setPrivacy,rideOwn,friendsHere,startRace,finishRace,loadProgress,saveProgress,resume,teleported(){teleport=true;},dispose(){closed=true;clearTimeout(timer);clearTimeout(saveTimer);if(typeof document!=='undefined')document.removeEventListener?.('visibilitychange',onVisible);}};
}
