'use strict';
(() => {
  const limits={inputBytes:3*1024*1024,outputBytes:300*1024,maxSourceEdge:4096,maxSourcePixels:12000000,maxWidth:1600,maxHeight:900,minWidth:640,minHeight:360};
  const be16=(a,i)=>(a[i]<<8)|a[i+1], le24=(a,i)=>a[i]|(a[i+1]<<8)|(a[i+2]<<16);
  function inspect(bytes){
    const a=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);let width,height,type;
    if(a.length>=24&&a[0]===137&&a[1]===80&&a[2]===78&&a[3]===71&&a[4]===13&&a[5]===10&&a[6]===26&&a[7]===10){const v=new DataView(a.buffer,a.byteOffset,a.byteLength);width=v.getUint32(16);height=v.getUint32(20);type='image/png';}
    else if(a.length>10&&a[0]===255&&a[1]===216&&a[2]===255){type='image/jpeg';let i=2;while(i<a.length-8){if(a[i++]!==255)continue;while(a[i]===255)i++;const marker=a[i++];if(marker===217||marker===218)break;if(marker===216||marker===1||(marker>=208&&marker<=215))continue;const size=be16(a,i);if(size<2||i+size>a.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=be16(a,i+3);width=be16(a,i+5);break;}i+=size;}}
    else if(a.length>=30&&String.fromCharCode(...a.slice(0,4))==='RIFF'&&String.fromCharCode(...a.slice(8,12))==='WEBP'){
      type='image/webp';const format=String.fromCharCode(...a.slice(12,16));
      if(format==='VP8X'){if(a[20]&2)throw Error('Choose a still image; animated WebP is not supported.');width=1+le24(a,24);height=1+le24(a,27);}
      else if(format==='VP8 '&&a[23]===157&&a[24]===1&&a[25]===42){width=(a[26]|a[27]<<8)&16383;height=(a[28]|a[29]<<8)&16383;}
      else if(format==='VP8L'&&a[20]===47){width=1+(a[21]|(a[22]&63)<<8);height=1+((a[22]>>6)|(a[23]<<2)|(a[24]&15)<<10);}
    }
    if(!type||!width||!height)throw Error('Choose a valid JPG, PNG, or still WebP image. SVG and GIF files are not supported.');
    return {width,height,type};
  }
  function validate(info,size,stored=false){
    if(size>(stored?limits.outputBytes:limits.inputBytes))throw Error(stored?'The optimized background must be 300 KB or less.':'That file is too large. Choose an image up to 3 MB.');
    if(info.width>limits.maxSourceEdge||info.height>limits.maxSourceEdge||info.width*info.height>limits.maxSourcePixels)throw Error('Choose an image no larger than 4096 pixels on either side and 12 megapixels total.');
    if(!stored&&(info.width<limits.minWidth||info.height<limits.minHeight))throw Error('Choose an image at least 640 × 360 pixels. A landscape image works best.');
    if(stored&&(info.width>limits.maxWidth||info.height>limits.maxHeight||!['image/webp','image/jpeg'].includes(info.type)))throw Error('The saved background must be JPG or WebP and no larger than 1600 × 900 pixels.');
    return info;
  }
  function crop(width,height,x=50,y=50,zoom=1){
    x=Math.min(100,Math.max(0,Number(x)));y=Math.min(100,Math.max(0,Number(y)));zoom=Math.min(2.5,Math.max(1,Number(zoom)));
    const w=Math.min(width,height*16/9)/zoom,h=w*9/16;
    return {x:(width-w)*x/100,y:(height-h)*y/100,width:w,height:h};
  }
  window.HorselandiaImages={limits,inspect,validate,crop};
  const $=s=>document.querySelector(s), kb=b=>Math.round(b/1024)+' KB';
  let dbPromise,record=null,owner=null,objectURL=null,loadId=0,bitmap=null,sourceInfo=null,editorId=0,saving=false,syncBusy=false;
  function openDB(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('horselandia-backgrounds',1);req.onupgradeneeded=()=>req.result.createObjectStore('backgrounds',{keyPath:'owner'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(Error('Background storage is unavailable in this browser.'));});return dbPromise;}
  async function get(key){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction('backgrounds').objectStore('backgrounds').get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
  async function put(value){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('backgrounds','readwrite');tx.objectStore('backgrounds').put(value);tx.oncomplete=resolve;tx.onerror=()=>reject(Error('Could not save the background. Your existing background is unchanged.'));});}
  const ownerKey=()=>window.MeadowCloud?.user?.id||'guest';
  function revoke(){if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}}
  function paint(){
    const img=$('#stable-background-image'),label=$('#stable-background-status');if(!img)return;
    if(record?.blob&&!record.removed){if(!objectURL)objectURL=URL.createObjectURL(record.blob);img.src=objectURL;img.alt='Your custom stable background';if(label)label.textContent=`Your background · ${record.width} × ${record.height} · ${kb(record.blob.size)} · ${record.pending?'Device saved; cloud pending':owner==='guest'?'Saved on this device':'Saved to your account'}`;}
    else{img.src='assets/meadow.webp';img.alt='A sunny meadow with horses grazing by the barn';if(label)label.textContent='Meadow background · Included';}
  }
  async function attach(force=false){
    const next=ownerKey();if(owner===next&&!force){paint();return;}owner=next;record=null;revoke();paint();const generation=++loadId;
    try{const found=await get(next);if(generation!==loadId)return;record=found;paint();await sync(true);}catch{if(generation===loadId){const label=$('#stable-background-status');if(label)label.textContent='Default background · Device image storage is unavailable';}}
  }
  async function sync(download=false){
    const cloud=window.MeadowCloud;if(syncBusy||!cloud?.active||!cloud.client||!navigator.onLine||owner!==cloud.user.id)return;
    syncBusy=true;const key=owner,generation=loadId;
    try{
      const bucket=cloud.client.storage.from('stable-backgrounds'),path=key+'/background';
      if(record?.pending){
        const current=record;
        const result=current.removed?await bucket.remove([path]):await bucket.upload(path,current.blob,{upsert:true,contentType:current.blob.type,cacheControl:'60'});
        if(result.error)throw result.error;
        current.pending=false;current.synced=true;await put(current);
        if(generation===loadId&&record===current){record=current;paint();}
      }else if(download){
        const result=await bucket.download(path);
        if(result.error){if(String(result.error.statusCode)==='404'||/object not found/i.test(result.error.message||'')){if(generation===loadId){record={owner:key,removed:true,pending:false};await put(record);revoke();paint();}}return;}
        const blob=result.data,info=validate(inspect(await blob.arrayBuffer()),blob.size,true);
        if(generation!==loadId||record?.pending)return;
        record={owner:key,blob,width:info.width,height:info.height,pending:false,synced:true,modifiedAt:Date.now()};await put(record);revoke();paint();
      }
    }catch{if(generation===loadId&&record?.pending){const label=$('#stable-background-status');if(label)label.textContent='Background saved on this device · Cloud image storage is not ready';}}
    finally{syncBusy=false;}
  }
  function cleanupEditor(){editorId++;bitmap?.close?.();bitmap=null;sourceInfo=null;saving=false;}
  function openEditor(){
    cleanupEditor();window.openModal('Make this stable yours.',`<div class="background-editor"><p class="modal-p">Add a landscape behind your stable. Your horses and stalls stay in place.</p><label class="background-picker" for="stable-image-file"><span>Choose a background image</span><small>JPG, PNG or still WebP · Up to 3 MB</small><input id="stable-image-file" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="background-limits">Minimum 640 × 360 pixels. Maximum 4096 pixels per side and 12 MP. We crop to 16:9 and save a compressed image up to <b>1600 × 900 pixels and 300 KB</b>.</p><div id="background-crop-panel" hidden><div class="background-preview"><canvas id="background-canvas" width="800" height="450" aria-label="Background crop preview"></canvas><span>16:9 crop preview</span></div><div class="crop-controls"><label>Move left / right<input type="range" id="background-x" min="0" max="100" value="50"></label><label>Move up / down<input type="range" id="background-y" min="0" max="100" value="50"></label><label>Zoom<input type="range" id="background-zoom" min="1" max="2.5" step="0.05" value="1"></label></div><p id="background-source-info" class="small"></p></div><p id="background-error" class="error-text" role="alert"></p><p class="small">${ownerKey()==='guest'?'This demo saves your optimized image on this device.':'Saved privately for this account; cloud upload requires configured image storage.'} Original files are never uploaded.</p><div class="form-actions background-actions">${record?.blob&&!record.removed?'<button class="secondary" data-background="remove">Use default landscape</button>':''}<button class="secondary" data-action="close-modal">Cancel</button><button class="primary" data-background="save" id="save-background" disabled>Save background</button></div></div>`);
  }
  function drawPreview(){if(!bitmap)return;const canvas=$('#background-canvas');if(!canvas)return;const area=crop(bitmap.width,bitmap.height,$('#background-x').value,$('#background-y').value,$('#background-zoom').value),ctx=canvas.getContext('2d');ctx.drawImage(bitmap,area.x,area.y,area.width,area.height,0,0,canvas.width,canvas.height);}
  async function loadFile(file){
    const id=++editorId;bitmap?.close?.();bitmap=null;$('#save-background').disabled=true;$('#background-crop-panel').hidden=true;$('#background-error').textContent='';if(!file)return;
    try{
      if(file.size>limits.inputBytes)throw Error('That file is too large. Choose an image up to 3 MB.');
      const bytes=await file.arrayBuffer();const info=validate(inspect(bytes),file.size);
      const image=await createImageBitmap(new Blob([bytes],{type:info.type}),{imageOrientation:'from-image'});
      if(id!==editorId){image.close?.();return;}
      validate({width:image.width,height:image.height,type:info.type},file.size);bitmap=image;sourceInfo={...info,width:image.width,height:image.height,size:file.size};
      for(const [sel,value]of [['#background-x',50],['#background-y',50],['#background-zoom',1]])$(sel).value=value;
      $('#background-crop-panel').hidden=false;$('#background-source-info').textContent=`Original: ${sourceInfo.width} × ${sourceInfo.height} · ${kb(file.size)}. Only the compressed crop will be saved.`;$('#save-background').disabled=false;drawPreview();
    }catch(error){if(id===editorId)$('#background-error').textContent=error.message;}
  }
  const toBlob=(canvas,type,quality)=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('This browser could not encode the image.')),type,quality));
  async function encode(){
    const area=crop(bitmap.width,bitmap.height,$('#background-x').value,$('#background-y').value,$('#background-zoom').value);
    for(const maxWidth of [1600,1280,1024,800]){
      const canvas=document.createElement('canvas');canvas.width=Math.min(maxWidth,Math.floor(area.width));canvas.height=Math.max(1,Math.round(canvas.width*9/16));
      canvas.getContext('2d').drawImage(bitmap,area.x,area.y,area.width,area.height,0,0,canvas.width,canvas.height);
      for(const quality of [.85,.74,.62,.50]){
        let blob=await toBlob(canvas,'image/webp',quality);
        if(blob.type!=='image/webp')blob=await toBlob(canvas,'image/jpeg',quality);
        if(blob.size<=limits.outputBytes){validate(inspect(await blob.arrayBuffer()),blob.size,true);return {blob,width:canvas.width,height:canvas.height};}
      }
    }
    throw Error('This image could not fit within 300 KB. Try a simpler image.');
  }
  async function saveImage(){
    if(!bitmap||saving)return;saving=true;const id=editorId,key=ownerKey();$('#save-background').disabled=true;$('#save-background').textContent='Optimizing…';
    try{const optimized=await encode();if(id!==editorId)return;if(key!==ownerKey())throw Error('Your account changed. Choose the background again.');
      const next={owner:key,...optimized,pending:key!=='guest',modifiedAt:Date.now()};await put(next);record=next;revoke();paint();$('#modal').close();window.toast(`Background saved: ${optimized.width} × ${optimized.height}, ${kb(optimized.blob.size)}.`);void sync();
    }catch(error){if(id===editorId){$('#background-error').textContent=error.message;$('#save-background').disabled=false;$('#save-background').textContent='Save background';}}finally{saving=false;}
  }
  document.addEventListener('click',async event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.action==='stable-background')openEditor();if(button.dataset.background==='save')await saveImage();if(button.dataset.background==='remove'){const next={owner:ownerKey(),removed:true,pending:ownerKey()!=='guest',modifiedAt:Date.now()};try{await put(next);record=next;revoke();paint();$('#modal').close();window.toast('The included hillside is back.');void sync();}catch(error){$('#background-error').textContent=error.message;}}});
  document.addEventListener('change',event=>{if(event.target.id==='stable-image-file')void loadFile(event.target.files?.[0]);});
  document.addEventListener('input',event=>{if(['background-x','background-y','background-zoom'].includes(event.target.id))drawPreview();});
  window.addEventListener('online',()=>void sync(true));
  window.addEventListener('DOMContentLoaded',()=>$('#modal').addEventListener('close',cleanupEditor));
  window.HorselandiaBackgrounds={attach,sync};
})();
