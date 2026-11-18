import assert from 'node:assert/strict';import * as T from '../dist/vendor/three-0.180.0/three.module.js';import {makeChibiHorse,makeChibiAvatar} from '../dist/chibi-models.js';
for(const detail of [0,1]){const geometries=new Set(),materials=new Set(),kit={detail,geometry:g=>(geometries.add(g),g),material:(color,extra)=>{const m=new T.MeshStandardMaterial({color,...extra});materials.add(m);return m;}};
 for(const id of ['willow','atlas','sunny']){const model=makeChibiHorse(T,{id},kit);assert.equal(model.legs.length,4);assert.ok(model.head&&model.tail&&model.anchor);const bounds=new T.Box3().setFromObject(model.root);assert.ok(bounds.min.y>-.06);assert.ok(bounds.max.y>3&&bounds.max.y<4.5);assert.ok(model.root.userData.characterAsset.triangles<(detail?8000:2100));assert.ok([...materials].every(m=>m.flatShading===false));}
 const avatar=makeChibiAvatar(T,kit);assert.equal(avatar.legs.length,2);assert.equal(avatar.arms.length,2);assert.ok(avatar.root.userData.characterAsset.triangles<(detail?4300:1200));geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
// Player character (chibi-character.js): ~2 units tall, soles on the ground, about 4.5-5 heads, hips at the saddle seat,
// every joint handle present, and a phone budget for every outfit x hair style (ink hulls reuse the same geometry).
{const {makeChibiCharacter}=await import('../dist/chibi-character.js');const {OUTFITS,HAIR_STYLES,DEFAULT_LOOK}=await import('../dist/character-looks.mjs');
 for(const o of OUTFITS)for(const [hair] of HAIR_STYLES){const c=makeChibiCharacter(T,{...DEFAULT_LOOK,outfit:o.id,hair});c.root.updateMatrixWorld(true);
  const b=new T.Box3().setFromObject(c.root,true);assert.ok(b.max.y>1.82&&b.max.y<2.25,o.id+' height');assert.ok(Math.abs(b.min.y)<.03,o.id+' grounded');
  for(const k of ['legs','knees','feet','arms','elbows','hands'])assert.equal(c[k].length,2,k);assert.ok(c.hips&&c.torso&&c.neck&&c.head);assert.equal(c.seatOffset(),-c.hips.position.y);
  const skull=new T.Box3();c.head.children[0].geometry.computeBoundingBox();skull.copy(c.head.children[0].geometry.boundingBox).applyMatrix4(c.head.children[0].matrixWorld);
  const heads=b.max.y/(skull.max.y-skull.min.y);assert.ok(heads>4.2&&heads<5.2,o.id+' heads tall '+heads.toFixed(2));
  let tris=0;c.root.traverse(m=>{if(m.isMesh&&m.material.side!==T.BackSide){const g=m.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3;}});assert.ok(tris<9000,o.id+'/'+hair+' triangles '+tris);
  for(const pose of ['walk','ride','stand'])c.update(.1,{pose});c.dispose();}
 // Every hair style with ombré tips and full makeup also builds (vertex-coloured hair path) and stays grounded.
 for(const [hair] of HAIR_STYLES){const c=makeChibiCharacter(T,{...DEFAULT_LOOK,hair,hairTip:'#e05a8a',blush:'#f2a07a',eyeshadow:'#9fc8e8',lips:'#d9506a',liner:'winged',freckles:true,mole:true,noseSize:'l',nose:'button'});
  c.root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(c.root,true);assert.ok(b.max.y<2.25,hair+' top');c.dispose();}}
console.log('PASS: grounded round chibi horses/rider, animation rigs, smooth materials, mobile/full-detail geometry budgets; player character ~4.7 heads tall, grounded, all joints, every outfit x hair under budget.');
