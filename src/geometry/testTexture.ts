import * as THREE from "three";

// Draws a checkerboard grid on a canvas and returns it as a texture.
// Pure test pattern — no real image needed, purely to verify UV mapping
// works correctly on our custom-twisted geometry before using a real photo.
export function createTestTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  const squares = 8;
  const size = canvas.width / squares;

  for (let y = 0; y < squares; y++) {
    for (let x = 0; x < squares; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#ffffff" : "#3366ff";
      ctx.fillRect(x * size, y * size, size, size);
    }
  }

  // Draw a big arrow-like triangle so we can also confirm orientation
  // (not just distortion) — tells us instantly if it's flipped/rotated wrong
  ctx.fillStyle = "#ff3333";
  ctx.beginPath();
  ctx.moveTo(256, 100);
  ctx.lineTo(180, 250);
  ctx.lineTo(332, 250);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}