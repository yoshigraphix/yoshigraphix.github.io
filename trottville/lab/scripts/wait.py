# wait until the given prompt ids are finished in ComfyUI; prints status lines; stall alarm after 20 min of no change
import json,sys,time,urllib.request
ids=sys.argv[1:];H='http://127.0.0.1:8188';last=None;t0=time.time();changed=time.time()
while True:
  done={}
  for i in ids:
    h=json.load(urllib.request.urlopen(f'{H}/history/{i}'))
    if i in h: done[i]=h[i]['status'].get('status_str')
  q=json.load(urllib.request.urlopen(H+'/queue'));run=[x[1][:8] for x in q['queue_running']]
  st=(len(done),tuple(run))
  if st!=last: print(time.strftime('%I:%M %p'),'done',len(done),'/',len(ids),done,'running',run,flush=True);last=st;changed=time.time()
  if len(done)==len(ids): break
  if time.time()-changed>1200: print('STALL? no change for 20 min',flush=True);changed=time.time()
  time.sleep(20)
