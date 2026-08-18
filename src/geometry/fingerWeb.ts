import * as THREE from "three";

// Builds a fan-shaped mesh: one center vertex plus one vertex per tracked
// finger, triangulated between them. Designed so adding a 4th or 5th
// finger later just means changing how many points you pass in — no
// rewrite needed.
export function createFingerWebGeometry(numFingers: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertexCount = numFingers + 1; // center + one per finger
  const positions = new Float32Array(vertexCount * 3);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);

  const indices: number[] = [];
  for (let i = 0; i < numFingers; i++) {
    const next = (i + 1) % numFingers;
    indices.push(0, i + 1, next + 1); // center, this finger, next finger
  }
  geometry.setIndex(indices);

  return geometry;
}

// Called every frame — moves the existing vertices to match current
// finger positions, rather than rebuilding the geometry from scratch.
export function updateFingerWebGeometry(geometry: THREE.BufferGeometry, fingerPositions: THREE.Vector3[]) {
  const position = geometry.attributes.position;

  const centroid = new THREE.Vector3();
  fingerPositions.forEach((p) => centroid.add(p));
  centroid.divideScalar(fingerPositions.length);

  position.setXYZ(0, centroid.x, centroid.y, centroid.z);
  fingerPositions.forEach((p, i) => {
    position.setXYZ(i + 1, p.x, p.y, p.z);
  });

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}