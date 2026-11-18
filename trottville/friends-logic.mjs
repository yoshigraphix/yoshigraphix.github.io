// Friends v2 rules shared by friends.js and world.js (pure, tested in tests/friends-logic-check.mjs).
// Mirrors supabase/migrations/202611080006_friends_invites.sql and 202611080005_public_valleys_races.sql.

// The server's username rule: 3–16 letters, digits or _, starting with a letter. The server also refuses rude words
// (private.hl_username_ok); this only gives live hints while typing.
export const USERNAME=/^[A-Za-z][A-Za-z0-9_]{2,15}$/;
export function usernameProblem(raw){const name=String(raw??'').trim();
  if(!name)return 'Pick a name your friends can type.';
  if(!/^[A-Za-z]/.test(name))return 'Start with a letter.';
  if(/[^A-Za-z0-9_]/.test(name))return 'Only letters, numbers and _ (no spaces).';
  if(name.length<3)return 'At least 3 characters.';
  if(name.length>16)return 'Up to 16 characters.';
  return '';}

// Which hl_friends the server runs: 'v2' replies carry me.username / me.canRename, the old friend-code server me.code.
export function friendsApi(reply){const me=reply?.me;if(!me)return null;return 'canRename' in me||'username' in me?'v2':'v1';}
// hl_room v2 rooms say whether they are public; the old server's never do.
export const roomApi=reply=>reply?.room&&'public' in reply.room?'v2':'v1';

export const RACES={
  summit:{id:'summit',name:'Cloudstep Summit',short:'summit race',icon:'⛰️',goal:4,unit:'checkpoints'},
  lap:{id:'lap',name:'Clover Racecourse lap',short:'lap race',icon:'🏁',goal:4,unit:'gates'},
  steeple:{id:'steeple',name:'Countryside steeplechase',short:'steeplechase',icon:'🐎',goal:1,unit:''}};
export const raceName=kind=>RACES[kind]?.name||'race';

export const ACTIVITY={roaming:'Riding around',game:'Playing a game',race:'Racing'};
export const activityText=(f)=>f.online?(ACTIVITY[f.activity]||'Online now'):'Offline';

// Level from stable points (the same points the stable shows). Gentle curve: level 2 at 100, 5 at ~1,600, 10 at ~8,100.
export const levelFor=points=>1+Math.floor(Math.sqrt(Math.max(0,Number(points)||0)/100));

// Who an invite goes to: 'all' online friends, or the picked names that are online friends (case-insensitive).
export function inviteTargets(friends,picked){const online=(friends||[]).filter(f=>f.online);
  if(picked==='all')return online.map(f=>f.username);
  const want=new Set((picked||[]).map(n=>String(n).toLowerCase()));
  return online.filter(f=>want.has(f.username.toLowerCase())).map(f=>f.username);}

// Finishing order for a room race: finishers by time, then riders still going by progress.
export function standings(actors){const racers=(actors||[]).filter(a=>a.racer);
  return racers.slice().sort((a,b)=>(a.finishMs==null)-(b.finishMs==null)||(a.finishMs??0)-(b.finishMs??0)||(b.raceIndex||0)-(a.raceIndex||0)||String(a.name).localeCompare(String(b.name)))
    .map((a,i)=>({...a,place:a.finishMs==null?null:i+1}));}
export const ordinal=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th');
export const raceTime=ms=>{const s=ms/1000;return s<60?s.toFixed(1)+' s':Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0');};

// Room race phase from the server reply: 'none' | 'gathering' (invites out, not started) | 'countdown' | 'running' | 'done'.
export function racePhase(race,actors,now){if(!race?.kind)return 'none';if(!race.startAt)return 'gathering';
  if(now<race.startAt)return 'countdown';const racers=(actors||[]).filter(a=>a.racer);
  if(racers.length&&racers.every(a=>a.finishMs!=null))return 'done';
  return now-race.startAt>10*60*1000?'done':'running';}

// The steeplechase is its own scene; every racer in a room rides the same course, seeded by the race id.
export const steepleSeed=raceId=>{let h=2166136261;for(const c of String(raceId||''))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};

// Plain words for a profile card.
export function profileFacts(p){if(!p)return [];const run=p.racesRun||0,won=p.racesWon||0;
  return [['Races won',String(won)],['Races lost',String(p.racesLost??Math.max(0,run-won))],
    ['Horses',String(p.horses||0)],['Riding since',p.since?new Date(p.since+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric'}):'—']];}

// Names other riders can see (horses, pets): the same word list as the server's private.hl_username_ok.
// The worst roots are refused anywhere inside a word; milder ones only where a word starts (words split at spaces,
// digits, punctuation and a lower→Capital step), so Peacock, Rabbit Chaser and Skillful are fine.
const WORST=/(fuck|cunt|nigg|whore|slut|porn|pussy|penis|vagina|nazi|hitler|bitch)/;
const MILD=/^(shit|dick|cock|sex|rape|kill|fag|retard)/;
export function rudeName(raw){const s=String(raw??'');
  if(s.toLowerCase().split(/[^a-z]+/).some(w=>WORST.test(w)))return true;
  return s.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().split(/[^a-z]+/).some(w=>w&&MILD.test(w));}
export const safeName=(name,fallback='Horse')=>rudeName(name)?fallback:name;
export const horseNameProblem=raw=>rudeName(raw)?'Please pick a different name. Other riders can see it.':'';
