// Your own pictures in the stall's picture frames. Tap a framed picture in the stall to see it full screen;
// from there you can put your own photo in that frame (or go back to the painting).
// The photo is shrunk and compressed on the device to 300 KB or less (WebP, else JPEG) and kept in IndexedDB,
// one per wall spot. Nothing is uploaded yet: showing it to visitors needs server storage (see CLAUDE.md).
const DB='trottville-stall-photos',STORE='photos',MAX_IN=20*1024*1024,MAX_OUT=300*1024;
let dbp=null;
function db(){if(!dbp)dbp=new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'slot'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(Error('Picture storage is unavailable in this browser.'));});return dbp;}
const tx=async(mode,fn)=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction(STORE,mode),out=fn(t.objectStore(STORE));t.oncomplete=()=>res(out.result);t.onerror=()=>rej(t.error||Error('Could not save the picture.'));});};

// {slot: ImageBitmap} for every saved photo. Never throws: no storage just means no photos.
export async function loadPhotos(){try{const all=await tx('readonly',s=>s.getAll());const out={};
  for(const r of all||[]){try{out[r.slot]={bitmap:await createImageBitmap(r.blob),size:r.size,blob:r.blob};}catch{}}return out;}catch{return {};}}
export async function clearPhoto(slot){await tx('readwrite',s=>s.delete(slot));}

const toBlob=(c,type,q)=>new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(Error('This browser could not compress the picture.')),type,q));
// Shrink + compress a picked file to ≤300 KB and save it for this wall spot. Returns {bitmap,size,blob}.
export async function savePhoto(slot,file){
  if(!file)throw Error('No picture chosen.');
  if(!/^image\/(jpeg|png|webp|heic|heif|avif)$/i.test(file.type||'')&&!/\.(jpe?g|png|webp|heic|avif)$/i.test(file.name||''))throw Error('Choose a photo (JPG, PNG or WebP).');
  if(file.size>MAX_IN)throw Error('That file is over 20 MB. Choose a smaller photo.');
  let src;try{src=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw Error('That picture could not be opened. Try a JPG or PNG.');}
  try{for(const edge of [1600,1280,1024,800,640]){const k=Math.min(1,edge/Math.max(src.width,src.height)),c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(src.width*k));c.height=Math.max(1,Math.round(src.height*k));c.getContext('2d').drawImage(src,0,0,c.width,c.height);
      for(const q of [.82,.7,.58,.46]){let b=await toBlob(c,'image/webp',q);if(b.type!=='image/webp')b=await toBlob(c,'image/jpeg',q);
        if(b.size<=MAX_OUT){await tx('readwrite',s=>s.put({slot,blob:b,size:b.size,width:c.width,height:c.height,at:Date.now()}));return {bitmap:await createImageBitmap(b),size:b.size,blob:b};}}}
    throw Error('That picture would not fit in 300 KB. Try a simpler one.');}
  finally{src.close?.();}}

// Full-screen viewer (an in-app layer, never a native dialog). show({title,image,canEdit,hasPhoto,onPick,onReset}).
// image: a canvas or an object URL string.
let layer=null;
export function closePhotoView(){if(!layer)return;const l=layer;layer=null;l.dispatchEvent(new Event('hh-close'));l.remove();document.removeEventListener('keydown',onKey);}
function onKey(e){if(e.key==='Escape')closePhotoView();}
export function showPhotoView({title,image,canEdit=true,hasPhoto=false,onPick,onReset,onShop}){
  closePhotoView();layer=document.createElement('div');layer.className='hh-photo';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label',title);
  layer.innerHTML=`<div class="hh-photo-frame"></div><div class="hh-photo-bar"><span class="hh-photo-title"></span>
    ${canEdit?`<label class="hh-photo-btn hh-photo-pick"><input type="file" accept="image/*" hidden><span aria-hidden="true">📷</span> ${hasPhoto?'Change picture':'Use my picture'}</label>
    ${onShop?'<button type="button" class="hh-photo-btn hh-photo-shop"><span aria-hidden="true">🖼️</span> Pick a painting</button>':''}
    ${hasPhoto?'<button type="button" class="hh-photo-btn hh-photo-reset">Back to the painting</button>':''}`:''}
    <button type="button" class="hh-photo-btn hh-photo-close" aria-label="Close">✕</button></div><p class="hh-photo-note" role="status"></p>`;
  layer.querySelector('.hh-photo-title').textContent=title;
  const frame=layer.querySelector('.hh-photo-frame'),note=layer.querySelector('.hh-photo-note');
  if(typeof image==='string'){const img=new Image();img.alt=title;img.src=image;frame.append(img);}else if(image){image.setAttribute('role','img');image.setAttribute('aria-label',title);frame.append(image);}
  note.textContent=canEdit?(hasPhoto?'Your photo, saved on this device (300 KB or less).':'Pick a painting from the store, or put your own photo in this frame (up to 20 MB; it is shrunk to 300 KB or less).'):'';
  layer.querySelector('.hh-photo-close').addEventListener('click',closePhotoView);
  layer.addEventListener('click',e=>{if(e.target===layer||e.target===frame)closePhotoView();});
  const input=layer.querySelector('input[type=file]');
  input?.addEventListener('change',async()=>{const f=input.files?.[0];if(!f)return;note.textContent='Shrinking your picture…';note.classList.remove('err');
    try{const kb=await onPick(f);note.textContent=`Saved (${kb} KB).`;}catch(err){note.textContent=err.message||'Could not use that picture.';note.classList.add('err');}input.value='';});
  layer.querySelector('.hh-photo-reset')?.addEventListener('click',()=>onReset?.());
  layer.querySelector('.hh-photo-shop')?.addEventListener('click',()=>onShop?.());
  document.body.append(layer);document.addEventListener('keydown',onKey);layer.querySelector('.hh-photo-close').focus();return layer;}
