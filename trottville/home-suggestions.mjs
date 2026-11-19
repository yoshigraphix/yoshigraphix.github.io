// "What to do next" for the home page. Pure: horselandia.js gathers the facts (wallet, places found, trust,
// today's care) and this picks up to three friendly suggestions, each with one button. Goals are concrete
// ("75 more coins for the Ranger Cape") so the player remembers why a game is worth playing.
import {OUTFITS,coinWords} from './character-looks.mjs?v=160';

// Ways to earn coins, rotated by day so the home page doesn't always push the same game.
const EARN=[
  {go:'game:feed',label:'Play Appleoosa',how:'Play Appleoosa',coins:20},
  {go:'game:fling',label:'Play Hay’s for Horses',how:'Fling hay in Hay’s for Horses',coins:20},
  {go:'steeple',label:'Race the steeplechase',how:'Race the countryside steeplechase',coins:10},
  {go:'map',label:'Open the map',how:'Discover a new place',coins:25}
];

export function suggestions({wallet,visited=0,places=20,trust={},horses=[],careLeft=[],dayIndex=0,ranchAlerts=[],special=null}){
  const out=[];
  // 0. The ranch: a horse that needs the vet, or not enough food for today, comes first.
  const vet=ranchAlerts.find(a=>a.id==='vet'),food=ranchAlerts.find(a=>a.id==='food');
  if(vet)out.push({id:'vet',icon:'🩺',title:vet.text,text:'The vet costs 150 Trotties, or 75 if you help with the checkup.',go:'ranch:vet',label:'Vet'});
  if(food)out.push({id:'food',icon:'🍎',title:food.text,text:'Appleoosa pays in apples as well as Trotties.',go:'game:feed',label:'Play Appleoosa'});
  // 1. Care the horse on the home page still wants today.
  const care=careLeft[0];
  if(care&&care.actions.length){const words={bond:'a pat',feed:'a treat',groom:'a brush'};
    out.push({id:'care',icon:'🥕',title:`${care.name} would love ${care.actions.map(a=>words[a]).join(', ').replace(/, ([^,]*)$/,' and $1')}`,text:'+10 Trotties each, once a day. Use the brush and the carrot basket above.',go:'care:'+care.actions[0],label:{bond:'Pet',feed:'Feed',groom:'Brush'}[care.actions[0]]});}
  // 2. The next outfit to save up for (cheapest coin outfit not owned yet).
  const goal=OUTFITS.filter(o=>o.tier==='coins'&&!wallet.owned.includes(o.id)).sort((a,b)=>a.price-b.price)[0];
  if(goal){const short=goal.price-wallet.coins;
    if(short<=0)out.push({id:'outfit',icon:'👕',title:`You can get the ${goal.name}!`,text:`You have 🪙 ${coinWords(wallet.coins)}. It costs 🪙 ${goal.price}. Try it on under Me in the 3D world.`,go:'me',label:'Try it on'});
    else{const e=EARN[dayIndex%EARN.length],times=Math.ceil(short/e.coins);
      out.push({id:'outfit',icon:'🪙',title:`${e.how} to earn Trotties for the ${goal.name}`,text:`🪙 ${short} more to go: about ${times} ${times===1?'win':'wins'} at +${e.coins} each.`,go:e.go,label:e.label});}}
  // 2b. Game Card outfits, once there are stars to spend.
  const star=OUTFITS.filter(o=>o.tier==='card'&&!wallet.owned.includes(o.id)&&o.price<=wallet.stars)[0];
  if(star)out.push({id:'stars',icon:'⭐',title:`Your stars can get the ${star.name}`,text:`You have ⭐ ${wallet.stars}. Card outfits are under Me in the 3D world.`,go:'me',label:'Try it on'});
  // 2c. A special breed just arrived at the horse market (stock is limited).
  if(special)out.push({id:'special',icon:'🐴',title:`A ${special.breed} is at Hoofhaven Horse Market`,text:`${special.name}, ${special.price.coins.toLocaleString('en-US')} 🪙 or ${special.price.stars.toLocaleString('en-US')} ⭐. Another rider might adopt them first.`,go:'ranch:market',label:'Take a look'});
  // 3. Places still to discover.
  if(visited<places)out.push({id:'explore',icon:'🗺️',title:`${places-visited} places still to discover`,text:'Each new place is +25 🪙. Riding there with a horse also builds trust.',go:'map',label:'Open the map'});
  // 4. The horse that trusts you least.
  const shy=horses.map(h=>({...h,t:trust[h.id]??50})).sort((a,b)=>a.t-b.t)[0];
  if(shy&&shy.t<80)out.push({id:'trust',icon:'🤝',title:`Ride with ${shy.name} to build trust`,text:`Trust ${shy.t}/100. Each trip you ride together on the map adds +2 (jumping there costs 3).`,go:'map',label:'Ride together'});
  return out.slice(0,3);
}
