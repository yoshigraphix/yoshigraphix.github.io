/* Meadowgate cloud bridge. Supabase JS 2.118.0, bundled locally for offline use. */
'use strict';
(() => {
  const configKey='meadowgate-supabase-config';
  const preferences=s=>Object.fromEntries(['joined','clubs','liked','saved','comments','posts'].map(k=>[k,s[k]]));
  const copy=o=>JSON.parse(JSON.stringify(o));
  function validateConfig(url,key){
    let parsed;try{parsed=new URL(url);}catch{throw Error('Enter a valid Supabase project URL.');}
    if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||parsed.pathname!=='/'||parsed.search||parsed.hash||parsed.username||parsed.password)throw Error('Use the HTTPS project URL ending in .supabase.co.');
    if(key.startsWith('sb_publishable_')&&key.length>25)return {url:parsed.origin,publishableKey:key};
    if(key.startsWith('sb_secret_'))throw Error('Use a publishable key, never a secret key.');
    try{const body=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(body.role==='anon')return {url:parsed.origin,publishableKey:key};}catch{}
    throw Error('Use the project’s publishable key or legacy anon key. Service-role and secret keys are not accepted.');
  }
  const cloud={
    googleEnabled:false,googleStatus:'unchecked',providerCheck:null,providerCheckedAt:0,user:null,status:'not_configured',message:'Connect Supabase to enable Google sign-in.',client:null,config:null,cache:null,busy:false,ready:false,clockOffset:0,
    emit(state){window.dispatchEvent(new CustomEvent('meadow:cloud',{detail:{state,status:this.status,user:this.user}}));},
    get queueCount(){return this.cache?.pending?.length||0;},
    get active(){return !!this.user;},
    get configured(){return !!this.config;},
    get displayName(){return this.user?.user_metadata?.full_name?.split(' ')[0]||this.user?.user_metadata?.name?.split(' ')[0]||'Rider';},
    key(id=this.user?.id){return 'meadowgate-account-v1:'+id;},
    persist(){if(!this.user||!this.cache)return;try{localStorage.setItem(this.key(),JSON.stringify(this.cache));}catch{this.message='Device storage is full. Keep this page open until progress syncs.';this.emit();}},
    async init(){
      // Dev "new player" test run (test-friends.js): sign-in stays off so the test horse never reaches the real account,
      // and the real session in this browser is left untouched until "Back to my save".
      try{if(localStorage.getItem('trottville-newplayer-run')){this.status='not_configured';this.message='Sign-in is off during a new-player test. Use “Back to my save” to end it.';this.emit();return;}}catch{}
      try{const saved=JSON.parse(localStorage.getItem(configKey)||'null');const c=saved||window.MEADOWGATE_SUPABASE;if(!c?.url||!c?.publishableKey){this.emit();return;}this.config=validateConfig(c.url,c.publishableKey);}catch(error){this.status='configuration_error';this.message=error.message;this.emit();return;}
      if(!window.supabase?.createClient){this.status='error';this.message='The sign-in library did not load. Reload while online.';this.emit();return;}
      this.client=window.supabase.createClient(this.config.url,this.config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true,storageKey:'meadowgate-auth-'+new URL(this.config.url).hostname.split('.')[0]}});
      this.status='connecting';this.message='Checking your account…';this.emit();void this.checkGoogle();
      this.client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')queueMicrotask(()=>this.activate(null));else if(session?.user&&session.user.id!==this.user?.id)queueMicrotask(()=>this.activate(session));});
      try{const {data,error}=await this.client.auth.getSession();if(error)throw error;await this.activate(data.session);}catch(error){this.status='error';this.message='Could not restore sign-in. Please try again online.';this.emit();}
      const params=new URLSearchParams(location.search);if(params.has('code')||params.has('error')||params.has('sb_flow_id')){if(params.get('error')){this.status='error';this.message='Google sign-in was not completed. You can try again.';}history.replaceState(null,'',location.pathname+'#account');this.emit();}
    },
    async configure(url,key){const c=validateConfig(url.trim(),key.trim());localStorage.setItem(configKey,JSON.stringify(c));location.assign(location.pathname+'#account');location.reload();},
    async activate(session){
      const user=session?.user||null;
      if(!user){const hadUser=!!this.user;this.user=null;this.cache=null;this.ready=false;this.status='signed_out';this.message='Sign in to your game account to keep a stable across devices.';this.emit(hadUser?{guest:true}:undefined);return;}
      if(this.user?.id===user.id&&(this.ready||this.status==='loading'))return;
      this.user=user;this.ready=false;this.status='loading';this.message='Opening your stable…';
      try{this.cache=JSON.parse(localStorage.getItem(this.key())||'null');}catch{this.cache=null;}
      if(this.cache?.snapshot){this.ready=true;this.clockOffset=this.cache.clockOffset||0;this.emit(copy(this.cache.snapshot));}else this.emit({loading:true});
      try{await this.refresh();}catch(error){this.status=this.cache?.snapshot?'offline':'error';this.message=this.cache?.snapshot?'Your saved stable is available. Reconnect to sync.':'Your cloud stable could not be opened. Check the connection and database setup.';this.emit();}
    },
    async rpc(name,args={}){const {data,error}=await this.client.rpc(name,args);if(error)throw error;if(!data?.horses||!Number.isFinite(data.points))throw Error('Unexpected cloud response');return data;},
    async refresh(){
      if(!this.user||this.busy||this.refreshing)return;
      this.refreshing=true;
      try{
      const uid=this.user.id;const data=await this.rpc('meadowgate_state');if(this.user?.id!==uid)return;
      this.clockOffset=(data.serverNow||Date.now())-Date.now();
      if(!this.cache)this.cache={snapshot:data,pending:[],preferencesRevision:data.preferencesRevision||0};
      if(!this.queueCount){this.cache.snapshot=data;this.cache.preferencesRevision=data.preferencesRevision||0;this.cache.remote=data;this.cache.clockOffset=this.clockOffset;this.ready=true;this.status='synced';this.message='Your stable is saved in Supabase.';this.persist();this.emit(copy(data));}else{this.cache.remote=data;this.ready=true;this.refreshing=false;await this.sync();}
      }finally{this.refreshing=false;}
    },
    stage(operation,snapshot){
      if(!this.user||!this.cache||!this.ready)throw Error('Wait for your cloud stable to open.');
      const op=operation||{action:'preferences',preferences:preferences(snapshot)};
      const entry={...copy(op),id:crypto.randomUUID()};
      if(entry.action==='preferences'){
        entry.expected=this.cache.preferencesRevision||0;
        const pending=this.cache.pending.findLast(x=>x.action==='preferences'&&x.id!==this.inFlight);
        if(pending){pending.preferences=entry.preferences;}else this.cache.pending.push(entry);
      }else this.cache.pending.push(entry);
      this.cache.snapshot=copy(snapshot);this.status='pending';this.message=navigator.onLine?'Saving your progress…':'Saved on this device. Waiting for a connection.';this.persist();this.emit();void this.sync();
    },
    async sync(){
      if(!this.user||!this.cache||this.busy||this.refreshing||!navigator.onLine||this.status==='conflict')return;
      if(!this.queueCount){if(this.ready){this.status='synced';this.message='Your stable is saved in Supabase.';this.emit();}return;}
      this.busy=true;const uid=this.user.id;
      try{
        while(this.queueCount&&this.user?.id===uid){
          const op=this.cache.pending[0];this.inFlight=op.id;this.status='syncing';this.message='Saving your progress…';this.emit();
          const data=await this.rpc('hl_stable_action',{p_action:op.action,p_horse_id:op.horseId||null,p_value:op.value||null,p_day:op.day||null,p_preferences:op.preferences||null,p_expected_revision:op.action==='preferences'?op.expected:null});
          if(this.user?.id!==uid)return;
          const oldRevision=this.cache.preferencesRevision||0;
          this.cache.pending.shift();this.cache.remote=data;this.cache.preferencesRevision=data.preferencesRevision||0;
          if(op.action==='preferences')for(const next of this.cache.pending)if(next.action==='preferences'&&next.expected===oldRevision)next.expected=this.cache.preferencesRevision;
          this.clockOffset=(data.serverNow||Date.now())-Date.now();this.cache.clockOffset=this.clockOffset;this.persist();
        }
        if(this.user?.id===uid&&this.cache){this.cache.snapshot=this.cache.remote;this.status='synced';this.message='Your stable is saved in Supabase.';this.persist();this.emit(copy(this.cache.snapshot));}
      }catch(error){
        if(this.user?.id!==uid)return;
        const message=String(error.message||'');
        if(message.includes('MG_CONFLICT')){this.status='conflict';this.message='Your community notes changed on another device. Choose which notes to keep.';}
        else if(message.includes('MG_DAY_EXPIRED')){this.cache.conflictBackup=copy(this.cache.snapshot);this.cache.pending.shift();this.status='expired';this.message='A queued reward was from an earlier day. It was not awarded; reconnect to refresh.';this.persist();}
        else {this.status='error';this.message='Progress is saved on this device. Cloud sync failed; check your connection or Supabase setup.';}
        this.emit();
      }finally{this.busy=false;this.inFlight=null;}
    },
    async resolveConflict(useLocal){
      if(!this.user)return;const data=await this.rpc('meadowgate_state');this.cache.conflictBackup=copy(this.cache.snapshot);this.cache.remote=data;this.cache.preferencesRevision=data.preferencesRevision||0;
      if(useLocal){for(const op of this.cache.pending)if(op.action==='preferences')op.expected=this.cache.preferencesRevision;}
      else this.cache.pending=this.cache.pending.filter(op=>op.action!=='preferences');
      this.status='pending';this.persist();
      if(this.queueCount)await this.sync();else{this.cache.snapshot=data;this.status='synced';this.message='Cloud notes restored. A copy of your device notes is kept on this browser.';this.persist();this.emit(copy(data));}
    },
    async checkGoogle(){
      if(this.providerCheck)return this.providerCheck;
      const announce=()=>window.dispatchEvent(new CustomEvent('meadow:auth',{detail:{googleEnabled:this.googleEnabled,googleStatus:this.googleStatus}}));
      if(!this.config){this.googleEnabled=false;this.googleStatus='not_configured';announce();return false;}
      if(!navigator.onLine){this.googleEnabled=false;this.googleStatus='offline';announce();return false;}
      this.googleStatus='checking';announce();
      this.providerCheck=Promise.resolve().then(async()=>{try{
        const response=await fetch(this.config.url+'/auth/v1/settings',{headers:{apikey:this.config.publishableKey},cache:'no-store',signal:typeof AbortSignal!=='undefined'&&AbortSignal.timeout?AbortSignal.timeout(8000):undefined});
        if(!response.ok)throw Error('Provider settings unavailable');const settings=await response.json();
        if(typeof settings.external?.google!=='boolean')throw Error('Provider settings unavailable');
        this.googleEnabled=settings.external.google;this.googleStatus=this.googleEnabled?'enabled':'disabled';
      }catch{this.googleEnabled=false;this.googleStatus='unavailable';}
      finally{this.providerCheckedAt=Date.now();this.providerCheck=null;announce();}return this.googleEnabled;});
      return this.providerCheck;
    },
    async signIn(){
      if(!this.client)throw Error('Connect a Supabase project first.');
      if(!navigator.onLine)throw Error('Google sign-in needs an internet connection.');
      if(!await this.checkGoogle())throw Error(this.googleStatus==='disabled'?'Google login is not enabled in Supabase yet. Finish the Google playtest setup below.':'Could not check Google login. Reconnect and choose Check Google connection.');
      const {error}=await this.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,scopes:'openid email profile',queryParams:{prompt:'select_account'}}});if(error)throw error;
    },
    async signOut(){
      if(this.busy)throw Error('Please wait for the current save to finish.');
      const {error}=await this.client.auth.signOut({scope:'local'});if(error)throw error;
      this.user=null;this.cache=null;this.ready=false;this.status='signed_out';this.message='Signed out on this device.';this.emit({guest:true});
    }
  };
  window.MeadowCloud=cloud;
  window.addEventListener('online',()=>{if(cloud.user)cloud.refresh().catch(()=>{cloud.status='error';cloud.message='Reconnect and try syncing again.';cloud.emit();});});
  window.addEventListener('storage',e=>{if(cloud.user&&e.key===cloud.key()&&!cloud.busy){cloud.status='other_tab';cloud.message='This stable changed in another tab. Refresh cloud progress before continuing.';cloud.ready=false;cloud.emit();}});
  window.addEventListener('DOMContentLoaded',()=>void cloud.init());
})();
