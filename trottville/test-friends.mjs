// Test friends (owner-only playtest switch, note #25): eight computer-run riders so Yoshi can try every friends
// feature alone. It answers exactly like the real servers (hl_friends in 202611080006 and hl_room v2 in 202611080005),
// so friends.js and world-network.js run their normal code; nothing here touches Echowing or any other server.
// Pure: the clock, randomness, storage and the player's horses are passed in (tests/test-friends-check.mjs).
import {MAP_PATHS} from './world-content.mjs?v=160';
import {trailPoint,CLOUDSTEP} from './world-cloudstep.mjs?v=160';

export const TEST_ME='test-me',ROOM_ID='test-valley',STATE_KEY='trottville-test-friends-v1';
export const ONLINE_BLOCK=12*60e3; // who is online changes every 12 minutes
const DAY_MS=864e5;

// The riders. friend:true = already your friend when test mode starts; the others you meet in the valley.
export const BOTS=[
  {username:'SunnyTrails',friend:true,points:2400,run:14,won:6,since:'2026-06-14',horses:[['Biscuit','Quarter Horse','Palomino'],['Juniper','Arabian','Grey']]},
  {username:'CloverKid',friend:true,points:650,run:4,won:1,since:'2026-09-02',horses:[['Pip','Welsh Pony','Chestnut']]},
  {username:'MapleMoon',friend:false,asks:true,points:1800,run:9,won:5,since:'2026-07-21',horses:[['Midnight','Friesian','Black'],['Toffee','Haflinger','Chestnut']]},
  {username:'StarDapple',friend:true,points:5200,run:31,won:17,since:'2026-03-08',horses:[['Nimbus','Andalusian','Grey'],['Rusty','Mustang','Dun'],['Bluebell','Appaloosa','Roan']]},
  {username:'HayBaleHero',friend:true,points:300,run:2,won:0,since:'2026-10-30',horses:[['Waffles','Shetland Pony','Bay']]},
  {username:'WillowWhisper',friend:true,points:3100,run:12,won:4,since:'2026-05-19',horses:[['Fern','Connemara Pony','Buckskin'],['Duchess','Clydesdale','Bay']]},
  {username:'GallopGus',friend:false,points:900,run:7,won:3,since:'2026-08-11',horses:[['Rocket','Thoroughbred','Chocolate']]},
  {username:'PeppermintPony',friend:true,inviter:true,points:1500,run:10,won:4,since:'2026-07-04',horses:[['Sugar','Paint Horse','Cream'],['Clover','Morgan','Sorrel']]},
].map(b=>({...b,horses:b.horses.map(([name,breed,color],i)=>({id:`tf-${b.username.toLowerCase()}-${i+1}`,name,breed,color}))}));
const bot=name=>BOTS.find(b=>b.username.toLowerCase()===String(name||'').toLowerCase());

const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);
  h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);return (h^h>>>16)>>>0;};
const utcDay=t=>new Date(t).toISOString().slice(0,10);
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};

// Three riders online per 12-minute block, always at least two of them your friends.
export function onlineAt(t,friends){const block=Math.floor(t/ONLINE_BLOCK),order=BOTS.map(b=>b.username).sort((a,b)=>hash(block+":"+a)-hash(block+":"+b));
  const fr=order.filter(n=>friends.includes(n)),pick=fr.slice(0,2);for(const n of order)if(pick.length<3&&!pick.includes(n))pick.push(n);return pick;}

// Where an online rider is: trotting back and forth along one of the valley's riding paths (always walkable).
const PATHS=[MAP_PATHS.loop,...MAP_PATHS.routes,MAP_PATHS.track,MAP_PATHS.yard.concat([[0,15],[13,15]])];
export function wanderAt(name,t,speed=4.2){const path=PATHS[hash(name)%PATHS.length],segs=[];let total=0;
  for(let i=1;i<path.length;i++){const l=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);segs.push(l);total+=l;}
  let d=((t/1000*speed)+hash(name+'o')%997)%(2*total),back=d>total;if(back)d=2*total-d;
  for(let i=0;i<segs.length;i++){if(d<=segs[i]||i===segs.length-1){const a=path[i],b=path[i+1],f=segs[i]?Math.min(1,d/segs[i]):0,dx=(b[0]-a[0])*(back?-1:1),dz=(b[1]-a[1])*(back?-1:1);
    return {x:a[0]+(b[0]-a[0])*f,z:a[1]+(b[1]-a[1])*f,yaw:Math.atan2(dx,dz)};}d-=segs[i];}
  return {x:path[0][0],z:path[0][1],yaw:0};}

// The race courses, as the room server checks them (202611080005): lap gates, Cloudstep markers.
// Moved with the nine regions (v67): racecourse (185,-13)…, Cloudstep by (+92,-109).
export const COURSE={lap:{start:[185,-13],gates:[[208,-13],[208,12],[185,12],[185,-13]],r:[5,5,5,5],secs:[50,75]},
  summit:{start:[43.3,-158],gates:[[25.2,-147.6],[28.8,-174.9],[15.9,-188.4],[0,-205]],r:[6,6,6,8],secs:[160,230]},
  steeple:{start:[185,-13],gates:[],r:[],secs:[55,85]}};
const goalOf=kind=>kind==='steeple'?1:4;

export function createTestFriends({store=globalThis.localStorage,now=()=>Date.now(),rand=Math.random,myHorses=()=>[],inWorld=()=>false,ground=()=>0}={}){
  const fresh=()=>({v:1,me:{username:null,run:0,won:0},friends:BOTS.filter(b=>b.friend).map(b=>b.username),asked:[],incoming:[],declined:[],
    visits:[],notes:[],thanks:[],invites:[],replies:[],nextId:1,asksSent:false});
  let s;try{s=JSON.parse(store?.getItem(STATE_KEY)||'null');}catch{}if(!s||s.v!==1)s=fresh();
  const save=()=>{try{store?.setItem(STATE_KEY,JSON.stringify(s));}catch{}};
  const t0=now(),id=()=>s.nextId++;
  let nextFeed=t0+45e3,inviteDone=false,due=[],my={x:0,z:0,y:0,yaw:0,area:'barn',horseId:null,horseName:''},lastTick=0,race=null;
  const isFriend=n=>s.friends.some(f=>f.toLowerCase()===String(n).toLowerCase());
  const online=n=>onlineAt(now(),s.friends).includes(bot(n)?.username)||!!race?.racers[bot(n)?.username];
  const ridingOf=b=>b.horses[hash(b.username+dayKey(now()))%b.horses.length];
  const today=()=>dayKey(now());

  // Things the riders do by themselves; runs on every heartbeat and room tick.
  function step(){const t=now();let changed=false;
    // A friend who's online feeds one of your horses (a treat: your stable here is on this device).
    if(t>=nextFeed){nextFeed=t+60e3;const horses=myHorses().filter(h=>h?.id);
      const who=onlineAt(t,s.friends).filter(isFriend).map(bot).find(b=>horses.some(h=>!s.notes.some(n=>n.from===b.username&&n.horseId===h.id&&dayKey(n.at)===today())));
      if(who){const h=horses.find(h=>!s.notes.some(n=>n.from===who.username&&n.horseId===h.id&&dayKey(n.at)===today()));
        // Like the server: with a visiting card ('herd'), the first friend feed of an unfed horse today is its meal.
        const c=s.card?.day===utcDay(t)?(s.card.horses||[]).find(x=>x.id===h.id):null,meal=!!c&&!c.fed&&!s.notes.some(n=>n.meal&&n.horseId===h.id&&n.day===utcDay(t));
        s.notes.unshift({id:id(),from:who.username,horseId:h.id,horseName:h.name||'your horse',meal,day:utcDay(t),at:t,seen:false,thanked:false});s.notes=s.notes.slice(0,30);nextFeed=t+(6+rand()*4)*60e3;changed=true;}}
    // MapleMoon asks to be your friend once, 90 s in.
    const asker=BOTS.find(b=>b.asks);if(!s.asksSent&&t>=t0+90e3&&!isFriend(asker.username)){s.asksSent=true;s.incoming.push({username:asker.username,at:t});changed=true;}
    // Your requests: accepted after a few seconds (a minute if they're offline).
    for(const n of [...s.asked]){const a=s.askedAt?.[n]||t;if(t-a>=(online(n)?5e3:60e3)){s.asked=s.asked.filter(x=>x!==n);if(!isFriend(n))s.friends.push(n);changed=true;}}
    // Feeding a friend's horse gets a thank-you once they're online.
    for(const v of s.visits)if(!v.thanked&&online(v.owner)&&t-v.at>=18e3){v.thanked=true;s.thanks.push({id:v.id,from:v.owner,fromOnline:true,horseName:v.horseName,at:t});changed=true;}
    // PeppermintPony (or another online friend) invites you to a race once per session, 3 minutes in, while you're in the world.
    if(!inviteDone&&s.me.username&&inWorld()&&t>=t0+180e3&&(!race?.kind||raceDone())){const from=onlineAt(t,s.friends).filter(isFriend).sort((a,b)=>(bot(b).inviter?1:0)-(bot(a).inviter?1:0))[0];
      if(from){inviteDone=true;s.invites=[{id:id(),from,race:'lap',at:t}];changed=true;}}
    s.invites=s.invites.filter(i=>t-i.at<120e3);
    // Replies to your invites.
    for(const d of due.filter(d=>t>=d.at)){due=due.filter(x=>x!==d);s.replies.push({id:id(),from:d.from,race:d.race,reply:d.reply,seen:false});
      if(d.reply==='join'&&race&&race.id===d.raceId)race.racers[d.from]=racerFor(d.from);changed=true;}
    // A rider who hosts starts the race 15 s after you join.
    if(race&&race.host!==TEST_ME&&!race.startAt&&t>=race.joinedAt+15e3)startRace(t);
    if(race?.startAt)for(const [n,r] of Object.entries(race.racers))if(n!==TEST_ME&&r.finishMs==null&&t>=race.startAt+r.secs*1000){r.finishMs=r.secs*1000;r.raceIndex=goalOf(race.kind);}
    if(changed)save();}

  function racerFor(n){const c=COURSE[race?.kind||'lap'];return {secs:Math.round(c.secs[0]+(hash(n+race?.id)%1000)/1000*(c.secs[1]-c.secs[0])),raceIndex:0,finishMs:null};}
  function startRace(t){race.id='r'+id();race.startAt=t+5000;for(const n of Object.keys(race.racers)){const r=n===TEST_ME?{raceIndex:0,finishMs:null}:racerFor(n);race.racers[n]=r;}}

  // ---------- hl_friends ----------
  function snapshot(extra={}){const t=now(),list=s.friends.map(n=>({username:n,online:online(n),activity:race?.racers[n]&&race.startAt?'race':'roaming'}))
      .sort((a,b)=>(b.online-a.online)||a.username.localeCompare(b.username));
    return {...extra,me:{username:s.me.username,activity:'roaming',racesRun:s.me.run,racesWon:s.me.won,canRename:true},friends:list,
      requests:{incoming:s.incoming,outgoing:[...s.asked]},notes:s.notes.map(n=>({...n,fromOnline:online(n.from)})),
      thanks:s.thanks.filter(x=>!x.seen),invites:s.invites,replies:s.replies.filter(r=>!r.seen),
      unseen:s.notes.filter(n=>!n.seen).length+s.incoming.length,today:today(),serverNow:t,test:true};}
  function stable(b){const t=today(),mine=s.visits.filter(v=>v.owner===b.username&&v.day===t);
    return {username:b.username,online:online(b.username),visitsLeft:Math.max(0,12-mine.length),
      // v124: some computer friends' horses are still being tamed (help-tame), and each barn shows badges + a pet.
      horses:b.horses.map(h=>({...h,fedToday:hash(h.id+t)%2===0||mine.some(v=>v.horseId===h.id),fedByYou:mine.some(v=>v.horseId===h.id),
        tame:hash(h.id)%3===0?100:hash(h.id)%60+10,tameOpen:hash(h.id)%5!==0})),
      wall:{badges:[{id:'rider',tier:1+hash(b.username)%3},{id:'jumper',tier:1+hash(b.username+'j')%2},{id:'tamer',tier:1}],pet:{id:['dog','cat','goat','hen'][hash(b.username)%4],name:''}}};}
  const fail=code=>({error:code});
  function friends(action,p={}){step();const t=now(),b=bot(p.username);
    switch(action){
      case 'hello':case 'state':return snapshot();
      case 'herd':{const list=Array.isArray(p.horses)?p.horses:null;if(!list||list.length>12)return fail('HL_FRIEND_BAD');
        if(list.some(h=>!h||typeof h.id!=='string'||!h.name)||new Set(list.map(h=>h.id)).size!==list.length)return fail('HL_FRIEND_HORSE');
        s.card={horses:list.map(h=>({id:h.id,name:h.name,fed:!!h.fed})),herdSize:p.herdSize|0,points:p.points|0,day:utcDay(t)};save();return snapshot({herd:list.length});}
      case 'claim':{const n=String(p.username||'').trim();if(!/^[A-Za-z][A-Za-z0-9_]{2,15}$/.test(n))return fail('HL_NAME_BAD');if(bot(n))return fail('HL_NAME_TAKEN');s.me.username=n;save();return snapshot({claimed:n});}
      case 'request':{if(!s.me.username)return fail('HL_NAME_REQUIRED');if(!b)return fail('HL_FRIEND_UNKNOWN');if(isFriend(b.username)||s.asked.includes(b.username))return fail('HL_FRIEND_ALREADY');
        if(s.incoming.some(r=>r.username===b.username)){s.incoming=s.incoming.filter(r=>r.username!==b.username);s.friends.push(b.username);save();return snapshot({friends:b.username});}
        s.asked.push(b.username);s.askedAt={...s.askedAt,[b.username]:t};save();return snapshot({requested:b.username});}
      case 'accept':{if(!b||!s.incoming.some(r=>r.username===b.username))return fail('HL_FRIEND_NO_REQUEST');s.incoming=s.incoming.filter(r=>r.username!==b.username);if(!isFriend(b.username))s.friends.push(b.username);save();return snapshot({friends:b.username});}
      case 'decline':{s.incoming=s.incoming.filter(r=>r.username!==b?.username);save();return snapshot();}
      case 'cancel':{s.asked=s.asked.filter(n=>n!==b?.username);save();return snapshot();}
      case 'remove':{if(!b||!isFriend(b.username))return fail('HL_FRIEND_NOT_FRIENDS');s.friends=s.friends.filter(n=>n!==b.username);save();return snapshot({removed:b.username});}
      case 'profile':{if(!b&&String(p.username).toLowerCase()!==String(s.me.username).toLowerCase())return fail('HL_FRIEND_UNKNOWN');
        if(!b)return snapshot({profile:{username:s.me.username,online:true,activity:'roaming',points:0,horses:myHorses().length,racesRun:s.me.run,racesWon:s.me.won,racesLost:s.me.run-s.me.won,since:today(),friend:'you',riding:null}});
        const on=online(b.username),h=ridingOf(b);
        return snapshot({profile:{username:b.username,online:on,activity:'roaming',points:b.points,horses:b.horses.length,racesRun:b.run,racesWon:b.won,racesLost:b.run-b.won,since:b.since,
          friend:isFriend(b.username)?'friend':s.asked.includes(b.username)?'asked':s.incoming.some(r=>r.username===b.username)?'asks-you':'none',riding:on?{...h,trait:''}:null}});}
      case 'visit':case 'feed':{if(!b||!isFriend(b.username))return fail('HL_FRIEND_NOT_FRIENDS');let fed;
        if(action==='feed'){const h=b.horses.find(x=>x.id===p.horseId);if(!h)return fail('HL_FRIEND_HORSE');const st=stable(b),sh=st.horses.find(x=>x.id===h.id);
          if(sh.fedByYou)return fail('HL_FRIEND_ALREADY_FED');if(!st.visitsLeft)return fail('HL_FRIEND_OWNER_CAP');
          const v={id:id(),owner:b.username,horseId:h.id,horseName:h.name,day:today(),at:t,meal:!sh.fedToday,thanked:false};s.visits.push(v);s.visits=s.visits.filter(x=>t-x.at<14*DAY_MS);save();
          fed={id:v.id,horseId:h.id,horseName:h.name,meal:v.meal};}
        return snapshot({...(fed?{fed}:{}),stable:stable(b)});}
      case 'thank':{const n=s.notes.find(x=>x.id===Number(p.id));if(!n)return fail('HL_FRIEND_NOTE');if(n.thanked)return fail('HL_FRIEND_ALREADY_THANKED');n.thanked=true;n.seen=true;save();return snapshot({thanked:n.id});}
      case 'seen':{if(p.notes)s.notes.forEach(n=>n.seen=true);for(const x of s.thanks)if((p.thanks||[]).includes(x.id))x.seen=true;for(const r of s.replies)if((p.replies||[]).includes(r.id))r.seen=true;
        s.thanks=s.thanks.filter(x=>!x.seen||t-x.at<DAY_MS);s.replies=s.replies.filter(r=>!r.seen);save();return snapshot();}
      case 'invite':{if(!s.me.username)return fail('HL_NAME_REQUIRED');const kind=COURSE[p.race]?p.race:'lap';
        const targets=(p.all?s.friends:(p.usernames||[]).map(n=>bot(n)?.username)).filter(n=>n&&isFriend(n)&&online(n));
        if(!(race&&race.host===TEST_ME&&race.kind===kind&&(!race.startAt||raceDone()))){race={id:'r'+id(),kind,host:TEST_ME,startAt:null,joinedAt:t,racers:{[TEST_ME]:{raceIndex:0,finishMs:null}}};}
        for(const n of targets)if(!race.racers[n])due.push({from:n,race:kind,raceId:race.id,at:t+3e3+rand()*5e3,reply:rand()<.85?'join':'busy'});
        return snapshot({invited:targets.length,roomId:ROOM_ID});}
      case 'answer':{const i=s.invites.find(x=>x.id===Number(p.id));if(!i)return fail('HL_INVITE_GONE');s.invites=s.invites.filter(x=>x!==i);save();
        if(p.reply!=='join')return snapshot({answered:i.id});
        race={id:'r'+id(),kind:i.race,host:i.from,startAt:null,joinedAt:t,racers:{[i.from]:null,[TEST_ME]:{raceIndex:0,finishMs:null}}};race.racers[i.from]=racerFor(i.from);
        const extra=onlineAt(t,s.friends).find(n=>n!==i.from&&isFriend(n));if(extra)race.racers[extra]=racerFor(extra);
        return snapshot({joined:{roomId:ROOM_ID,race:i.race}});}
      default:return fail('HL_FRIEND_ACTION');}}

  // ---------- hl_room ----------
  const raceDone=()=>{if(!race?.startAt)return false;const rs=Object.values(race.racers);return rs.every(r=>r.finishMs!=null)||now()-race.startAt>600e3;};
  function racerPos(n,r){const c=COURSE[race.kind]||COURSE.lap,[sx,sz]=c.start,off=(hash(n)%5-2)*1.6;
    if(!race.startAt||now()<race.startAt||!c.gates.length)return {x:sx+off,z:sz+(race.kind==='summit'?off:3),yaw:race.kind==='lap'?Math.PI/2:0};
    // The summit climb follows the spiral ledge (straight lines between checkpoints would cut through the mountain).
    if(race.kind==='summit'){const k=Math.min(1,(now()-race.startAt)/(r.secs*1000)),PHI=CLOUDSTEP.TURNS*Math.PI*2,phi=.02+k*(PHI-.02),p=trailPoint(phi),q=trailPoint(Math.min(PHI,phi+.05)),a=Math.atan2(p.z-CLOUDSTEP.cz,p.x-CLOUDSTEP.cx),lane=k<.98?off*.5:0;
      r.raceIndex=r.finishMs!=null?goalOf(race.kind):Math.min(c.gates.length-1,Math.floor(k*c.gates.length));return {x:p.x+Math.cos(a)*lane,z:p.z+Math.sin(a)*lane,yaw:Math.atan2(q.x-p.x,q.z-p.z)};}
    const f=Math.min(1,(now()-race.startAt)/(r.secs*1000))*c.gates.length,i=Math.min(c.gates.length-1,Math.floor(f)),a=i?c.gates[i-1]:c.start,b=c.gates[i],k=Math.min(1,f-i);
    r.raceIndex=r.finishMs!=null?goalOf(race.kind):Math.floor(f);return {x:a[0]+(b[0]-a[0])*k+off*.5,z:a[1]+(b[1]-a[1])*k,yaw:Math.atan2(b[0]-a[0],b[1]-a[1])};}
  function moveMe(state,teleport){const t=now(),x=Number(state?.x)||0,z=Number(state?.z)||0,y=Number(state?.y)||0,area=String(state?.area||'outdoor');
    const me=race?.racers[TEST_ME];
    if(me&&race.startAt&&t>=race.startAt&&me.finishMs==null&&race.kind!=='steeple'&&area==='outdoor'&&state?.horseId){const c=COURSE[race.kind];
      if(teleport||my.area!==area)me.raceIndex=0;
      else{const g=c.gates[me.raceIndex];if(g&&Math.hypot(x-g[0],z-g[1])<c.r[me.raceIndex]&&(race.kind!=='summit'||me.raceIndex<3||y>95))me.raceIndex++;}
      if(me.raceIndex>=goalOf(race.kind))finishMe(t-race.startAt);}
    my={x,z,y,yaw:Number(state?.yaw)||0,area,horseId:state?.horseId||null,horseName:String(state?.horseName||'').slice(0,40)};lastTick=t;}
  function finishMe(ms){const me=race.racers[TEST_ME];me.finishMs=Math.max(0,Math.round(ms));me.raceIndex=goalOf(race.kind);
    const faster=Object.entries(race.racers).filter(([n,r])=>n!==TEST_ME&&r.finishMs!=null&&r.finishMs<me.finishMs).length;
    s.me.run++;if(!faster&&Object.values(race.racers).every(r=>r===me||r.finishMs==null||r.finishMs>=me.finishMs))s.me.won++;save();}
  function roomReply(){const t=now(),actors=[{id:TEST_ME,name:s.me.username||'You',state:my,seenAt:lastTick||t,racer:!!race?.racers[TEST_ME],raceIndex:race?.racers[TEST_ME]?.raceIndex||0,finishMs:race?.racers[TEST_ME]?.finishMs??null}];
    const names=new Set([...onlineAt(t,s.friends),...Object.keys(race?.racers||{}).filter(n=>n!==TEST_ME)]);
    for(const n of names){const b=bot(n),r=race?.racers[n],p=r?racerPos(n,r):wanderAt(n,t),h=ridingOf(b);
      actors.push({id:'tf-'+n.toLowerCase(),name:n,state:{x:p.x,z:p.z,y:ground(p.x,p.z),yaw:p.yaw,area:'outdoor',horseId:h.id,horseName:h.name},seenAt:t,racer:!!r,raceIndex:r?.raceIndex||0,finishMs:r?.finishMs??null});}
    const notices=valleyNotices(t);
    return {room:{id:ROOM_ID,code:null,name:'Test valley',public:true,hostId:race?.host?(race.host===TEST_ME?TEST_ME:'tf-'+race.host.toLowerCase()):TEST_ME,expiresAt:null,privacy:open?'open':'friends',mine:true},
      actors,messages:[],serverNow:t,notices,near:null,race:race?{id:race.id,kind:race.kind,goal:goalOf(race.kind),startAt:race.startAt}:{id:null,kind:null,goal:null,startAt:null}};}
  // My valley: every online test friend rides in your one test valley; one of them "joins you" a minute in (once a session).
  let open=false,enteredAt=0,joinedSent=false;
  function valleyNotices(t){if(!enteredAt)enteredAt=t;if(joinedSent||t-enteredAt<60e3)return [];const who=onlineAt(t,s.friends).find(n=>s.friends.includes(n));if(!who)return [];joinedSent=true;return [{name:who,kind:'joined',at:t}];}
  function friendsHere(){const t=now();return onlineAt(t,s.friends).filter(n=>s.friends.includes(n)).map(n=>{const p=wanderAt(n,t),h=ridingOf(bot(n));return {username:n,horseName:h.name,cellX:Math.round(p.x/40)*40,cellZ:Math.round(p.z/40)*40,area:'outdoor',full:false,together:true};});}
  function room(action,p={}){step();
    switch(action){
      case 'friends_here':return {friends:friendsHere()};
      case 'join_friend':{const n=bot(p.username)?.username;if(!n||!s.friends.includes(n))throw Error('HL_FRIEND_NOT_FRIENDS');if(!onlineAt(now(),s.friends).includes(n))throw Error('HL_FRIEND_NOT_IN_WORLD');
        const w=wanderAt(n,now()),r=roomReply();r.near={x:w.x,z:w.z,y:ground(w.x,w.z),area:'outdoor',name:n};return r;}
      case 'explore':throw Error('HL_NO_OPEN_VALLEYS');
      case 'privacy':open=!!p.open;return roomReply();
      case 'valley':case 'join':case 'create':return roomReply();
      case 'tick':moveMe(p.state,p.teleport);return roomReply();
      case 'leave':race=race?.host===TEST_ME?null:race;return roomReply();
      case 'race_start':{if(!race||race.host!==TEST_ME)throw Error('HL_RACE_HOST');if(Object.keys(race.racers).length<2)throw Error('HL_RACE_ALONE');startRace(now());return roomReply();}
      case 'race_finish':{const me=race?.racers[TEST_ME];if(!me||race.kind!=='steeple'||me.finishMs!=null)throw Error('HL_RACE_TIME');finishMe(Number(p.ms)||0);return roomReply();}
      default:throw Error('HL_UNKNOWN_ACTION');}}

  return {friends,room,step,reset(){s=fresh();race=null;due=[];save();},get state(){return s;},get race(){return race;}};
}
