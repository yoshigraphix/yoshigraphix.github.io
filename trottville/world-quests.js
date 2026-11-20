// Side quests in the 3D world (note #26): the quest givers standing around the valley, Talk, the things you carry or
// lead home, the pickups, the 10-minute timer pill and the Quest Log button. The rules live in quests.mjs (pure,
// tested); the 200 quests and their givers in quest-content.mjs; the book and talk markup in quest-log.js.
// world.js creates this once and calls update() every frame, near()/hit() for Talk, and complete() for the corn maze.
import * as Q from './quests.mjs?v=162';
import {iconHTML,PX_NAMES,pxImage} from './pixel-icons.js?v=162';
import {GIVERS} from './quest-content.mjs?v=162';
import {openQuestLog,talkHTML,badgeToastHTML,ensureQuestLogCss} from './quest-log.js?v=162';
import {makeChibiCharacter} from './chibi-character.js?v=162';
import {lookFromSeed} from './character-looks.mjs?v=162';
import {makeSculptedHorse} from './horse-sculpt.js?v=162';
import {inWater} from './world-content.mjs?v=162';
import {LAKE} from './world-town.mjs?v=162';
import {queueCoins} from './coin-collect.js?v=162';
import {sfx,npcVoice,ambLoop} from './sfx.js?v=162';
// v132: each quest giver's wordless voice (woman / man / kid) and a small per-person pitch, so everyone sounds a bit different.
const WOMEN=new Set(['marigold','orla','ingrid','bea','dottie','sunita','jo','vi','cora','agnes','petra','ramona','flo','elsie','edda','delphine','wilma']);
function voiceOf(d){const role=d.role||'',age=/\b(\d+|seven|eight|nine|ten|eleven|twelve)[- ]?(years?|year-old)|years old|twelve and/i.test(role);
  const first=String(d.name||'').toLowerCase().split(' ').pop();let h=0;for(const c of String(d.id||d.name))h=(h*31+c.charCodeAt(0))>>>0;
  return {who:age?'kid':WOMEN.has(first)?'woman':/^[^,]*\b(boy|girl)\b/i.test(role)&&!/mum|dad|mother|father/i.test(role)?'kid':'man',rate:.92+(h%17)/100};}
// Mood from what happens: thanks/rewards = happy, a question = question, a new quest or first hello = greet, else thinking.
function moodOf(res,text){if(res.kind==='turnin'||res.kind==='receive')return 'happy';if(/\?/.test(text))return 'question';if(res.kind==='offer')return 'greet';if(res.kind==='reminder')return 'think';return /!/.test(text)?'greet':'think';}
import {log as playLog} from './play-log.js?v=162';
// Compass words for a direction on the map (map top = north = −z).
const dirWord=(dx,dz)=>['north','north-east','east','south-east','south','south-west','west','north-west'][((Math.round(Math.atan2(dx,-dz)/(Math.PI/4))%8)+8)%8];

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
    pxImage(px,im=>{g.clearRect(0,0,128,128);g.imageSmoothingEnabled=false;g.drawImage(im,4,4,120,120);t.needsUpdate=true;});return t;}
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

export function createWorldQuests({T,outdoors,groundY,prep=m=>m,tell,adventureUI,host,camera=null,storageKey='guest',onPin=()=>{},onChange=()=>{},onAccept=()=>{}}){
  ensureQuestLogCss();
  const KEY=Q.QUEST_KEY+':'+storageKey;
  let state;try{state=Q.normalizeQuests(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{state=Q.normalizeQuests(null);}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}onChange();};
  const root=new T.Group();root.name='quests';outdoors.add(root);
  const now=()=>Date.now();

  // The givers: chibi townsfolk from a seeded look (kids are smaller). Only nearby ones animate.
  // Rain (v71): everyone outdoors puts up an umbrella; shopkeepers indoors don't. Colour fixed per person.
  const UMBRELLAS=['#d0453c','#3f6fb3','#f2b632','#4f9a5a','#8a5bb3','#e07aa0','#2f8f8f','#f08a3c'];
  const givers=GIVERS.map(g=>{const look={...lookFromSeed('quest-'+(g.seed||g.id))};const kid=/kid|child|girl|boy/i.test(g.role||'');
    const c=makeChibiCharacter(T,look);c.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});const group=new T.Group();group.add(c.root);if(kid)c.root.scale.setScalar(.78);
    let h=0;for(const ch of g.id)h=(h*31+ch.charCodeAt(0))>>>0;group.rotation.y=g.look?Math.atan2(g.look.x-g.x,g.look.z-g.z):(h%628)/100;/* shopkeepers face their door */group.position.set(g.x,groundY(g.x,g.z),g.z);
    const icon=new T.Sprite(new T.SpriteMaterial({map:iconTexture(T,'!','#e8a33a','quest-new'),depthWrite:false,transparent:true}));icon.scale.setScalar(.75);icon.position.y=kid?2.05:2.5;icon.visible=false;group.add(icon);
    root.add(group);return {data:g,group,char:c,icon,kid,mark:null,yaw:group.rotation.y,umb:UMBRELLAS[h%UMBRELLAS.length]};});
  const giverById=id=>givers.find(g=>g.data.id===id);
  // v151 (Yoshi: "give them life… you have to get their attention"): some givers are busy with something at their spot
  // (bench + book, garden bed, brushing a tied horse, leaning on a fence, sweeping, fishing). They keep at it until you
  // come close (5.5 m on foot, 7 m riding), then finish, turn, wave and wait; walk away and they go back to it.
  // Everyone else fidgets (vroid-character) and turns + waves when you arrive. Rain stops the activities (umbrellas).
  const ACTS={vi:'bench',gideon:'bench',flo:'bench',petra:'garden',abe:'garden',barnaby:'garden',tilly:'brush',hank:'brush',
    ned:'fence',tobias:'fence',ollie:'fence',bart:'sweep',ferdinand:'sweep',rufus:'sweep',wendell:'fish',hal:'fish'};
  const wood=new T.MeshLambertMaterial({color:'#9a6a3c'}),dark=new T.MeshLambertMaterial({color:'#6b4526'}),soil=new T.MeshLambertMaterial({color:'#6a4a2e'}),
    leaf=new T.MeshLambertMaterial({color:'#5d9a48'}),straw=new T.MeshLambertMaterial({color:'#d9b25a'}),metal=new T.MeshLambertMaterial({color:'#8a96a0'});
  const box=(w,h,d,m,x,y,z,par)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;par.add(o);return o;};
  const cyl=(r,h,m,par)=>{const o=new T.Mesh(new T.CylinderGeometry(r,r,h,6),m);par.add(o);return o;};
  function waterYaw(g){const y0=groundY(g.x,g.z);let best=null;for(let i=0;i<24;i++){const a=i/24*Math.PI*2;for(const r of [3,5,7,9,11]){const x=g.x+Math.sin(a)*r,z=g.z+Math.cos(a)*r;
      if(inWater(x,z)||((x-LAKE.x)/LAKE.rx)**2+((z-LAKE.z)/LAKE.rz)**2<.8||z>201||groundY(x,z)<y0-.7){if(!best||r<best.r)best={a,r};break;}}}return best?best.a:null;}
  for(const g of givers){const act=ACTS[g.data.id];if(!act||g.data.indoor)continue;g.act=act;g.st='busy';g.t=0;g.waveAt=-1e9;g.wv=0;
    if(act==='fish'){const a=waterYaw(g.data);if(a!=null){g.group.rotation.y=g.yaw=a;}}
    const set=new T.Group();set.position.copy(g.group.position);set.rotation.y=g.yaw;root.add(set);g.set=set;
    if(act==='bench'){box(1.6,.08,.5,wood,0,.56,-.06,set);box(1.6,.36,.06,wood,0,.86,-.32,set);for(const x of [-.7,.7]){box(.08,.54,.42,dark,x,.27,-.08,set);box(.08,.9,.06,dark,x,.6,-.34,set);}}
    if(act==='fence'){for(const y of [.62,1.24])box(2.6,.09,.07,wood,0,y,.5,set);for(const x of [-1.25,1.25])box(.12,1.4,.12,dark,x,.7,.5,set);}
    if(act==='garden'){box(1.5,.12,.9,soil,0,.06,.82,set);for(let i=0;i<8;i++){const o=new T.Mesh(new T.ConeGeometry(.08,.26,5),leaf);o.position.set(-.55+(i%4)*.37,.24,.62+Math.floor(i/4)*.38);set.add(o);}
      const can=cyl(.12,.24,metal,set);can.position.set(.95,.12,.5);}
    if(act==='brush'){const coat=['willow','atlas','sunny'][g.data.id.length%3];const h=makeSculptedHorse(T,{id:coat,name:'tied'},{idle:true});h.setGait?.('stand');
      h.root.position.set(.15,0,1.15);h.root.rotation.y=Math.PI/2;h.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});set.add(h.root);g.horse=h;
      box(.14,1.3,.14,dark,1.75,.65,1.15,set);box(.5,.08,.08,dark,1.75,1.2,1.15,set);}
    // hand props, placed from the hands each frame
    const hp=new T.Group();root.add(hp);g.prop=hp;hp.visible=false;
    if(act==='bench'){box(.26,.04,.2,new T.MeshLambertMaterial({color:'#b8463a'}),0,0,0,hp);box(.24,.045,.18,new T.MeshLambertMaterial({color:'#f6eedc'}),0,.006,0,hp);}
    if(act==='brush'){box(.09,.05,.16,dark,0,0,0,hp);box(.08,.03,.15,straw,0,-.035,0,hp);}
    if(act==='sweep'){const h=cyl(.025,1,wood,hp);h.name='handle';const b=box(.42,.1,.12,straw,0,0,0,hp);b.name='head';}
    if(act==='fish'){const h=cyl(.018,1,dark,hp);h.name='handle';const l=new T.Mesh(new T.CylinderGeometry(.004,.004,1,3),new T.MeshBasicMaterial({color:'#e8e8e8'}));l.name='line';hp.add(l);}}
  const _a=new T.Vector3(),_b=new T.Vector3(),_m=new T.Vector3(),_u=new T.Vector3(0,1,0),_q=new T.Quaternion();
  function stretch(o,p0,p1){_m.subVectors(p1,p0);const L=_m.length();o.position.copy(p0).addScaledVector(_m,.5);o.scale.set(1,Math.max(.01,L),1);o.quaternion.setFromUnitVectors(_u,_m.normalize());}
  function placeProp(g,w,dt){const hp=g.prop;hp.visible=w>.5;if(!hp.visible)return;g.group.updateMatrixWorld(true);const H=g.char.hands;
    H[0].getWorldPosition(_a);H[1].getWorldPosition(_b);root.worldToLocal(_a);root.worldToLocal(_b);const fx=Math.sin(g.group.rotation.y),fz=Math.cos(g.group.rotation.y),gy=g.group.position.y;
    if(g.act==='bench'){hp.position.addVectors(_a,_b).multiplyScalar(.5);hp.position.x+=fx*.04;hp.position.z+=fz*.04;hp.rotation.set(-.9,g.group.rotation.y,0,'YXZ');}
    else if(g.act==='brush'){hp.position.copy(_b);hp.rotation.set(0,g.group.rotation.y,0);}
    else if(g.act==='sweep'){const top=_a.y>_b.y?_a:_b,low=top===_a?_b:_a;const end=new T.Vector3(low.x+fx*.55,gy+.06,low.z+fz*.55);
      hp.position.set(0,0,0);const d=new T.Vector3().subVectors(top,end).normalize();stretch(hp.getObjectByName('handle'),end,top.clone().addScaledVector(d,.12));
      const hd=hp.getObjectByName('head');hd.position.copy(end);hd.rotation.set(0,g.group.rotation.y,0);}
    else if(g.act==='fish'){hp.position.set(0,0,0);const tip=new T.Vector3(_b.x+fx*2.1,_b.y+1.15,_b.z+fz*2.1);stretch(hp.getObjectByName('handle'),_b.clone().addScaledVector(new T.Vector3(fx,.55,fz).normalize(),-.3),tip);
      const bob=Math.sin(performance.now()/700+g.data.x)*.04;stretch(hp.getObjectByName('line'),new T.Vector3(tip.x,gy-.35+bob,tip.z),tip);}}
  // Busy → notice (finish, turn, wave) → free (faces you) → back to work once you've been gone 4 s.
  function life(g,d,p,dt,talking){const nearR=p.mounted?7:5.5;
    if(talking){g.st='free';g.t=0;}
    else if(g.st==='busy'||g.st==='back'){if(d<nearR){g.st='notice';g.t=0;if(performance.now()-g.waveAt>9e4){g.waveAt=performance.now();g.waves=true;}else g.waves=false;}}
    else if(g.st==='notice'){g.t+=dt;if(g.t>2.6){g.st='free';g.t=0;}}
    else if(g.st==='free'){if(d>10){g.t+=dt;if(g.t>4){g.st='back';g.t=0;}}else g.t=0;}
    const lead=g.act?.6:0,busy=g.st==='busy'||(g.st==='notice'&&g.t<lead);
    const wave=g.st==='notice'&&g.waves?Math.max(0,Math.min(1,(g.t-lead-.35)*4,(lead+2.1-g.t)*4)):0;
    let want=null;if(talking)want=Math.atan2(camera.position.x-g.data.x,camera.position.z-g.data.z);
    else if((g.st==='notice'&&g.t>lead)||(g.st==='free'&&d<11))want=Math.atan2(p.x-g.data.x,p.z-g.data.z);else if(g.st==='back'||g.st==='busy')want=g.yaw;
    if(want!=null){let dy=want-g.group.rotation.y;dy=Math.atan2(Math.sin(dy),Math.cos(dy));g.group.rotation.y+=dy*Math.min(1,dt*(talking?7:4));if(g.st==='back'&&Math.abs(dy)<.05)g.st='busy';}
    return {act:busy&&g.act&&!(p.rain&&g.act!=='bench')?g.act:null,wave};}

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
    if(a){const secs=a.secondsLeft??a.left??0;html=`<span aria-hidden="true">${iconHTML(a.icon||'📜',a.px||'quest-new')}</span><b>${esc(a.title)}</b><small>${esc(typeof a.progress==='object'&&a.progress?a.progress.have+'/'+a.progress.need:a.progress||'')}</small><time class="${secs<60?'wq-hurry':''}">${a.secondsLeft==null?'':mmss(secs)}</time>${list.length>1?`<i>+${list.length-1}</i>`:''}`;}
    if(html!==lastPill){nowBtn.innerHTML=html;nowBtn.hidden=!a;lastPill=html;}}

  function pay(reward,title){if(!(reward>0))return;queueCoins({from:'Quest · '+title,coins:reward,lines:[title+' · '+reward+' 🪙']});sfx('coin');}
  function celebrate(prev){const fresh=Q.newBadges(prev,state)||[];for(const b of fresh){sfx('fanfare');const t=document.createElement('div');t.className='wq-badge';t.innerHTML=badgeToastHTML(b);host.append(t);t.addEventListener('animationend',()=>t.remove());playLog('badge',{id:b.id});}}

  // Talk: what this giver says now (offer, reminder, turn-in, delivery for them, gone home, needs a horse).
  // Talking is a close-up scene, not a pop-up: the camera moves in on the speaker (world.js reads talkView()), they talk
  // (mouth, hands, weight shifts) while their words type out in a speech bubble drawn above their head; the quest card
  // and buttons appear in the same bubble once they finish. Tap the bubble to skip ahead. Walking away ends it.
  let scene=null;
  function endTalk(){if(!scene)return;scene.el.remove();scene.g.icon.visible=scene.iconWas;scene=null;}
  function talk(id,ctx){const g=giverById(id);if(!g)return;
    if(scene?.g===g&&scene.typing){scene.shown=1e9;return;}
    endTalk();const prev=state,res=Q.talk(state,id,now(),ctx);state=res.state||state;
    if(res.kind==='turnin'||res.kind==='receive'){pay(res.reward??res.quest?.reward,res.quest?.title||'Quest');sfx('chime');playLog('quest',{id:res.quest?.id,done:true});celebrate(prev);}
    save();refresh();sfx('pop');
    {const v=voiceOf(g.data);npcVoice(v.who,moodOf(res,(res.lines||[]).join(' ')+' '+(res.text||'')),{rate:v.rate,delay:.15});}
    const el=document.createElement('div');el.className='ql-say is-typing';el.setAttribute('role','dialog');el.setAttribute('aria-label',g.data.name+' says');
    el.innerHTML=`<p class="ql-say-who">${g.data.name.replace(/[<&>"]/g,'')}</p>`+talkHTML(res,g.data)+'<button type="button" class="ql-say-x" aria-label="Done talking">×</button>';
    const paras=[...el.querySelectorAll('.ql-bubble p')].filter(p=>!p.classList.contains('ql-who')),texts=paras.map(p=>p.textContent);paras.forEach(p=>p.textContent='');
    el.querySelector('.ql-bubble .ql-who, .ql-bubble > b, .ql-bubble > strong')?.remove();
    // v108 (Yoshi: “told to look near the apple orchard but I didn't know where that was”): every quest bubble says
    // where the place is from here (name, distance, direction), and once you say yes the compass at the top points there.
    {const q=res.quest&&Q.getQuest(res.quest.id),r=q&&state.run[q.id],t=q&&Q.targetOf(q,r);
      if(t&&res.kind!=='turnin'&&res.kind!=='receive'&&Math.hypot(t.x-g.data.x,t.z-g.data.z)>12){const w=document.createElement('p');w.className='ql-where';
        w.innerHTML=`<span aria-hidden="true">📍</span> ${esc(t.label||'There')} · ${Math.round(Math.hypot(t.x-ctx.x,t.z-ctx.z))} m ${dirWord(t.x-ctx.x,t.z-ctx.z)}`+(res.kind==='offer'?'<small>Say yes and the arrow at the top shows the way.</small>':'');
        (el.querySelector('.ql-actions')||el).before(w);}}
    host.appendChild(el);
    scene={g,el,ctx,paras,texts,total:texts.reduce((n,t)=>n+t.length,0),shown:0,t0:performance.now(),typing:true,iconWas:g.icon.visible,px:ctx.x,pz:ctx.z};g.icon.visible=false;
    el.addEventListener('pointerdown',e=>e.stopPropagation());
    el.addEventListener('click',e=>{if(scene?.el===el&&scene.typing&&!e.target.closest('button'))scene.shown=1e9;});
    el.querySelector('.ql-say-x').onclick=endTalk;
    el.querySelectorAll('[data-quest-action]').forEach(b=>b.onclick=()=>{const act=b.dataset.questAction;
      if(act==='accept'){const before=state;const r=Q.accept(state,b.dataset.quest,now(),ctx);state=r?.state||before;if(r&&r.ok===false){endTalk();tell({full:'You already have 3 quests on the go. Finish one first!','needs-horse':'You’ll need your horse for this one.',gone:'They’ve gone home for today.',tomorrow:'See them again tomorrow.'}[r.reason]||'Not right now.',4);return;}save();refresh();sfx('buckle');playLog('quest',{id:b.dataset.quest,accepted:true});
        const a=Q.activeList(state,now()).find(x=>x.id===b.dataset.quest);onAccept(a);tell([a?.title||'Quest',a?.todo,mmss(a?.secondsLeft||600)+' to go','follow the arrow at the top'].filter(Boolean).join(' · '),6);}
      endTalk();});
    g.group.rotation.y=Math.atan2(ctx.x-g.data.x,ctx.z-g.data.z);}
  // Types the words out (about 34 letters a second) and keeps the bubble pinned above the speaker's head on screen.
  const _v=new T.Vector3();
  function stepTalk(dt,p){if(!scene)return;const s=scene;s.px=p.x;s.pz=p.z;
    if(Math.hypot(p.x-s.g.data.x,p.z-s.g.data.z)>7||p.area!=='outdoor'){endTalk();return;}
    if(s.typing){s.shown=Math.max(s.shown,(performance.now()-s.t0)/1000*34);let left=Math.floor(s.shown);s.paras.forEach((el,i)=>{const t=s.texts[i],n=Math.max(0,Math.min(t.length,left));if(el.textContent.length!==n)el.textContent=t.slice(0,n);left-=t.length;});
      if(s.shown>=s.total){s.typing=false;s.el.classList.remove('is-typing');s.el.querySelector('.ql-btn.is-main')?.focus({preventScroll:true});}}
    if(!camera)return;const sc=s.g.kid?.78:1;_v.set(s.g.data.x,s.g.group.position.y+2.2*sc,s.g.data.z).project(camera);
    const W=host.clientWidth,H=host.clientHeight,bw=s.el.offsetWidth,bh=s.el.offsetHeight;let x=(_v.x*.5+.5)*W,y=(-_v.y*.5+.5)*H;
    const left=Math.max(8,Math.min(W-bw-8,x-bw/2)),top=Math.max(8,Math.min(H-bh-8,y-bh-14));s.el.style.transform=`translate(${left|0}px,${top|0}px)`;s.el.style.setProperty('--tail',Math.max(22,Math.min(bw-22,x-left))+'px');
    s.el.classList.toggle('no-tail',y-bh-14<8);}
  // The talk camera (v109, Yoshi: “over the shoulder of the horse, behind the back of the rider, looking down at the NPC,
  // like most games”): it sits behind you and a little to one side, above your head (higher when you ride), and looks
  // down past your shoulder at the speaker. me = {x,z,y: your ground height, mounted, scale: your horse's size}.
  // The shoulder side is the one with fewer horses in the way; it is kept for the whole chat.
  const _f=new T.Vector3(),_d=new T.Vector3(),_side=new T.Vector3();
  function talkView(blockers=[],me=null){if(!scene)return null;const g=scene.g,sc=g.kid?.78:1;_f.set(g.data.x,g.group.position.y+1.95*sc,g.data.z);
    const px=me?.x??scene.px,pz=me?.z??scene.pz,py=me?.y??g.group.position.y,mounted=!!me?.mounted,hs=me?.scale||1;
    _d.set(g.data.x-px,0,g.data.z-pz);if(_d.lengthSq()<1e-4)_d.set(-Math.sin(g.group.rotation.y),0,-Math.cos(g.group.rotation.y));_d.normalize();
    const tall=(host.clientHeight||1)>(host.clientWidth||1),back=mounted?2.8+1.3*hs:(tall?2.7:2.2),shoulder=mounted?1.7:.75,up=mounted?2.9+2.1*hs:(tall?3.0:2.6);
    if(scene.side==null){let best=-1e9,bs=1;for(const sd of [1,-1]){const cx=px-_d.x*back+_d.z*shoulder*sd,cz=pz-_d.z*back-_d.x*shoulder*sd;let clear=9;
        for(const o of blockers){const r=o.r||1,vx=_f.x-cx,vz=_f.z-cz,L=vx*vx+vz*vz||1,t=Math.max(0,Math.min(1,((o.x-cx)*vx+(o.z-cz)*vz)/L)),dd=Math.hypot(cx+vx*t-o.x,cz+vz*t-o.z)-r;clear=Math.min(clear,dd);}
        if(clear>best+.05){best=clear;bs=sd;}}scene.side=bs;}
    _side.set(_d.z,0,-_d.x).multiplyScalar(scene.side);
    const pos=new T.Vector3(px,py+up,pz).addScaledVector(_d,-back).addScaledVector(_side,shoulder);
    // Aim at the speaker's chest, nudged away from your shoulder so you frame one side and they stand clear of you.
    // On a phone the bubble fills the top half, so aim above their head: they stand in the lower half, under it.
    const look=new T.Vector3(g.data.x,g.group.position.y+(mounted?(tall?3.0:1.9):(tall?2.35:1.6))*sc,g.data.z).addScaledVector(_side,mounted?.6:.3);
    return {pos,look,face:_f.clone()};}

  let logH=null;const closeLog=()=>{logH?.close();logH=null;};
  // The most urgent active quest's goal (for the compass): {x,z,label}.
  function activeTarget(){return (Q.activeList(state,now())||[])[0]?.target||null;}
  function openLog(){closeLog();logH=openQuestLog({host,state,now:now(),onPin:id=>{const a=Q.activeList(state,now()).find(x=>x.id===id);if(a){closeLog();onPin(a);}},onClose:()=>{logH=null;}});}

  let acc=0,lastSec=-1,npcSteps=false;const nudged=new Map();
  function update(dt,p){stepTalk(dt,p);root.visible=p.area==='outdoor';if(!root.visible){if(npcSteps){npcSteps=false;ambLoop('npcSteps',null);}return;}
    // Riding past someone who needs you: one gentle nudge (not again for 2 minutes).
    {const g=near(p.x,p.z),s=g&&giverMarks.get(g.id);if(g&&(s==='offer'||s==='turnin'||s==='receive')&&performance.now()-(nudged.get(g.id)||-1e9)>12e4){nudged.set(g.id,performance.now());tell(g.name+(s==='offer'?' wants a word':' is waiting for you')+' · tap them or press Interact',4);}}
    // Givers: face you when you're close, idle otherwise; far ones are hidden.
    for(const g of givers){const d=Math.hypot(g.data.x-p.x,g.data.z-p.z);g.group.visible=d<SHOW_R;if(g.set)g.set.visible=g.group.visible;if(g.st==null){g.st='busy';g.t=0;g.waveAt=-1e9;}
      if(d<ANIM_R){const talking=!!(scene?.g===g&&camera),L=life(g,d,p,dt,talking);const umb=!!p.rain&&!g.data.indoor;
        g.char.update(dt,{pose:'stand',talk:scene?.g===g?(scene.typing?1:.3):0,act:L.act,wave:umb?0:L.wave});g.char.setGear?.({umbrella:umb,color:g.umb});
        if(g.prop)placeProp(g,g.char.actState?.().w||0,dt);if(g.horse)g.horse.update(dt);
      // v107: while talking they face the camera (Yoshi: “talking to the camera”), otherwise they turn to you when close.
      if(g.icon.visible)g.icon.position.y=(g.kid?2.05:2.5)+(p.rain&&!g.data.indoor?.6:0)+Math.sin(performance.now()/380+g.data.x)*.08;}}
    // Pickups bob; hidden ones (lost things) only show within 10 m; followers trail you once found.
    const t=performance.now()/1000;let walking=false;
    for(const e of live.values()){const m=e.m;
      if(m.type==='pickup'){e.g.visible=!m.hidden||Math.hypot(m.x-p.x,m.z-p.z)<10;const s=e.g.userData.bob;if(s){s.position.y=1.1+Math.sin(t*2.2+m.x)*.15;}}
      else if(m.type==='follower'){const following=m.following||m.found||e.following;
        if(following){e.following=true;e.trail.push({x:p.x,z:p.z});if(e.trail.length>400)e.trail.shift();
          const pos=e.g.position;let goal=null;for(let i=e.trail.length-1;i>=0;i--){const q=e.trail[i];if(Math.hypot(q.x-p.x,q.z-p.z)>2.4){goal=q;break;}}
          if(goal){const dx=goal.x-pos.x,dz=goal.z-pos.z,dist=Math.hypot(dx,dz);if(dist>.05){const sp=Math.min(dist*3,(p.speed||4)+1.5,11);pos.x+=dx/dist*sp*dt;pos.z+=dz/dist*sp*dt;e.g.rotation.y=Math.atan2(dx,dz);}
            if(dist>18){pos.x=goal.x;pos.z=goal.z;}}
          pos.y=groundY(pos.x,pos.z);const moving=goal&&Math.hypot(goal.x-pos.x,goal.z-pos.z)>.3;
          e.g.userData.char?.update(dt,{pose:moving?'walk':'stand',speed:moving?3:0});if(moving&&e.g.userData.char&&!e.g.userData.critter)walking=true;if(e.g.userData.critter)e.g.userData.critter.position.y=moving?Math.abs(Math.sin(t*12))*.12:0;}
        else{e.g.userData.char?.update(dt,{pose:'stand'});if(e.g.userData.critter)e.g.userData.critter.rotation.y=Math.sin(t*.7+m.x)*.6;}}}
    // v135: a person following you (not a pet) has soft footsteps of their own while they walk.
    if(walking!==npcSteps||walking){npcSteps=walking;ambLoop('npcSteps',walking?'stepGrass':null,.3,1.08);}
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
  // v107 (Yoshi: “make it easier to chat with them”): a tap anywhere near a person on screen counts, not only a tap
  // right on their thin body. Measures the tap's distance to the line from their feet to their head, in screen pixels.
  const _pa=new T.Vector3(),_pb=new T.Vector3();
  function pick(cx,cy,rect,maxD=45){if(!camera)return null;let best=null,bd=1e9;
    for(const g of givers){if(!g.group.visible)continue;const q=g.group.position,sc=g.kid?.78:1;if(Math.hypot(q.x-camera.position.x,q.z-camera.position.z)>maxD)continue;
      _pa.set(q.x,q.y+.15*sc,q.z).project(camera);_pb.set(q.x,q.y+1.95*sc,q.z).project(camera);if(_pa.z>1||_pb.z>1)continue;
      const ax=rect.left+(_pa.x+1)/2*rect.width,ay=rect.top+(1-_pa.y)/2*rect.height,bx=rect.left+(_pb.x+1)/2*rect.width,by=rect.top+(1-_pb.y)/2*rect.height;
      const L=Math.hypot(bx-ax,by-ay)||1,t=Math.max(0,Math.min(1,((cx-ax)*(bx-ax)+(cy-ay)*(by-ay))/(L*L))),dist=Math.hypot(cx-ax-(bx-ax)*t,cy-ay-(by-ay)*t),lim=Math.max(46,L*.5);
      if(dist<lim&&dist/lim<bd){bd=dist/lim;best=g.data;}}
    return best;}
  const hit=ray=>{const vis=givers.filter(g=>g.group.visible);const h=ray.intersectObjects(vis.map(g=>g.group),true)[0];if(!h)return null;return vis.find(g=>{let o=h.object;while(o){if(o===g.group)return true;o=o.parent;}return false;})?.data||null;};
  function complete(questIdOrKind){const prev=state;const q=Q.QUESTS?.find?.(x=>x.id===questIdOrKind)||Q.activeList(state,now()).find(a=>a.kind===questIdOrKind);if(!q)return null;
    const r=Q.complete(state,q.id,now());state=r?.state||r||state;if(state!==prev){pay(r?.reward??q.reward,q.title||'Quest');playLog('quest',{id:q.id,done:true});save();refresh();celebrate(prev);}return q;}
  const isActive=kind=>Q.activeList(state,now()).some(a=>a.kind===kind);
  refresh();
  return {root,update,near,hit,pick,life:()=>givers.filter(g=>g.group.visible).map(g=>({id:g.data.id,st:g.st,act:g.act||null,w:+(g.char.actState?.().w||0).toFixed(2),x:+g.data.x.toFixed(1),z:+g.data.z.toFixed(1),y:+g.group.position.y.toFixed(1),yaw:+g.yaw.toFixed(2)})),closeLog,activeTarget,talk,talkView,endTalk,isTalking:()=>!!scene,openLog,complete,isActive,givers:()=>GIVERS,mapPins(){refresh();const list=[],active=Q.activeList(state,now())||[];
    for(const m of markers){if(m.type!=='giver'||!['offer','turnin'].includes(m.state))continue;const g=giverById(m.giverId)?.data;if(!g)continue;
      list.push({id:'qg-'+g.id,quest:true,kind:m.state,icon:m.state==='offer'?'❗':'✅',title:m.state==='offer'?g.name+' needs a hand':'Back to '+g.name,reward:m.state==='offer'?'new quest':'collect reward',how:m.state==='offer'?'Ride over and tap them to talk.':'They’re waiting to thank you.',x:g.x,z:g.z});}
    for(const a of active){const t=a.target;if(!t||t.x==null)continue;list.push({id:'qt-'+a.id,quest:true,kind:'target',icon:a.icon||'📜',px:a.px||'quest-new',title:a.title,reward:a.secondsLeft!=null?mmss(a.secondsLeft)+' left':'on the go',how:a.todo||a.progress||'',x:t.x,z:t.z});}
    return list;},get state(){return state;},
    dispose(){endTalk();pill.remove();for(const k of [...live.keys()])drop(k);for(const g of givers)g.char.dispose?.();outdoors.remove(root);}};
}
