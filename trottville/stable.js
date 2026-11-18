'use strict';
(() => {
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const horse=(id)=>{
    const colors={willow:['#b8794e','#d69560','#69462e','#ecdcbb'],atlas:['#b8bbb3','#dce0d6','#747a72','#e9e9da'],sunny:['#d3ae68','#e5c980','#f4e2b6','#f6ebca']};
    const [coat,light,mane,blaze]=colors[id]||colors.willow;
    return `<svg viewBox="0 0 240 280" aria-hidden="true"><path d="m70 163 90-3 29 120H38z" fill="${coat}"/><path d="m140 158 21 2 28 120h-42z" fill="${mane}" opacity=".25"/><path d="m69 62-1-60 37 52m34 5 30-50 1 68" fill="${coat}"/><path d="m77 45-1-28 18 31m57 3 12-26-1 34" fill="#bd967c"/><path d="m72 57 54-15 45 29 14 64-30 64-45 0-36-49-12-50z" fill="${coat}"/><path d="m126 42 45 29 14 64-30 64h-17l17-75z" fill="${light}"/><path d="m72 57 29-21 35 0 35 35-41-7-19 36-12-33-23 18z" fill="${mane}"/><path d="m125 74 9 3 5 68-10 19-10-16z" fill="${blaze}"/><path d="m92 150 67-2 12 30-16 21h-45l-23-27z" fill="${light}"/><path d="m92 164 67-3 12 17-16 21h-45l-23-27z" fill="${coat}" opacity=".45"/><ellipse cx="95" cy="114" rx="7" ry="9" fill="#263c33"/><ellipse cx="159" cy="111" rx="7" ry="9" fill="#263c33"/><circle cx="97" cy="111" r="2.5" fill="#fff8e7"/><circle cx="161" cy="108" r="2.5" fill="#fff8e7"/><ellipse cx="107" cy="173" rx="5" ry="3.5" fill="#705441"/><ellipse cx="154" cy="171" rx="5" ry="3.5" fill="#705441"/><path d="m111 188 31 0" stroke="#956649" stroke-width="2" fill="none"/></svg>`;
  };
  window.HorselandiaStable={horse,
    scene(horses,owner){
      return `<section class="stable-diorama" aria-label="Your visual stable"><div class="stable-scene"><img class="stable-backdrop" id="stable-background-image" src="assets/meadow.webp" alt="A sunny meadow with horses grazing by the barn"><img class="stable-building" src="assets/stable-building.svg" alt="A wooden stable with three stalls and a teal roof"><div class="stable-scene-label"><span>WELCOME HOME</span><b>${escape(owner)}’s stable</b></div>${horses.slice(0,3).map((h,i)=>`<a class="visual-stall stall-${i}" href="#horse/${escape(h.id)}" aria-label="Visit ${escape(h.name)} in stall ${i+1}"><span class="stall-horse">${horse(h.id)}</span><span class="stall-door"><i></i><em></em></span><span class="stall-name">${escape(h.name)} <span>↗</span></span></a>`).join('')}<div class="scene-instruction">Choose a horse to step inside</div><span class="scene-credit">YOUR CORNER OF TROTTVILLE</span></div><div class="stable-scene-toolbar"><span id="stable-background-status">Meadow background · Included</span><button class="secondary" data-action="stable-background">Personalize background ↗</button></div></section>`;
    }
  };
})();
