import * as THREE from "three";

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

  ctx.fillStyle = "#ff3333";
  ctx.beginPath();
  ctx.moveTo(256, 100);
  ctx.lineTo(180, 250);
  ctx.lineTo(332, 250);
  ctx.closePath();
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}