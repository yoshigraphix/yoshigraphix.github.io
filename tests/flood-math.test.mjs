import test from 'node:test';
import assert from 'node:assert/strict';
import { waterMetrics,waterPolygon,FEET_PER_METER } from '../assets/js/flood-math.mjs';
import { readFileSync } from 'node:fs';
test('feet and meters share a consistent water/ground reference',()=>{
 const m=waterMetrics(30.48,90,12);assert.ok(Math.abs(m.ground-100)<1e-10);assert.ok(Math.abs(m.threshold-10)<1e-10);assert.ok(Math.abs(m.difference-2)<1e-10);
});
test('water clips crossing edges, without covering dry vertices',()=>{
 const tri=[{x:0,y:0,z:0},{x:2,y:0,z:2},{x:0,y:2,z:2}];
 assert.deepEqual(waterPolygon(tri,-1),[]);
 const wet=waterPolygon(tri,1);assert.equal(wet.length,3);assert.ok(wet.every(p=>p.z===1));assert.deepEqual(wet,[{x:0,y:0,z:1},{x:1,y:0,z:1},{x:0,y:1,z:1}]);
 assert.equal(waterPolygon(tri,3).length,3);
});
test('flat terrain and exact equality do not divide by zero',()=>{
 const tri=[{x:0,y:0,z:2},{x:1,y:0,z:2},{x:0,y:1,z:2}];assert.deepEqual(waterPolygon(tri,2),tri);
});
test('bundled data covers the requested center and half-mile radius',()=>{
 const d=JSON.parse(readFileSync(new URL('../assets/data/flood-terrain.json',import.meta.url)));
 assert.deepEqual(d.center,[35.80216497959991,-83.88476899315108]);assert.equal(d.radiusMeters,804.672);assert.equal(d.heights.length,d.size**2);assert.ok(d.heights.every(v=>Number.isFinite(v)&&v>0&&v<1000));assert.ok(d.sources.length>=1);assert.ok(Math.abs(d.radiusMeters*FEET_PER_METER-2640)<1e-9);
});
