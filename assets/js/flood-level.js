import { FEET_PER_METER, waterMetrics, waterPolygon } from './flood-math.mjs';
const $ = id => document.getElementById(id);
const canvas = $('terrain'), ctx = canvas.getContext('2d');
const controls = ['rise', 'baseline', 'rotation', 'tilt'];
let data, points, triangles, lowest, highest;
const fmt = value => `${Math.round(value).toLocaleString()} ft`;
function draw() {
    if (!data) return;
    const baseline = Number($('baseline').value), rise = Number($('rise').value);
    if ($('baseline').value.trim() === '' || !Number.isFinite(baseline) || Math.abs(baseline) > 50000) {
        $('status').textContent = 'Enter a finite reference elevation between −50,000 and 50,000 feet.';
        ['water-elevation','threshold','difference'].forEach(id => $(id).textContent = '—');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    const metrics = waterMetrics(data.heights[(data.heights.length - 1) / 2], baseline, rise);
    $('rise-value').textContent = rise.toFixed(1);
    $('water-elevation').textContent = fmt(metrics.water);
    $('ground-elevation').textContent = fmt(metrics.ground);
    $('threshold').textContent = metrics.threshold > 0 ? `+${fmt(metrics.threshold)}` : `Reference already at/above ground`;
    $('difference').textContent = `${fmt(Math.abs(metrics.difference))} ${metrics.difference >= 0 ? 'above' : 'below'} ground`;
    $('status').textContent = '3× vertical exaggeration · White ring: half-mile boundary · N: north · Reference is not an observed river level.';
    if (!ctx) { $('status').textContent = 'Canvas is unavailable; use the elevation readouts.'; return; }
    const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const angle = Number($('rotation').value) * Math.PI / 180;
    const tilt = Number($('tilt').value) * Math.PI / 180;
    const scale = Math.min(w * .44, h * .40) / data.radiusMeters;
    const project = p => {
        const x = p.x * Math.cos(angle) - p.y * Math.sin(angle);
        const y = p.x * Math.sin(angle) + p.y * Math.cos(angle);
        const z = (p.z - lowest) * 3;
        return { x: w / 2 + x * scale, y: h * .58 + (y * Math.sin(tilt) - z * Math.cos(tilt)) * scale, depth: y * Math.cos(tilt) + z * Math.sin(tilt) };
    };
    const water = metrics.water / FEET_PER_METER;
    const faces = [];
    for (const tri of triangles) {
        const mean = tri.reduce((sum, p) => sum + p.z, 0) / 3;
        const t = (mean - lowest) / Math.max(1, highest - lowest);
        faces.push({ vertices: tri.map(project), color: `hsl(${145 - t * 55} 24% ${28 + t * 27}%)` });
        const wet = waterPolygon(tri, water);
        if (wet.length >= 3) faces.push({ vertices: wet.map(project), color: '#439caf' });
    }
    faces.forEach(f => f.depth = f.vertices.reduce((sum, p) => sum + p.depth, 0) / f.vertices.length);
    faces.sort((a,b) => a.depth - b.depth);
    for (const face of faces) {
        ctx.beginPath(); face.vertices.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
        ctx.closePath(); ctx.fillStyle = face.color; ctx.fill(); ctx.strokeStyle = face.color; ctx.lineWidth = .45; ctx.stroke();
    }
    // Boundary and center are annotation overlays, kept visible above the terrain.
    ctx.beginPath();
    for (let i=0;i<=180;i++) {
        const theta=i/180*Math.PI*2, x=Math.cos(theta)*data.radiusMeters, y=Math.sin(theta)*data.radiusMeters;
        const c=Math.max(0,Math.min(data.size-1,Math.round((x/data.radiusMeters+1)/2*(data.size-1))));
        const r=Math.max(0,Math.min(data.size-1,Math.round((y/data.radiusMeters+1)/2*(data.size-1))));
        const p=project({x,y,z:data.heights[r*data.size+c]});
        i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y);
    }
    ctx.strokeStyle='#dce8d18a'; ctx.lineWidth=1; ctx.stroke();
    const center=project(points[(points.length-1)/2]);
    ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.lineTo(center.x,center.y-24);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.arc(center.x,center.y-27,4,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
    ctx.font='12px system-ui';ctx.fillText('Center',center.x+9,center.y-24);
    const north=project({x:0,y:-data.radiusMeters,z:data.heights[Math.floor(data.size/2)]});
    ctx.fillText('N',north.x-4,north.y-12);
}
async function init() {
    try {
        const response = await fetch('../assets/data/flood-terrain.json');
        if (!response.ok) throw new Error('Elevation data unavailable');
        data = await response.json();
        if (!Number.isInteger(data.size) || data.size % 2 !== 1 || data.heights.length !== data.size ** 2 || !data.heights.every(Number.isFinite)) throw new Error('Invalid terrain grid');
        points = data.heights.map((z,i) => ({x:(i%data.size/(data.size-1)*2-1)*data.radiusMeters,y:(Math.floor(i/data.size)/(data.size-1)*2-1)*data.radiusMeters,z}));
        triangles=[];
        for(let r=0;r<data.size-1;r++) for(let c=0;c<data.size-1;c++) {
            const i=r*data.size+c;
            for(const ids of [[i,i+1,i+data.size],[i+1,i+data.size+1,i+data.size]]) {
                const tri=ids.map(j=>points[j]);
                if(tri.every(p=>Math.hypot(p.x,p.y)<=data.radiusMeters)) triangles.push(tri);
            }
        }
        const inside=points.filter(p=>Math.hypot(p.x,p.y)<=data.radiusMeters).map(p=>p.z);
        lowest=Math.min(...inside); highest=Math.max(...inside);
        $('baseline').value=(lowest*FEET_PER_METER).toFixed(1);
        $('baseline').disabled=false; $('rise').disabled=false;
        $('location-detail').textContent=`Center: ${data.center[0].toFixed(6)}, ${data.center[1].toFixed(6)}. Radius: 804.672 m (½ mile). Grid spacing: approximately ${Math.round(data.spacingMeters)} m. Vertical datum not verified for this crop.`;
        draw();
    } catch(error) {
        data=null;
        $('status').textContent='Could not load the terrain. Reload the page from a web server to try again. Water controls are unavailable.';
        console.error(error);
    }
}
controls.forEach(id=>$(id).addEventListener('input',draw));
$('reset-view').addEventListener('click',()=>{$('rotation').value=-25;$('tilt').value=40;draw();});
new ResizeObserver(draw).observe(canvas);
init();
