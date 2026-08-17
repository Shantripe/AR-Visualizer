import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";

const THUMB_TIP = 4;
const INDEX_TIP = 8;

// Measures pinch distance (thumb to index finger) and maps it to a 0-1
// foldAmount. Closed pinch = flat (0), fingers spread = fully twisted (1).
// minDist/maxDist may need tuning by feel once you test it.
export function mapHandToFoldAmount(results: HandLandmarkerResult): number | null {
  if (!results.landmarks || results.landmarks.length === 0) return null;

  const hand = results.landmarks[0];
  const thumb = hand[THUMB_TIP];
  const index = hand[INDEX_TIP];

  const dx = thumb.x - index.x;
  const dy = thumb.y - index.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const minDist = 0.04;
  const maxDist = 0.45;
  const clamped = Math.min(Math.max(distance, minDist), maxDist);
  return (clamped - minDist) / (maxDist - minDist);
}