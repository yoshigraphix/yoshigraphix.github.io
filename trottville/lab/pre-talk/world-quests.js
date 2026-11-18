// Side quests in the 3D world (note #26): the quest givers standing around the valley, Talk, the things you carry or
// lead home, the pickups, the 10-minute timer pill and the Quest Log button. The rules live in quests.mjs (pure,
// tested); the 200 quests and their givers in quest-content.mjs; the book and talk markup in quest-log.js.
// world.js creates this once and calls update() every frame, near()/hit() for Talk, and complete() for the corn maze.
import * as Q from './quests.mjs';
import {iconHTML,PX_NAMES,pxSrc} from './pixel-icons.js';
import {GIVERS} from './quest-content.mjs';
import {openQuestLog,talkHTML,badgeToastHTML,ensureQuestLogCss} from './quest-log.js';
import {makeChibiCharacter} from './chibi-character.js';
import {lookFromSeed} from './character-looks.mjs';
import {queueCoins} from './coin-collect.js';
import {sfx} from './sfx.js';
import {log as playLog} from './play-log.js';

const TALK_R=3.6,SHOW_R=80,ANIM_R=40;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mmss=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};

// A small round icon drawn on a canvas, used above givers (! / ✓) and for pickups. No name text (Yoshi: no tags).
const iconCache=new Map();
// px = a pixel icon name (assets/icons): drawn free-standing once it loads (the emoji shows until then).
function iconTexture(T,glyph,bg,px){const key=glyph+bg+(px||'');if(iconCache.has(key))return iconCache.get(key);
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  if(px&&PX_NAMES.has(px)){const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;iconCache.set(key,t);
    g.textAlign='center';g.textBaseline='middle';g.font='88px system-ui, "Apple Color Emoji","Noto Color Emoji",sans-serif';g.fillText(glyph,64,72);
    const im=new Image();im.onload=()=>{g.clearRect(0,0,128,128);g.imageSmoothingEnabled=false;g.drawImage(im,4,4,120,120);t.needsUpdate=true;};im.src=pxSrc(px);return t;}
  if(bg){g.fillStyle=bg;g.beginPath();g.arc(64,64,54,0,Math.PI*2);g.fill();g.lineWidth=8;g.strokeStyle='#fff8e6';g.stroke();}
  g.textAlign='center';g.textBaseline='middle';g.font=(bg?'800 70px':'88px')+' system-ui, "Apple Color Emoji","Noto Color Emoji",sans-serif';g.fillStyle=bg?'#fff':'#000';g.fillText(glyph,64,bg?68:72);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;iconCache.set(key,t);return t;}
const GIVER_ICON={offer:['!','#e8a33a','quest-new'],turnin:['✓','#4f9a4a','quest-done'],active:['…','#7d8fa8','chat'],receive:['📦','#4f86c6','quest-deliver']};

// Little animals for escort quests that aren't people (a puppy, a goat, a lamb...): a few rounded shapes.
function critter(T,kind,prep){const g=new T.Group(),col={puppy:'#c98c4f',dog:'#c98c4f',goat:'#e9e2d3',lamb:'#f4efe6',kitten:'#e39b54',cat:'#e39b54',piglet:'#f2b3b6',duck:'#f3d34a',bunny:'#d9cbbb'}[kind]||'#c98c4f';
  const m=prep(new T.MeshStandardMaterial({color:col,roughness:.85,flatShading:true})),d=prep(new T.MeshStandardMaterial({color:'#3a2a20',roughness:.8}));
  const body=new T.Mesh(new T.IcosahedronGeometry(.32,1),m);body.scale.set(1.25,.85,.85);body.position.y=.42;g.add(body);
  const head=new T.Mesh(new T.IcosahedronGeometry(.22,1),m);head.position.set(.38,.62,0);g.add(head);
  for(const z of [-.08,.08]){const e=new T.Mesh(new T.SphereGeometry(.035,6,4),d);e.position.set(.56,.68,z);g.add(e);}
  for(const [x,z] of [[.2,.14],[.2,-.14],[-.2,.14],[-.2,-.14]]){const l=new T.Mesh(new T.CylinderGeometry(.05,.05,.3,5),m);l.position.set(x,.15,z);g.add(l);}
  const ear=new T.Mesh(new T.ConeGeometry(.08,.18,4),m);ear.position.set(.34,.84,0);g.add(ear);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return g;}

export function createWorldQuests({T,outdoors,groundY,prep=m=>m,tell,adventureUI,host,storageKey='guest',onPin=()=>{},onChange=()=>{}}){
  ensureQuestLogCss();
  const KEY=Q.QUEST_KEY+':'+storageKey;
  let state;try{state=Q.normalizeQuests(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{state=Q.normalizeQuests(null);}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}onChange();};
  const root=new T.Group();root.name='quests';outdoors.add(root);
  const now=()=>Date.now();

  // The givers: chibi townsfolk from a seeded look (kids are smaller). Only nearby ones animate.
  const givers=GIVERS.map(g=>{const look={...lookFromSeed('quest-'+(g.seed||g.id))};const kid=/kid|child|girl|boy/i.test(g.role||'');
    const c=makeChibiCharacter(T,look);c.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});const group=new T.Group();group.add(c.root);if(kid)c.root.scale.setScalar(.78);
    let h=0;for(const ch of g.id)h=(h*31+ch.charCodeAt(0))>>>0;group.rotation.y=(h%628)/100;group.position.set(g.x,groundY(g.x,g.z),g.z);
    const icon=new T.Sprite(new T.SpriteMaterial({map:iconTexture(T,'!','#e8a33a','quest-new'),depthWrite:false,transparent:true}));icon.scale.setScalar(.75);icon.position.y=kid?2.05:2.5;icon.visible=false;group.add(icon);
    root.add(group);return {data:g,group,char:c,icon,kid,mark:null,yaw:group.rotation.y};});
  const giverById=id=>givers.find(g=>g.data.id===id);

  // Things the world draws for active quests: pickups (bobbing icons), followers (kid / critter / foal), targets (a soft beam).
  const live=new Map();
  const beamMat=new T.MeshBasicMaterial({color:'#ffd977',transparent:true,opacity:.28,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
  const beamGeo=new T.CylinderGeometry(.55,.9,22,12,1,true);beamGeo.translate(0,11,0);
  function build(m){const g=new T.Group();
    if(m.type==='pickup'){const s=new T.Sprite(new T.SpriteMaterial({map:iconTexture(T,m.icon||'✨',null,m.px),depthWrite:false,transparent:true}));s.scale.setScalar(.85);s.position.y=1.1;g.add(s);
      const glow=new T.Mesh(new T.CircleGeometry(.6,16),new T.MeshBasicMaterial({color:'#fff1b0',transparent:true,opacity:.45,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.y=.05;g.add(glow);g.userData.bob=s;}
    else if(m.type==='follower'){if(m.kind==='kid'||m.kind==='child'){const c=makeChibiCharacter(T,lookFromSeed('quest-kid-'+(m.seed||m.id)));c.root.scale.setScalar(.72);g.add(c.root);g.userData.char=c;}
      else{const c=critter(T,m.kind,prep);c.scale.setScalar(m.kind==='foal'?1.6:1);g.add(c);g.userData.critter=c;}}
    else if(m.type==='target'){const b=new T.Mesh(beamGeo,beamMat);b.renderOrder=2;g.add(b);}
    g.position.set(m.x,groundY(m.x,m.z),m.z);root.add(g);return {m,g,trail:[],hop:0};}
  function drop(key){const e=live.get(key);if(!e)return;root.remove(e.g);e.g.userData.char?.dispose?.();e.g.traverse(o=>{if(o.isMesh&&o.geometry!==beamGeo)o.geometry.dispose();});live.delete(key);}
  const keyOf=m=>m.type+':'+(m.id||m.quest||'')+':'+(m.type==='target'?m.label:'');

  let markers=[],giverMarks=new Map();
  function refresh(){markers=Q.markers(state,now())||[];const want=new Set();giverMarks=new Map();
    for(const m of markers){if(m.type==='giver'){giverMarks.set(m.giverId,m.state);continue;}const k=keyOf(m);want.add(k);
      if(!live.has(k))live.set(k,build(m));else{const e=live.get(k);if(!(m.type==='follower'&&e.following))e.m=m;if(m.type!=='follower')e.g.position.set(m.x,groundY(m.x,m.z),m.z);}}
    for(const k of [...live.keys()])if(!want.has(k))drop(k);
    for(const g of givers){const s=giverMarks.get(g.data.id),ic=GIVER_ICON[s];g.icon.visible=!!ic;if(ic&&g.mark!==s){g.icon.material.map=iconTexture(T,ic[0],ic[1],ic[2]);g.icon.material.needsUpdate=true;}g.mark=s;}
    paintPill();}

  // The pill under the top bar: the most urgent active quest and its clock, plus the Quest Log button.
  const pill=document.createElement('div');pill.className='wq-pill';pill.innerHTML='<button type="button" class="wq-book" aria-label="Quest Log">📖</button><button type="button" class="wq-now" hidden></button>';host.append(pill);
  const nowBtn=pill.querySelector('.wq-now');
  pill.querySelector('.wq-book').onclick=()=>openLog();nowBtn.onclick=()=>{const a=Q.activeList(state,now())[0];if(a)onPin(a);};
  let lastPill='';
  function paintPill(){const list=Q.activeList(state,now())||[];const a=list[0];let html='';
    if(a){const secs=a.secondsLeft??a.left??0;html=`<span aria-hidden="true">${iconHTML(a.icon||'📜',a.px||'quest-new')}</span><b>${esc(a.title)}</b><small>${esc(a.progress||'')}</small><time class="${secs<60?'wq-hurry':''}">${a.secondsLeft==null?'':mmss(secs)}</time>${list.length>1?`<i>+${list.length-1}</i>`:''}`;}
    if(html!==lastPill){nowBtn.innerHTML=html;nowBtn.hidden=!a;lastPill=html;}}

  function pay(reward,title){if(!(reward>0))return;queueCoins({from:'Quest · '+title,coins:reward,lines:[title+' · '+reward+' 🪙']});sfx('coin');}
  function celebrate(prev){const fresh=Q.newBadges(prev,state)||[];for(const b of fresh){sfx('fanfare');const t=document.createElement('div');t.className='wq-badge';t.innerHTML=badgeToastHTML(b);host.append(t);t.addEventListener('animationend',()=>t.remove());playLog('badge',{id:b.id});}}

  // Talk: what this giver says now (offer, reminder, turn-in, delivery for them, gone home, needs a horse).
  function talk(id,ctx){const g=giverById(id);if(!g)return;const prev=state,res=Q.talk(state,id,now(),ctx);state=res.state||state;
    if(res.kind==='turnin'||res.kind==='receive'){pay(res.reward??res.quest?.reward,res.quest?.title||'Quest');sfx('chime');playLog('quest',{id:res.quest?.id,done:true});celebrate(prev);}
    save();refresh();sfx('pop');
    adventureUI.open(g.data.name,talkHTML(res,g.data));const d=adventureUI.dialog;
    d.querySelectorAll('[data-quest-action]').forEach(b=>b.onclick=()=>{const act=b.dataset.questAction;
      if(act==='accept'){const before=state;const r=Q.accept(state,b.dataset.quest,now(),ctx);state=r?.state||before;if(r&&r.ok===false){adventureUI.close();tell({full:'You already have 3 quests on the go. Finish one first!','needs-horse':'You’ll need your horse for this one.',gone:'They’ve gone home for today.',tomorrow:'See them again tomorrow.'}[r.reason]||'Not right now.',4);return;}save();refresh();sfx('buckle');playLog('quest',{id:b.dataset.quest,accepted:true});
        const a=Q.activeList(state,now()).find(x=>x.id===b.dataset.quest);tell([a?.title||'Quest',a?.todo||a?.progress,mmss(a?.secondsLeft||600)+' to go'].filter(Boolean).join(' · '),5);}
      adventureUI.close();});
    g.group.rotation.y=Math.atan2(ctx.x-g.data.x,ctx.z-g.data.z);}

  function openLog(){openQuestLog({host,state,now:now(),onPin:id=>{const a=Q.activeList(state,now()).find(x=>x.id===id);if(a)onPin(a);},onClose:()=>{}});}

  let acc=0,lastSec=-1;const nudged=new Map();
  function update(dt,p){root.visible=p.area==='outdoor';if(!root.visible)return;
    // Riding past someone who needs you: one gentle nudge (not again for 2 minutes).
    {const g=near(p.x,p.z),s=g&&giverMarks.get(g.id);if(g&&(s==='offer'||s==='turnin'||s==='receive')&&performance.now()-(nudged.get(g.id)||-1e9)>12e4){nudged.set(g.id,performance.now());tell(g.name+(s==='offer'?' wants a word':' is waiting for you')+' · tap them or press Interact',4);}}
    // Givers: face you when you're close, idle otherwise; far ones are hidden.
    for(const g of givers){const d=Math.hypot(g.data.x-p.x,g.data.z-p.z);g.group.visible=d<SHOW_R;if(d<ANIM_R){g.char.update(dt,{pose:'stand'});
      if(d<6){const want=Math.atan2(p.x-g.data.x,p.z-g.data.z);let dy=want-g.group.rotation.y;dy=Math.atan2(Math.sin(dy),Math.cos(dy));g.group.rotation.y+=dy*Math.min(1,dt*4);}
      if(g.icon.visible)g.icon.position.y=(g.kid?2.05:2.5)+Math.sin(performance.now()/380+g.data.x)*.08;}}
    // Pickups bob; hidden ones (lost things) only show within 10 m; followers trail you once found.
    const t=performance.now()/1000;
    for(const e of live.values()){const m=e.m;
      if(m.type==='pickup'){e.g.visible=!m.hidden||Math.hypot(m.x-p.x,m.z-p.z)<10;const s=e.g.userData.bob;if(s){s.position.y=1.1+Math.sin(t*2.2+m.x)*.15;}}
      else if(m.type==='follower'){const following=m.following||m.found||e.following;
        if(following){e.following=true;e.trail.push({x:p.x,z:p.z});if(e.trail.length>400)e.trail.shift();
          const pos=e.g.position;let goal=null;for(let i=e.trail.length-1;i>=0;i--){const q=e.trail[i];if(Math.hypot(q.x-p.x,q.z-p.z)>2.4){goal=q;break;}}
          if(goal){const dx=goal.x-pos.x,dz=goal.z-pos.z,dist=Math.hypot(dx,dz);if(dist>.05){const sp=Math.min(dist*3,(p.speed||4)+1.5,11);pos.x+=dx/dist*sp*dt;pos.z+=dz/dist*sp*dt;e.g.rotation.y=Math.atan2(dx,dz);}
            if(dist>18){pos.x=goal.x;pos.z=goal.z;}}
          pos.y=groundY(pos.x,pos.z);const moving=goal&&Math.hypot(goal.x-pos.x,goal.z-pos.z)>.3;
          e.g.userData.char?.update(dt,{pose:moving?'walk':'stand',speed:moving?3:0});if(e.g.userData.critter)e.g.userData.critter.position.y=moving?Math.abs(Math.sin(t*12))*.12:0;}
        else{e.g.userData.char?.update(dt,{pose:'stand'});if(e.g.userData.critter)e.g.userData.critter.rotation.y=Math.sin(t*.7+m.x)*.6;}}}
    // Rules step four times a second: pickups, arrivals, timeouts.
    acc+=dt;if(acc<.25)return;acc=0;const prev=state;
    const r=Q.step(state,now(),{x:p.x,z:p.z,mounted:p.mounted});state=r.state||state;let changed=state!==prev;
    const evs=r.events||[],followed=evs.some(e=>e.type==='follow');
    for(const ev of evs){changed=true;const q=(typeof ev.quest==='string'?Q.getQuest(ev.quest):ev.quest)||{};if(ev.type==='ready'&&followed)continue;
      if(ev.type==='picked'){sfx('pop');tell((ev.item?.icon||'✨')+' '+(ev.item?.name||'Got it')+(ev.need>ev.have?' · '+(ev.need-ev.have)+' to go':''),3);}
      else if(ev.type==='found'){sfx('sparkle');tell('Found it! Take it back to '+(giverById(q.giver)?.data.name||'them')+'.',4);}
      else if(ev.type==='follow'){sfx('heart');tell((ev.follower?.found?ev.follower.name+': “'+ev.follower.found+'” ':'')+(ev.follower?.name||'They')+' will follow you. Lead them back to '+(giverById(q.giver)?.data.name||'safety')+'!',5);}
      else if(ev.type==='visited'){sfx('chime');tell('Checked! Go back and tell '+(giverById(q.giver)?.data.name||'them')+'.',4);}
      else if(ev.type==='ready'){sfx('chime');tell('All done. Take it back to '+(giverById(q.giver)?.data.name||'them')+'.',4);}
      else if(ev.type==='expired'){sfx('bonk');tell('Out of time: '+(q.title||'the quest')+'. '+(giverById(q.giver)?.data.name||'They')+' has gone home for today.',6);playLog('quest',{id:q.id,expired:true});}
      else if(ev.type==='done'){pay(ev.reward??q.reward,q.title||'Quest');sfx('fanfare');tell('Quest done: '+(q.title||'')+' · '+(ev.reward??q.reward??0)+' 🪙 to collect',5);playLog('quest',{id:q.id,done:true});}}
    if(changed){celebrate(prev);save();refresh();}
    const sec=Math.floor(Date.now()/1000);if(sec!==lastSec){lastSec=sec;paintPill();}}

  const near=(x,z)=>{let best=null,bd=TALK_R;for(const g of givers){const d=Math.hypot(g.data.x-x,g.data.z-z);if(d<bd){bd=d;best=g.data;}}return best;};
  const hit=ray=>{const vis=givers.filter(g=>g.group.visible);const h=ray.intersectObjects(vis.map(g=>g.group),true)[0];if(!h)return null;return vis.find(g=>{let o=h.object;while(o){if(o===g.group)return true;o=o.parent;}return false;})?.data||null;};
  function complete(questIdOrKind){const prev=state;const q=Q.QUESTS?.find?.(x=>x.id===questIdOrKind)||Q.activeList(state,now()).find(a=>a.kind===questIdOrKind);if(!q)return null;
    const r=Q.complete(state,q.id,now());state=r?.state||r||state;if(state!==prev){pay(r?.reward??q.reward,q.title||'Quest');playLog('quest',{id:q.id,done:true});save();refresh();celebrate(prev);}return q;}
  const isActive=kind=>Q.activeList(state,now()).some(a=>a.kind===kind);
  refresh();
  return {root,update,near,hit,talk,openLog,complete,isActive,givers:()=>GIVERS,mapPins(){refresh();const list=[],active=Q.activeList(state,now())||[];
    for(const m of markers){if(m.type!=='giver'||!['offer','turnin'].includes(m.state))continue;const g=giverById(m.giverId)?.data;if(!g)continue;
      list.push({id:'qg-'+g.id,quest:true,kind:m.state,icon:m.state==='offer'?'❗':'✅',title:m.state==='offer'?g.name+' needs a hand':'Back to '+g.name,reward:m.state==='offer'?'new quest':'collect reward',how:m.state==='offer'?'Ride over and tap them to talk.':'They’re waiting to thank you.',x:g.x,z:g.z});}
    for(const a of active){const t=a.target;if(!t||t.x==null)continue;list.push({id:'qt-'+a.id,quest:true,kind:'target',icon:a.icon||'📜',px:a.px||'quest-new',title:a.title,reward:a.secondsLeft!=null?mmss(a.secondsLeft)+' left':'on the go',how:a.todo||a.progress||'',x:t.x,z:t.z});}
    return list;},get state(){return state;},
    dispose(){pill.remove();for(const k of [...live.keys()])drop(k);for(const g of givers)g.char.dispose?.();outdoors.remove(root);}};
}
