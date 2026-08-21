import * as THREE from "three";

// Sorts points by angle around their shared centroid, so connecting them
// in order forms a clean polygon instead of a self-intersecting bowtie.
// Proven standalone before this ever touched real code.
export function sortPointsAngularly(points: THREE.Vector3[]): THREE.Vector3[] {
  const centroid = new THREE.Vector3();
  points.forEach((p) => centroid.add(p));
  centroid.divideScalar(points.length);

  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
    const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
    return angleA - angleB;
  });
}