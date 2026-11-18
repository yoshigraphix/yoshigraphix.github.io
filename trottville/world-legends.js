// The valley's legends in 3D (note #19; rules in legends.mjs): the garden bed by the stable, the rainbow that
// touches down after rain, the moonlit unicorn, the stargazing sheet and the pegasus that flies down on a 200.
import {makeSculptedHorse} from './horse-sculpt.js?v=157';
import {weatherAt,weatherSpellsAgo,gameHours} from './world-weather.mjs?v=157';
import * as L from './legends.mjs?v=157';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WET=new Set(['rain','storm']),FALL=new Set(['rain','storm','snow']);// v139: snow clearing brings a rainbow too (winter had none)

// Did it rain in the last few spells, and is it dry and light now? Then a rainbow has come down somewhere.
export function rainbowNow(d=new Date()){const h=gameHours(d);if(h<7||h>=19)return false;const now=weatherAt(d);if(WET.has(now)||now==='snow'||now==='fog')return false;
  for(let n=1;n<=3;n++)if(FALL.has(weatherSpellsAgo(d,n)))return true;return false;}   // rained in the last 12 minutes

export function createLegends({T,outdoors,stage,groundHeight,tell,sfx,addHorse,ranchFood,useFood,supplies,useSupply,salt='',bestTrust=null}){
  // v124 (note #47): legendaries stay very rare. They only come to a rider who owns a horse at 100% trust; the free
  // starter tops out at 99%, so it takes a horse from the market (an account) and weeks of care. Nothing is used up.
  function legendGate(icon){const b=bestTrust?.();if(!bestTrust||b&&b.t>=100)return true;
    card(`<h3>${icon} It won’t come any closer</h3><p>Legendary horses only trust a rider whose horse trusts them completely. You need a horse at <b>100% trust</b>${b?`: your best is ${esc(b.name)} at ${b.t}%`:''}.</p><p style="font-size:12px;color:#6d5d45">Your free horse can reach 99%. A horse from the Hoofhaven market can reach 100% with weeks of care. Keep your carrot: it will wait for you.</p>`);return false;}
  let l=L.loadLegends();const save=()=>L.saveLegends(l);
  const group=new T.Group();outdoors.add(group);const mats=[],geos=[];
  const M=(c,o={})=>{const m=new T.MeshStandardMaterial({color:c,roughness:.8,flatShading:true,...o});mats.push(m);return m;},G=g=>{geos.push(g);return g;};
  const box=G(new T.BoxGeometry(1,1,1)),ball=G(new T.SphereGeometry(1,10,8)),cone=G(new T.ConeGeometry(1,1,7));
  const put=(p,geo,mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;};
  const obstacles=[];

  // ---- Garden bed: a little raised plank box by the stable yard, with a watering can and a plant that grows ----
  const bed=new T.Group();bed.position.set(L.GARDEN.x,groundHeight(L.GARDEN.x,L.GARDEN.z),L.GARDEN.z);bed.rotation.y=.3;group.add(bed);
  const plank=M('#9a7048'),soil=M('#5d4330'),leaf=M('#5f9e45'),leafD=M('#3f7a32'),zuc=M('#3e7d3a',{roughness:.5}),flower=M('#f2c43c');
  for(const [x,z,sx,sz] of [[0,-.65,2.2,.12],[0,.65,2.2,.12],[-1.05,0,.12,1.4],[1.05,0,.12,1.4]])put(bed,box,plank,x,.22,z,sx,.44,sz);
  put(bed,box,soil,0,.3,0,2,.2,1.2);
  const plant=new T.Group();plant.position.set(0,.4,0);bed.add(plant);
  const leaves=[];for(let i=0;i<6;i++){const a=i/6*Math.PI*2,lf=put(plant,ball,i%2?leaf:leafD,Math.cos(a)*.35,.18,Math.sin(a)*.35,.32,.06,.22);lf.rotation.y=-a;leaves.push(lf);}
  const bloom=put(plant,cone,flower,0,.42,0,.12,.18,.12),fruit=put(plant,ball,zuc,.25,.12,.1,.5,.13,.13);fruit.rotation.y=.6;
  const can=new T.Group();can.position.set(1.4,0,.5);bed.add(can);put(can,box,M('#6f8fa6',{metalness:.3}),0,.22,0,.32,.44,.32);const spout=put(can,box,M('#6f8fa6',{metalness:.3}),.28,.34,0,.42,.06,.06);spout.rotation.z=.6;
  const seedSign=put(bed,box,M('#f4e7c6'),-1.25,.55,-.75,.04,.5,.36);
  obstacles.push({kind:'box',x:L.GARDEN.x,z:L.GARDEN.z,hx:1.15,hz:.75,height:.5});
  function paintGarden(){const st=L.gardenState(l);const grow=st.id==='empty'||st.id==='seed'?0:st.id==='ripe'?1:Math.max(.15,(st.streak||0)/L.ZUCCHINI_DAYS);
    plant.visible=grow>0;plant.scale.setScalar(.35+.65*grow);bloom.visible=grow>=.5&&st.id!=='ripe';fruit.visible=st.id==='ripe';seedSign.visible=st.id!=='empty';}
  paintGarden();

  // ---- Glow + sparkles (shared by the rainbow's end, the unicorn and the pegasus) ----
  const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,240,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;})();
  function sparkles(color,n=26){const g=new T.Group(),m=new T.SpriteMaterial({map:glowTex,color,transparent:true,depthWrite:false,blending:T.AdditiveBlending});mats.push(m);
    const ps=Array.from({length:n},(_,i)=>{const s=new T.Sprite(m);s.userData={a:Math.random()*6.3,r:.6+Math.random()*1.8,v:.4+Math.random()*.8,h:Math.random()*3};g.add(s);return s;});
    const halo=new T.Sprite(new T.SpriteMaterial({map:glowTex,color,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.55}));mats.push(halo.material);halo.scale.setScalar(6);halo.position.y=1.8;g.add(halo);
    g.userData.tick=(dt,t)=>{for(const s of ps){const u=s.userData;u.h=(u.h+dt*u.v)%3.2;s.position.set(Math.cos(u.a+t*.5)*u.r,u.h,Math.sin(u.a+t*.5)*u.r);s.scale.setScalar(.25*(1-u.h/3.2)+.05);}halo.material.opacity=.4+.15*Math.sin(t*2);};return g;}

  // ---- Rainbow: a big arc that ends at a sparkling patch of dug-up-able earth ----
  const rainbow=new T.Group();rainbow.visible=false;group.add(rainbow);
  {const cols=['#ff5b5b','#ffa94d','#ffe066','#69db7c','#4dabf7','#9775fa'];
    cols.forEach((c,i)=>{const m=new T.MeshBasicMaterial({color:c,transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false,fog:false});mats.push(m);
      const arc=new T.Mesh(G(new T.TorusGeometry(40-i*1.3,.65,6,64,Math.PI)),m);arc.position.set(-40,0,0);rainbow.add(arc);});
    const dig=sparkles('#fff4c2',18);rainbow.add(dig);rainbow.userData.dig=dig;put(rainbow,G(new T.CylinderGeometry(.9,1.1,.12,10)),M('#7a5a3c'),0,.05,0,1,1,1);}

  // ---- The legend horses (built when needed) ----
  const legends={unicorn:null,pegasus:null};
  function makeLegend(kind,seed){const h=L.legendHorse(kind,seed);const model=makeSculptedHorse(T,h,{});model.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});
    const fx=sparkles(kind==='unicorn'?'#f3e1ff':'#d8f0ff');model.root.add(fx);group.add(model.root);
    return {kind,seed,data:h,model,fx,state:'idle',t:0,x:0,z:0,y:0,yaw:0};}
  function drop(kind){const e=legends[kind];if(!e)return;e.model.root.removeFromParent();e.model.dispose();legends[kind]=null;}
  function bolt(e,why){if(e.state==='bolt'||e.state==='gone')return;e.state='bolt';e.t=0;e.model.setGait('gallop');sfx('whoosh',{vol:.6});tell(why,5);
    if(e.kind==='unicorn')l.unicorn={night:L.nightKey(),gone:true};else l.pegasus={...l.pegasus,gone:true};save();}

  // ---- Stargazing sheet (in-app). Constellations sit in different places every night: find Pegasus. ----
  let sheet=null;
  const SHAPES={plough:{name:'The Plough',pts:[[0,0],[16,4],[30,6],[42,12],[46,28],[64,30],[66,14]],lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]]},
    horseshoe:{name:'The Horseshoe',pts:[[0,30],[2,14],[12,3],[26,0],[40,3],[50,14],[52,30]],lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]},
    foal:{name:'Little Foal',pts:[[0,10],[12,0],[22,8],[34,8],[40,22],[24,24],[30,36],[44,36]],lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,2],[4,7],[5,6]]},
    pegasus:{name:'Pegasus',pts:[[20,20],[50,18],[52,46],[22,48],[6,8],[-8,0],[64,8],[78,-2],[60,58],[70,70]],lines:[[0,1],[1,2],[2,3],[3,0],[0,4],[4,5],[1,6],[6,7],[2,8],[8,9]]}};
  function css(){if(document.getElementById('lg-css'))return;const s=document.createElement('style');s.id='lg-css';s.textContent=`
.lg{position:absolute;inset:0;z-index:30;background:radial-gradient(120% 90% at 50% 100%,#1b2a52,#060a18 70%);color:#eef;display:flex;flex-direction:column;font:600 14px/1.4 system-ui,sans-serif}
.lg svg{flex:1;width:100%;touch-action:manipulation}.lg-bar{display:flex;align-items:center;gap:10px;padding:12px 14px;padding-bottom:max(12px,env(safe-area-inset-bottom))}
.lg-bar p{flex:1;margin:0;color:#e3e9ff}.lg-bar p b{color:#ffe9a8}.lg-c rect{stroke:none;fill:transparent}.lg circle{stroke:none}.lg-c line{stroke-linecap:round}.lg-bar button,.lg-x{min-width:48px;height:48px;border:0;border-radius:24px;background:#ffffff1f;color:#fff;font:700 15px system-ui;padding:0 16px;cursor:pointer}
.lg-bar button:active,.lg-x:active{background:#ffffff38}.lg-x{position:absolute;top:max(12px,env(safe-area-inset-top));right:12px;padding:0;font-size:22px}
.lg-c{cursor:pointer}.lg-c line{stroke:#9fb6ff;stroke-width:1.2;opacity:0;transition:opacity .3s}.lg-c.seen line{opacity:.8}.lg-c text{fill:#cfe0ff;font-size:9px;opacity:0}.lg-c.seen text{opacity:1}
.lg-die{font:800 46px system-ui;text-align:center;letter-spacing:1px;margin:0;padding:8px 0;color:#ffe9a8;text-shadow:0 0 18px #ffd56a88}
.lg-card{position:absolute;inset:0;z-index:31;display:flex;align-items:flex-end;justify-content:center;background:#0006;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom))}
.lg-card>div{width:min(360px,100%);background:#fffaf0;color:#3b2f1e;border-radius:22px;padding:16px;font:600 14px/1.4 system-ui,sans-serif;position:relative}
.lg-card h3{margin:0 0 8px;font-size:18px;color:#3b2f1e}.lg-card p{color:#5c4d36;margin:0 0 10px}.lg-card .ok:hover{background:#2a6590}.lg-parts{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:10px 0}.lg-parts span{display:flex;flex-direction:column;align-items:center;font-size:11px;padding:6px 2px;border-radius:12px;background:#f1e6cf}
.lg-parts span b{font-size:22px}.lg-parts span.no{opacity:.4}.lg-card .ok{width:100%;min-height:48px;border:0;border-radius:16px;background:#2f6f9e;color:#fff;font:700 15px system-ui;cursor:pointer}
`;document.head.append(s);}
  function closeSheet(){sheet?.remove();sheet=null;}
  function stargaze(){closeSheet();css();const night=L.nightKey(),r=(()=>{let h=2166136261;for(const c of night)h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>((h=Math.imul(h^(h>>>15),2246822507)^Math.imul(h^(h>>>13),3266489909))>>>0)/4294967296;})();
    const slots=[[30,40],[200,30],[40,200],[210,190],[120,110]].sort(()=>r()-.5),keys=Object.keys(SHAPES);
    let svg='';for(let i=0;i<180;i++)svg+=`<circle cx="${(r()*360).toFixed(1)}" cy="${(r()*320).toFixed(1)}" r="${(r()*.9+.2).toFixed(2)}" fill="#fff" opacity="${(r()*.6+.2).toFixed(2)}"/>`;
    keys.forEach((k,i)=>{const s=SHAPES[k],[ox,oy]=slots[i],rot=(r()-.5)*.9,cx=Math.cos(rot),sx=Math.sin(rot),P=s.pts.map(([x,y])=>[ox+x*cx-y*sx,oy+x*sx+y*cx]);
      svg+=`<g class="lg-c" data-c="${k}"><rect x="${Math.min(...P.map(p=>p[0]))-12}" y="${Math.min(...P.map(p=>p[1]))-12}" width="${Math.max(...P.map(p=>p[0]))-Math.min(...P.map(p=>p[0]))+24}" height="${Math.max(...P.map(p=>p[1]))-Math.min(...P.map(p=>p[1]))+24}" fill="transparent"/>`+
        s.lines.map(([a,b])=>`<line x1="${P[a][0].toFixed(1)}" y1="${P[a][1].toFixed(1)}" x2="${P[b][0].toFixed(1)}" y2="${P[b][1].toFixed(1)}"/>`).join('')+
        P.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.1" fill="#fffbe8"/>`).join('')+`<text x="${P[0][0].toFixed(1)}" y="${(Math.max(...P.map(p=>p[1]))+14).toFixed(1)}">${esc(s.name)}</text></g>`;});
    const done=l.stars.night===night;
    sheet=document.createElement('div');sheet.className='lg';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Stargazing');
    sheet.innerHTML=`<button type="button" class="lg-x" aria-label="Stop stargazing">×</button><svg viewBox="0 0 360 320" preserveAspectRatio="xMidYMid meet">${svg}</svg><div class="lg-bar"><span aria-hidden="true" style="font-size:24px">✨</span><p>${done?`You wished on Pegasus tonight (rolled ${l.stars.roll}). The stars move again tomorrow night.`:'Find <b>Pegasus</b>, the winged horse, and make a wish. Tap a star pattern.'}</p></div>`;
    stage.append(sheet);
    sheet.addEventListener('click',e=>{if(e.target.closest('.lg-x')){closeSheet();return;}const g=e.target.closest('.lg-c');if(!g)return;g.classList.add('seen');sfx('sparkle',{vol:.4});
      if(g.dataset.c!=='pegasus'){sheet.querySelector('.lg-bar p').textContent=SHAPES[g.dataset.c].name+'. Lovely, but no wings. Keep looking.';return;}
      if(l.stars.night===night){sheet.querySelector('.lg-bar p').textContent=`Pegasus! You already wished tonight (rolled ${l.stars.roll}). Try again tomorrow night.`;return;}
      wish(night);});}
  function wish(night){const roll=L.starRoll(night,salt);l.stars={night,roll};if(L.pegasusHit(roll))l.pegasus={night,gone:false,landed:false};save();const bar=sheet.querySelector('.lg-bar');
    bar.innerHTML='<p class="lg-die" aria-live="polite">d200</p>';const die=bar.querySelector('.lg-die');let spins=0;
    const spin=()=>{if(!sheet)return;spins++;if(spins<42){die.textContent=1+Math.floor(Math.random()*L.PEGASUS_DIE);if(spins%3===0)sfx('tap',{vol:.25});requestAnimationFrame(spin);return;}
      die.textContent=roll;const hit=L.pegasusHit(roll);
      bar.insertAdjacentHTML('beforeend',`<p style="text-align:center;margin:0">${hit?'A 200! A star is falling… it’s coming down to you!':`You rolled ${roll}. Pegasus needs a 200. Try again tomorrow night.`}</p><button type="button" data-lg="close">${hit?'Look!':'OK'}</button>`);
      sfx(hit?'fanfare':'chime',{vol:.6});
      bar.querySelector('[data-lg=close]').onclick=()=>closeSheet();};
    requestAnimationFrame(spin);}
  function card(html,onOk){closeSheet();css();sheet=document.createElement('div');sheet.className='lg-card';sheet.innerHTML=`<div>${html}<button type="button" class="ok">OK</button></div>`;stage.append(sheet);
    sheet.addEventListener('click',e=>{if(e.target===sheet||e.target.closest('.ok')){closeSheet();onOk?.();}});}
  const partsHTML=parts=>`<div class="lg-parts">${parts.map(p=>`<span class="${p.have?'':'no'}" title="${esc(p.name+': '+p.where)}"><b aria-hidden="true">${p.icon}</b>${p.have?'✓':esc(p.name)}</span>`).join('')}</div>`;

  let clock=0,lastPrompt=null;
  const near=(e,ctx,r)=>e&&e.state!=='gone'&&Math.hypot(e.x-ctx.x,e.z-ctx.z)<r;
  const today=()=>L.dayKey();
  function rainbowOn(){return !!(l.rainbowEnd&&l.rainbowEnd.day===today()&&!l.rainbowEnd.dug);}

  return {obstacles,
    // What the Interact button should say here (null = not ours).
    prompt(ctx){if(ctx.area!=='outdoor')return null;const u=legends.unicorn,p=legends.pegasus;
      if(near(u,ctx,4.5)&&u.state==='idle')return ctx.mounted?'Hop off first':l.rainbow>0?'Feed rainbow carrot':'Say hello';
      if(near(p,ctx,5)&&p.state==='landed')return ctx.mounted?'Hop off first':'Offer the salad';
      if(rainbowOn()&&Math.hypot(l.rainbowEnd.x-ctx.x,l.rainbowEnd.z-ctx.z)<3.5)return ctx.mounted?'Hop off to dig':'Dig at the rainbow’s end';
      if(Math.hypot(L.GARDEN.x-ctx.x,L.GARDEN.z-ctx.z)<3){const st=L.gardenState(l);return {empty:'Garden bed',seed:'Plant the seed',ripe:'Pick the zucchini',watered:'Garden bed',thirsty:'Water the zucchini'}[st.id];}
      return null;},
    stargazePrompt(ctx){return ctx.area==='outdoor'&&ctx.night>.6&&!['rain','storm','snow','blizzard'].includes(ctx.kind)?'Look at the stars':null;},// no stars through rain clouds
    interact(ctx){if(ctx.area!=='outdoor')return false;const u=legends.unicorn,p=legends.pegasus;
      if(near(u,ctx,4.5)&&u.state==='idle'){
        if(ctx.mounted){bolt(u,'The unicorn startled at the sight of a rider and vanished into the moonlight.');return true;}
        if(l.rainbow>0&&!legendGate('🦄'))return true;
        if(l.rainbow>0){l.rainbow--;l.unicorn={night:L.nightKey(),gone:true};const h=u.data;l.caught.push({kind:'unicorn',id:h.id,at:Date.now()});save();addHorse(h);
          u.state='caught';u.t=0;sfx('fanfare',{vol:.7});card(`<h3>🦄 ${esc(h.name)} is yours!</h3><p>The unicorn crunched the rainbow carrot and nuzzled your hand. A ${esc(h.breed)} unicorn, still a little wild: pet, brush and feed ${esc(h.name)} at home to tame them.</p>`);}
        else tell('The unicorn sniffs your empty hand and waits. Only a rainbow carrot will win it over. Rainbows come down after rain or snow clears.',7);
        return true;}
      if(near(p,ctx,5)&&p.state==='landed'){
        if(ctx.mounted){bolt(p,'Pegasus spread its wings and soared away from the rider.');return true;}
        const parts=L.saladParts(l,{food:ranchFood(),supplies:supplies()});
        if(L.saladReady(parts)&&!legendGate('🪽'))return true;
        if(L.saladReady(parts)){useFood('carrot');useFood('apple');useSupply('flowers');l.mint={...l.mint,n:l.mint.n-1};l.zucchini--;l.pegasus={...l.pegasus,gone:true};
          const h=p.data;l.caught.push({kind:'pegasus',id:h.id,at:Date.now()});save();addHorse(h);p.state='caught';p.t=0;sfx('fanfare',{vol:.8});
          card(`<h3>🪽 ${esc(h.name)} is yours!</h3><p>Pegasus ate every bite of the salad and folded its wings beside you. A ${esc(h.breed)} pegasus: tame ${esc(h.name)} at home with pets, brushing and food.</p>`);}
        else{card(`<h3>🪽 Pegasus wants a salad</h3><p>It looked at what you had, flicked its tail and flew back up to the stars.</p>${partsHTML(parts)}<p style="font-size:12px;color:#6d5d45">Gather all five, then wish on Pegasus another night.</p>`);bolt(p,'Pegasus flew back up to the stars.');}
        return true;}
      if(rainbowOn()&&Math.hypot(l.rainbowEnd.x-ctx.x,l.rainbowEnd.z-ctx.z)<3.5){if(ctx.mounted){tell('Hop off to dig. Your horse can’t hold a trowel.',3);return true;}
        l.rainbowEnd={...l.rainbowEnd,dug:true};l.rainbow++;save();sfx('sparkle',{vol:.8});
        card(`<h3>🌈🥕 A rainbow carrot!</h3><p>It shimmers every colour at once. They say a wild unicorn can’t resist one, on a moonlit night. You have ${l.rainbow}.</p>`);return true;}
      if(Math.hypot(L.GARDEN.x-ctx.x,L.GARDEN.z-ctx.z)<3){const res=L.gardenAct(l);l=res.l;save();paintGarden();if(res.sound)sfx(res.sound,{vol:.6});tell(res.msg,5);return true;}
      // Named places with a legend's ingredient.
      if(ctx.place?.distance<6){
        if(ctx.place.id==='picnic'&&!l.seedFound){l.seedFound=true;l.seed=true;save();sfx('pop');card('<h3>🌱 A zucchini seed!</h3><p>Tucked under the picnic blanket. Plant it in the garden bed by the stable and water it 7 days in a row.</p>');return true;}
        if(ctx.place.id==='pond'&&l.mint.day!==today()){l.mint={day:today(),n:Math.min(3,l.mint.n+1)};save();sfx('pop');tell('You picked a sprig of fresh mint by the water 🌿 ('+l.mint.n+'). Good in a salad.',5);return true;}}
      return false;},
    stargaze(ctx){if(ctx.night<=.6||['rain','storm','snow','blizzard'].includes(ctx.kind))return false;
      if(ctx.mounted){tell('Hop off to stargaze. Pegasus is shy of horses.',4);return true;}stargaze();try{const k='trottville-stargaze-night',n=L.nightKey();if(localStorage.getItem(k)!==String(n)){localStorage.setItem(k,String(n));window.TrottStats?.add('stargaze',1);}}catch{}return true;},
    // v106: the moon pegasus seen from the clock tower at midnight (legends.mjs). golden = carrots in the ranch pantry.
    moonCaught:()=>!!l.moon?.caught,
    moonLure({onCaught}={}){if(l.moon?.caught)return false;const have=l.moonCarrot||0;
      closeSheet();css();sheet=document.createElement('div');sheet.className='lg-card';
      sheet.innerHTML=`<div><h3>🌙 A pegasus by the moon!</h3><p>${have?'It’s midnight, and a silver pegasus is circling the moon right above the clock tower. It has seen your <b>Moon Carrot</b>. Its ears are pricked…':'It’s midnight, and a silver pegasus is circling the moon right above the clock tower! It won’t come down for any ordinary treat. Folk say only a carrot grown from a <b>golden seed</b>, by someone very patient, could ever tempt it.'}</p>
        ${have?`<button type="button" class="ok" data-lure="moon">✨🥕 Hold up your Moon Carrot (${have})</button>`:''}<button type="button" class="ok" data-lure="">${have?'Not tonight':'OK'}</button></div>`;
      stage.append(sheet);
      sheet.addEventListener('click',e=>{const b=e.target.closest('[data-lure]');if(!b&&e.target!==sheet)return;closeSheet();const k=b?.dataset.lure;if(!k)return;if(!legendGate('🌙'))return;
        l.moonCarrot=Math.max(0,(l.moonCarrot||0)-1);const h=L.moonHorse(String(Date.now()));l.moon={caught:true,at:Date.now(),id:h.id,name:h.name};l.caught.push({kind:'moon',id:h.id,at:Date.now()});save();addHorse(h);
        sfx('fanfare',{vol:.8});onCaught?.(h);card(`<h3>🪽 ${esc(h.name)} is yours!</h3><p>The moon pegasus took the carrot from your hand, folded its silver wings and nuzzled you. ${esc(h.name)} has joined your herd: pet, brush and feed ${esc(h.name)} at home to tame them.</p>`);});
      return true;},
    // v139: near a shy legend on foot you slow to a tiptoe, so tap-to-walk and a full stick push can't scare it.
    hush(x,z){const u=legends.unicorn,p=legends.pegasus;const e=u&&u.state==='idle'&&Math.hypot(u.x-x,u.z-z)<34?u:p&&p.state==='landed'&&Math.hypot(p.x-x,p.z-z)<22?p:null;
      if(e&&!e.hushTold){e.hushTold=true;tell('You slow to a tiptoe so you don’t scare it.',4);}return !!e;},
    moonAskedTonight:()=>l.moonAsked===L.nightKey(),markMoonAsked(){l.moonAsked=L.nightKey();save();},devMoonReset(){delete l.moonAsked;save();},
    devTreats(){l.rainbow++;l.moonCarrot=(l.moonCarrot||0)+1;l.mint={day:l.mint.day,n:Math.min(3,l.mint.n+1)};l.zucchini=(l.zucchini||0)+1;save();},
    moonCarrots:()=>l.moonCarrot||0,
    addMoonCarrot(){l.moonCarrot=(l.moonCarrot||0)+1;save();},
    // Legends HUD for the profile menu / quest log: what you hold.
    pocket(){return {rainbow:l.rainbow,zucchini:l.zucchini,mint:l.mint.n,seed:l.seed,caught:l.caught.length};},
    update(delta,ctx){clock+=delta;const t=clock;
      // Rainbow after rain.
      if(ctx.area==='outdoor'){const d=today();if(rainbowNow()&&!(l.rainbowEnd&&l.rainbowEnd.day===d)){l.rainbowEnd=L.rainbowSpot(d);save();tell('The sky has cleared and a rainbow has come down somewhere in the valley! 🌈 Find where it ends.',7);}}
      rainbow.visible=ctx.area==='outdoor'&&rainbowOn()&&ctx.night<.3;
      if(rainbow.visible){const e=l.rainbowEnd;rainbow.position.set(e.x,groundHeight(e.x,e.z),e.z);rainbow.rotation.y=.9;rainbow.userData.dig.userData.tick(delta,t);}
      // Unicorn on moonlit nights.
      const night=L.nightKey(),moonlit=ctx.night>.6&&L.MOON_KINDS.has(ctx.kind);
      const spot=moonlit&&!(l.unicorn.night===night&&l.unicorn.gone)?L.unicornTonight(night):null;
      if(spot&&!legends.unicorn){const e=makeLegend('unicorn',night);e.x=spot.x;e.z=spot.z;e.yaw=Math.random()*6;legends.unicorn=e;}
      if(!spot&&legends.unicorn&&legends.unicorn.state==='idle'&&!legends.unicorn.debug)drop('unicorn');
      // Pegasus after a 200.
      if(l.pegasus.night===night&&!l.pegasus.gone&&ctx.night>.4&&!legends.pegasus&&ctx.area==='outdoor'&&!sheet){const e=makeLegend('pegasus',night),a=ctx.heading??0;
        e.x=ctx.x+Math.sin(a)*9;e.z=ctx.z+Math.cos(a)*9;e.yaw=a+Math.PI;e.state='descend';e.t=0;legends.pegasus=e;e.model.setGait('gallop');tell('Look up! Pegasus is gliding down to you.',6);}
      if(legends.pegasus&&ctx.night<.2&&legends.pegasus.state==='landed')bolt(legends.pegasus,'Dawn is breaking, and Pegasus flies home to the stars.');
      for(const e of Object.values(legends)){if(!e)continue;const m=e.model,root=m.root;e.t+=delta;root.visible=ctx.area==='outdoor';
        const g=groundHeight(e.x,e.z);
        if(e.state==='descend'){const k=Math.min(1,e.t/4.5),ease=1-Math.pow(1-k,3);root.position.set(e.x-Math.sin(e.yaw)*(1-ease)*24,g+(1-ease)*30,e.z-Math.cos(e.yaw)*(1-ease)*24);if(k>=1){e.state='landed';m.setGait('stand');sfx('thud',{vol:.5});}}
        else if(e.state==='bolt'){e.model.setGait(e.kind==='pegasus'?'gallop':'gallop');const sp=e.t*e.t*4+e.t*6;root.position.set(e.x+Math.sin(e.yaw)*sp,g+(e.kind==='pegasus'?e.t*e.t*6:0),e.z+Math.cos(e.yaw)*sp);
          root.traverse(o=>{if(o.material&&o.material.opacity!==undefined&&e.t>1.2){o.material.transparent=true;}});root.scale.setScalar(Math.max(.01,1-Math.max(0,e.t-1.2)/1.2)*(m.scale||1));if(e.t>2.4){drop(e.kind);continue;}}
        else if(e.state==='caught'){root.position.y=g+Math.sin(e.t*6)*.05;root.scale.setScalar(Math.max(.01,1-Math.max(0,e.t-2.5)/1)*(m.scale||1));if(e.t>3.5){drop(e.kind);continue;}}
        else{root.position.set(e.x,g,e.z);
          // Skittish: riding or running nearby spooks it for the night. Walk slowly on foot.
          const d=Math.hypot(e.x-ctx.x,e.z-ctx.z);if(d<16)e.yaw+=Math.atan2(Math.sin(Math.atan2(ctx.x-e.x,ctx.z-e.z)-e.yaw),Math.cos(Math.atan2(ctx.x-e.x,ctx.z-e.z)-e.yaw))*Math.min(1,delta*1.5);
          if(ctx.area==='outdoor'&&d<(e.kind==='unicorn'?26:16)&&(ctx.mounted||ctx.speed>3.7)){bolt(e,ctx.mounted?(e.kind==='unicorn'?'A unicorn! But it saw your horse, reared and vanished. Unicorns only trust people on foot.':'Pegasus shied from the horse and took off.'):(e.kind==='unicorn'?'A unicorn! You ran, and it vanished. Walk slowly next time.':'Pegasus startled and took off. Approach slowly.'));e.yaw+=Math.PI;}
          if(e.kind==='unicorn'&&d<40&&!e.seen){e.seen=true;tell(ctx.mounted?'Something is glowing in the moonlight… a unicorn! Get off your horse and walk slowly.':'Something is glowing in the moonlight… a unicorn! Walk up slowly.',7);}}
        root.rotation.y=e.yaw;m.update(delta);e.fx.userData.tick(delta,t);}},
    closeSheet,
    debugSpawn(kind,x,z){drop(kind);const e=makeLegend(kind,'test-'+Date.now());e.x=x;e.z=z;e.state=kind==='pegasus'?'landed':'idle';e.debug=true;legends[kind]=e;return e.data;},
    debugState:()=>({l,unicorn:legends.unicorn?.state||null,pegasus:legends.pegasus?.state||null,sheet:!!sheet}),
    dispose(){closeSheet();drop('unicorn');drop('pegasus');group.removeFromParent();geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());glowTex.dispose();}};
}
