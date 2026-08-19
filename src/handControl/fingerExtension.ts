import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export const FINGER_TIPS = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky
const FINGER_MCPS = [2, 5, 9, 13, 17];
const WRIST = 0;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;

function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Angle at point b, formed by the lines b->a and b->c, in degrees.
// A straight thumb reads close to 180°; a curled one bends well under that.
function angleAt(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);
  const cos = dot / (mag1 * mag2);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

export function getExtendedFingers(hand: NormalizedLandmark[]): Set<number> {
  const wrist = hand[WRIST];
  const extended = new Set<number>();

  // Fingers 2-5 (index, middle, ring, pinky) — wrist-distance check, this is working correctly
  FINGER_TIPS.slice(1).forEach((tipIdx, i) => {
    const mcpIdx = FINGER_MCPS[i + 1];
    const tipDist = distance(hand[tipIdx], wrist);
    const mcpDist = distance(hand[mcpIdx], wrist);
    if (tipDist > mcpDist * 1.2) {
      extended.add(tipIdx);
    }
  });

  // Thumb — angle-based check instead, since its motion is fundamentally different
      // Thumb — distance from tip to index knuckle, normalized by hand size.
  // Tucked-fist thumb sits close to the index knuckle; extended thumb sits
  // far from it. This tracks the real motion (sideways rotation across the
  // palm), which the IP-joint angle couldn't see.
  const INDEX_MCP = 5;
  const MIDDLE_MCP = 9;
  const handSizeRef = distance(hand[WRIST], hand[MIDDLE_MCP]); // normalizes for hand distance from camera
  const thumbToIndexKnuckle = distance(hand[THUMB_TIP], hand[INDEX_MCP]) / handSizeRef;

  if (Math.random() < 0.05) {
    console.log(`Thumb-to-knuckle distance: ${thumbToIndexKnuckle.toFixed(2)}`);
  }

  const THUMB_TUCKED_THRESHOLD = 0.4; // starting guess — we'll tune with real numbers
  if (thumbToIndexKnuckle > THUMB_TUCKED_THRESHOLD) {
    extended.add(THUMB_TIP);
  }

  return extended;
}