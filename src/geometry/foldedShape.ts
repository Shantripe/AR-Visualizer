import * as THREE from "three";

// Builds a twisted ribbon by rotating each cross-section of a flat strip
// around its central axis, more twist toward the ends. This is how a real
// twisted piece of paper behaves — not a bulge, an actual rotation.
export function createFoldedShape(foldAmount: number): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(2, 0.6, 60, 4);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);

    // Twist angle grows toward the ends (x = -1 or 1), maxing at a
    // half-twist (90°) per side at foldAmount = 1
    const twistAngle = x * (Math.PI / 2) * foldAmount;

    // Actual rotation of the (y, z) cross-section around the x-axis —
    // this is what makes it spiral instead of pinch into a lens shape
    const newY = y * Math.cos(twistAngle);
    const newZ = y * Math.sin(twistAngle);

    position.setY(i, newY);
    position.setZ(i, newZ);
  }

  geometry.computeVertexNormals();
  return geometry;
}