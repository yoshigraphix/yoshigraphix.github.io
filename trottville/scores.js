// Shared leaderboards for every barn game (server: hl_scores, supabase/migrations/202611060003_game_leaderboards.sql).
// A run is started on the server so it can time the play; submissions are re-sent as the run goes on (shift ends,
// game over, leaving) and the last one is marked final. Guests and offline players keep their device best only.
const MESSAGES={HL_SIGN_IN_REQUIRED:'Sign in to post your score.',HL_SCORE_IMPLAUSIBLE:'That score could not be posted.',HL_SCORE_CLOSED:'This run is already posted.',HL_SCORE_GAME:'This game has no leaderboard yet.'};
export const scoreError=error=>{const message=String(error?.message||error||'');const code=Object.keys(MESSAGES).find(k=>message.includes(k));return code?MESSAGES[code]:'Leaderboard offline · your best is kept on this device.';};
const escape=s=>String(s).replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
const safeName=value=>String(value||'Rider').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24)||'Rider';

export function createScoreRun(game,{cloud=globalThis.window?.MeadowCloud,online=()=>globalThis.navigator?.onLine!==false,wait=ms=>new Promise(r=>setTimeout(r,ms)),now=()=>Date.now()}={}){
  let run={id:Promise.resolve(null),closed:true,lastSent:0},queue=Promise.resolve(),board=null,status='guest',message=MESSAGES.HL_SIGN_IN_REQUIRED;
  const account=()=>!!(cloud?.active&&cloud.ready&&cloud.client);
  const rpc=async(action,payload)=>{const {data,error}=await cloud.client.rpc('hl_scores',{p_action:action,p_payload:payload});if(error)throw error;return data;};
  const fail=error=>{const text=scoreError(error);status=/Sign in/.test(text)?'guest':'offline';message=text;return null;};
  const ready=()=>{if(!account()){fail('HL_SIGN_IN_REQUIRED');return false;}if(!online()){fail('offline');return false;}return true;};
  const accept=data=>{board=data;status='posted';message='';return data;};
  // Each run keeps its own server id, so a restart never loses the previous run's final submission.
  function start(){const next={id:null,closed:false,lastSent:0};run=next;if(!ready()){next.id=Promise.resolve(null);return next.id;}
    const ask=()=>rpc('start',{game});
    next.id=ask().catch(error=>/HL_SCORE_RATE_LIMIT/.test(String(error?.message))?wait(3100).then(ask):Promise.reject(error))
      .then(data=>{if(run===next){status='ready';message='';}return data.runId;}).catch(error=>{fail(error);return null;});
    return next.id;}
  // Calls are queued so a final submission never overtakes an earlier one; the server allows one every 2 seconds per run.
  function submit(score,details={},{final=false}={}){const mine=run;if(mine.closed)return Promise.resolve(null);if(final)mine.closed=true;
    const job=queue.then(async()=>{if(!ready())return null;const runId=await mine.id;if(!runId)return null;
      const gap=2100-(now()-mine.lastSent);if(gap>0)await wait(gap);
      try{const data=await rpc('submit',{runId,score:Math.round(score),details,nickname:safeName(cloud.displayName),final});mine.lastSent=now();return accept(data);}
      catch(error){mine.lastSent=now();if(/HL_SCORE_CLOSED|HL_SCORE_RUN/.test(String(error?.message)))mine.closed=true;return fail(error);}});
    queue=job.catch(()=>{});return job;}
  async function load(limit=10){if(!ready())return null;try{return accept(await rpc('board',{game,limit}));}catch(error){return fail(error);}}
  return {start,submit,load,get board(){return board;},get status(){return status;},get message(){return message;},get posted(){return run.closed;}};
}

// Plain HTML for an in-game overlay. Names come from other players, so everything is escaped.
export function leaderboardHtml(run,{limit=5,title='Barn leaderboard'}={}){
  const data=run?.board,rows=(data?.top||[]).slice(0,limit);
  if(!rows.length)return `<div class="score-board empty"><b>${escape(title)}</b><span>${escape(run?.message||(run?.status==='ready'?'Posting your score…':'No scores yet. Be the first!'))}</span></div>`;
  const mine=data.me&&!rows.some(r=>r.you)?`<li class="you more"><i>${data.me.rank}</i><span>You</span><em>${Number(data.me.score).toLocaleString()}</em></li>`:'';
  return `<div class="score-board"><b>${escape(title)}</b><ol>${rows.map(r=>`<li${r.you?' class="you"':''}><i>${r.rank}</i><span>${escape(r.name)}${r.you?' (you)':''}</span><em>${Number(r.score).toLocaleString()}</em></li>`).join('')}${mine}</ol>${run.message?`<span>${escape(run.message)}</span>`:''}</div>`;
}
