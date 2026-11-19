'use strict';
(() => {
  let instance=null, revision=0, loadingTimer=0, finishLoading=null;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.HorselandiaWorld={
    render(horses){
      const paths={
        map:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16 M6 9h.01 M18 13h.01',
        journal:'M4 4h6a3 3 0 013 3v14a4 4 0 00-4-2H4z M13 7a3 3 0 013-3h4v15h-3a4 4 0 00-4 2',
        barn:'M3 10l9-7 9 7v11H3z M8 21v-9h8v9 M8 12l8 9 M16 12l-8 9',
        friends:'M15 21v-3a4 4 0 00-4-4H7a4 4 0 00-4 4v3 M17 14a4 4 0 014 4v3 M9 10a3 3 0 100-6 3 3 0 000 6 M17 4a3 3 0 010 6',
        chat:'M21 11a8 8 0 01-8 8H6l-4 3 1-6a8 8 0 018-13h2a8 8 0 018 8z M7 10h10 M7 14h6',
        camera:'M3 7h5l2-3h4l2 3h5v13H3z M16 13a4 4 0 11-8 0 4 4 0 018 0',
        fullscreen:'M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5',
        horse:'M5 21c0-5 1-8 5-11L9 3l5 3 4-2-1 5 4 5-2 3-6-1-1 5 M9 6C5 7 3 11 3 16 M14 10h.01 M16 14l3 1',
        mount:'M4 8c3 0 4 4 8 4s5-4 8-4l1 6c-3 4-15 4-18 0z M7 15v6h4v-4 M17 15v6h-4 M5 5v3 M19 5v3',
        jump:'M3 21v-9 M21 21v-9 M3 17h18 M3 13h4 M17 13h4 M6 9c2-5 10-5 12 0 M9 7l3-3 3 3',
        canter:'M8 3c-4 2-5 5-5 9 0 6 4 9 9 9s9-3 9-9c0-4-1-7-5-9l-2 4c2 1 3 3 3 5 0 3-2 5-5 5s-5-2-5-5c0-2 1-4 3-5z M6 11h.01 M6 15h.01 M18 11h.01 M18 15h.01',
        interact:'M10 9.5V4a2 2 0 0 0-4 0v10 M14 10V9a2 2 0 0 0-4 0v1 M18 11v-1a2 2 0 0 0-4 0 M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
        me:'M12 11a4 4 0 100-8 4 4 0 000 8 M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1 M9 14l3 4 3-4 M19 3l.6 1.4L21 5l-1.4.6L19 7l-.6-1.4L17 5l1.4-.6z',
        exit:'M10 4H4v16h6 M14 7l5 5-5 5 M8 12h11',stop:'M6 6h12v12H6z',home:'M3 11l9-8 9 8 M5 10v11h14V10 M9 21v-7h6v7'
      };
      const PX={map:'map',mount:'saddle',horse:'whistle',interact:'tap',jump:'jump-fence',journal:'quests',barn:'games',friends:'friends',me:'rider',camera:'camera',fullscreen:'fullscreen',exit:'exit'};
      const icon=name=>PX[name]?`<img class="px-ic world-px" src="assets/icons/${PX[name]}.webp" alt="" aria-hidden="true" draggable="false">`:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
      const button=(id,label,name,extra='',caption='')=>`<button class="world-icon" id="${id}" aria-label="${label}" title="${label}" ${extra}>${icon(name)}${caption?`<span class="world-icon-caption" aria-hidden="true">${caption}</span>`:''}<span class="world-tooltip" aria-hidden="true">${label}</span></button>`;
      return `<section class="world-page">
        <div class="world-stage" id="world-stage" aria-label="Trottville 3D horse world" aria-busy="true">
          <div class="world-canvas" id="world-canvas" tabindex="0" aria-label="3D meadow. Tap the ground to walk or ride. Drag to look; pinch or scroll to zoom. WASD also moves. Arrow keys rotate the camera. F to interact, E to mount, Space to jump."></div>
          <div class="world-loading world-loading-plain" id="world-loading" role="status" aria-live="polite"><span class="world-sr-only" id="world-loading-status">Opening your stall…</span></div>
          <div class="world-top"><div class="world-location"><img src="assets/icons/logo-mark.webp" alt=""><div><span class="world-mini-brand">Trottville</span><b id="world-location">The stable yard</b><small class="world-sr-only" id="world-room-status">Solo playtest · Your own pace</small></div></div><div class="world-coins" data-trottcoins title="Your Trotties"><span aria-hidden="true">🪙</span><b>0</b></div><div class="world-weather" id="world-weather" data-no-icons title="Time and weather"></div><div class="world-top-icons" role="toolbar" aria-label="View and exit">${button('world-camera-toggle','Camera & controls','camera','aria-expanded="false" aria-controls="world-camera-panel"')}${button('world-fullscreen','Enter browser fullscreen','fullscreen')}${button('world-exit','Exit to website','exit','data-action="exit-world"','Exit')}</div></div>
          <nav class="world-tools world-dock world-explore-dock" aria-label="Explore tools"><span class="world-dock-label">EXPLORE</span>
            ${button('world-map','Map of all the places','map','','Map')}<small class="world-sr-only" id="world-map-count">0</small>
            ${button('world-journal','Adventure journal','journal','','To-do')}<small class="world-sr-only" id="world-journal-count">0/14</small>
            ${button('world-barn','Barn games','barn','','Barn')}
            ${button('world-style','Your character & outfits','me','','Me')}
          </nav>
          <nav class="world-social-dock world-dock" aria-label="Social tools"><span class="world-dock-label">SOCIAL</span>${button('world-friends','Friends','friends','','Friends')}</nav>
          <div class="world-camera world-popover" id="world-camera-panel" hidden aria-label="Camera settings">
            <header><b>Camera & controls</b><button class="world-panel-close" data-close-world-panel aria-label="Close camera settings">×</button></header>
            <div class="world-camera-buttons"><button id="world-camera-left" aria-label="Rotate view left">↶</button><button id="world-camera-right" aria-label="Rotate view right">↷</button><button id="world-zoom-in" aria-label="Zoom camera in">+</button><button id="world-zoom-out" aria-label="Zoom camera out">−</button>${button('world-reset','Return to stable yard','home')}</div>
            <div class="world-sky-tools"><label>Sky<select id="world-sky-time"><option value="">Live · your clock</option><option value="6">Dawn</option><option value="9">Morning</option><option value="13">Midday</option><option value="19">Golden hour</option><option value="20">Sunset</option><option value="20.8">Dusk</option><option value="0">Night</option></select></label><label>Weather<select id="world-sky-weather"><option value="">Live</option><option value="clear">Clear</option><option value="partly">Partly cloudy</option><option value="overcast">Cloudy</option><option value="fog">Foggy</option><option value="rain">Rain</option><option value="storm">Thunderstorm</option><option value="windy">Windy</option><option value="snow">Snow</option></select></label><button type="button" id="world-sound" aria-pressed="true">🔊 Sounds on</button><button type="button" id="world-music" data-audio="music">🎵 Music on</button><button type="button" id="world-gfx" data-audio="gfx">✨ Pretty effects on</button></div>
            <p><b>Tap</b> a spot to go there (far away = you speed up) · <b>tap a horse</b> to ride it.<br><b>Press and drag</b> to steer: drag further to go faster.<br><b>Two fingers</b> to turn the camera · <b>pinch / scroll</b> to zoom.</p><p class="world-keys-help">Keyboard: WASD to move, arrow keys to look, F to interact, E to mount, Space to jump, Shift to canter.</p>
          </div>
          <div class="world-track" id="world-track" hidden></div>
          <div class="world-stamina" id="world-stamina" hidden aria-label="Horse stamina"><span>Stamina</span><i><b></b></i></div>
          <div class="world-message" id="world-message" role="status" aria-live="polite">Tap the ground to walk. Drag to look around.</div>
          <div class="world-controls world-dock" role="toolbar" aria-label="Riding tools"><span class="world-dock-label">RIDING</span><div class="world-actions">
            ${button('world-companions-toggle','Your horses & ride progress','horse','aria-expanded="false" aria-controls="world-companions-panel"','Horses')}${button('world-mount','Mount a horse · E','mount','','Saddle')}${button('world-jump','Jump · Space','jump','','Jump')}${button('world-interact','Explore nearby · F','interact','','Explore')}
          </div></div>
          ${button('world-walk-stop','Stop walking','stop','hidden','Stop')}
          <section class="world-companions world-popover" id="world-companions-panel" hidden aria-label="Your horses and ride progress">
            <header><div><b id="world-riding">Exploring on foot</b><small id="world-distance">0 m explored</small></div><button class="world-panel-close" data-close-world-panel aria-label="Close horse selection">×</button></header>
            <div class="world-horse-buttons">${horses.map(h=>`<button data-call-horse="${esc(h.id)}"><i class="horse-coat coat-${esc(h.id)}"></i><span>Call ${esc(h.name)}</span></button>`).join('')}</div>
            <div class="world-quest"><span class="eyebrow">YOUR MEADOW LOOP</span><b id="world-quest-title">Ride the five meadow markers</b><div class="world-stamps" id="world-stamps" aria-label="0 of 5 meadow markers visited">${[1,2,3,4,5].map(n=>`<span data-stamp="${n-1}">${n}</span>`).join('')}</div><small id="world-quest-hint">Call a companion, then saddle up.</small></div>
          </section>
          <button type="button" class="world-race-start" id="world-race-start" hidden>Start race</button>
        </div>
      </section>`;
    },
    async attach(options){
      const host=document.querySelector('#world-stage');if(!host)return;
      const token=++revision;
      try{
        const started=performance.now();
        const {createWorld}=await import('./world.js?v=160');
        if(token!==revision||!host.isConnected)return;
        host.querySelector('#world-loading-status').textContent='Settling the horses…';
        instance=createWorld(host,options);
        // One world (v82): no title splash. A plain barn-wood cover stays only until the world has compiled its
        // shaders and drawn its first frame (instance.ready, a real load event), then it fades away.
        await new Promise(resolve=>{finishLoading=resolve;Promise.resolve(instance.ready).then(resolve,resolve);});
        finishLoading=null;
        if(token!==revision||!host.isConnected)return;
        host.querySelector('#world-loading').hidden=true;host.classList.add('world-ready');host.setAttribute('aria-busy','false');host.querySelector('#world-canvas').focus({preventScroll:true});
      }catch(error){
        if(token!==revision||!host.isConnected)return;
        const loading=host.querySelector('#world-loading');loading.classList.add('world-error');loading.innerHTML='<h1>Trottville</h1><b>The valley couldn’t open in this browser.</b><span>Try an updated Chrome, Safari, or Edge browser with graphics acceleration enabled. Your stable is still available.</span><button class="secondary" data-action="exit-world">Back to website</button>';host.setAttribute('aria-busy','false');
        console.error('3D world startup failed:',error);
      }
    },
    dispose(){revision++;clearTimeout(loadingTimer);loadingTimer=0;finishLoading?.();finishLoading=null;instance?.dispose();instance=null;}
  };
})();
