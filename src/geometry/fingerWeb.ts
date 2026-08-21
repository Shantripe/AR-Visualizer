import * as THREE from "three";

// Builds a fan-shaped mesh: one center vertex plus one vertex per tracked
// finger, triangulated between them. Designed so adding a 4th or 5th
// finger later just means changing how many points you pass in — no
// rewrite needed.
export function createFingerWebGeometry(numFingers: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertexCount = numFingers + 1;
  const positions = new Float32Array(vertexCount * 3);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);

  // UVs assigned once at creation, based on an even circular layout —
  // these stay FIXED even as positions move every frame. That's
  // intentional: each vertex keeps its assigned patch of the image,
  // while the actual triangle shapes stretch to match your real hand
  // pose. This is what makes the texture distort with your gesture
  // instead of just sitting static underneath it.
  const uvs = new Float32Array(vertexCount * 2);
  uvs[0] = 0.5;
  uvs[1] = 0.5; // center vertex maps to the middle of the image
  for (let i = 0; i < numFingers; i++) {
    const angle = (i / numFingers) * Math.PI * 2;
    uvs[(i + 1) * 2] = Math.cos(angle) * 0.5 + 0.5;
    uvs[(i + 1) * 2 + 1] = Math.sin(angle) * 0.5 + 0.5;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

  const indices: number[] = [];
  for (let i = 0; i < numFingers; i++) {
    const next = (i + 1) % numFingers;
    indices.push(0, i + 1, next + 1);
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