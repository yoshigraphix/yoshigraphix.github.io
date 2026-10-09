export const FEET_PER_METER = 1 / 0.3048;
export function waterMetrics(groundMeters, baselineFeet, riseFeet) {
    const ground = groundMeters * FEET_PER_METER;
    const water = baselineFeet + riseFeet;
    return { ground, water, threshold: ground - baselineFeet, difference: water - ground };
}
// Clip a triangle against z <= water, then flatten the submerged polygon to the water surface.
export function waterPolygon(triangle, water) {
    const result = [];
    for (let i = 0; i < triangle.length; i++) {
        const a = triangle[i], b = triangle[(i + 1) % triangle.length];
        if (a.z <= water) result.push({ x: a.x, y: a.y, z: water });
        if ((a.z <= water) !== (b.z <= water)) {
            const t = (water - a.z) / (b.z - a.z);
            result.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), z: water });
        }
    }
    return result;
}
