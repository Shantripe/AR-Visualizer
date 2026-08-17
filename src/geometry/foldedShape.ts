import * as THREE from "three";

// Creates the flat, untwisted base shape once.
export function createBaseGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(2, 0.6, 60, 4);
}

// Reshapes an existing geometry's vertices in place based on foldAmount.
// Called every frame — this is why it mutates rather than rebuilds.
export function applyTwist(geometry: THREE.BufferGeometry, foldAmount: number) {
  const position = geometry.attributes.position;

  // Cache the original flat coordinates on first call, so we always twist
  // from the true flat shape rather than compounding twist on top of twist.
  if (!geometry.userData.originalPositions) {
    geometry.userData.originalPositions = position.array.slice();
  }
  const original = geometry.userData.originalPositions as Float32Array;

  for (let i = 0; i < position.count; i++) {
    const x = original[i * 3];
    const y = original[i * 3 + 1];

    const twistAngle = x * (Math.PI / 2) * foldAmount;
    const newY = y * Math.cos(twistAngle);
    const newZ = y * Math.sin(twistAngle);

    position.setY(i, newY);
    position.setZ(i, newZ);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}