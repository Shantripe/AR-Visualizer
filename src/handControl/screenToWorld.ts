import * as THREE from "three";

// Converts a normalized hand landmark position (x, y both 0-1, as MediaPipe
// gives us) into a 3D world position in front of the given camera, at a
// fixed distance away. This is the core translation between "where your
// finger is on screen" and "where a 3D object should sit to match it."
export function landmarkToWorldPosition(
  x: number,
  y: number,
  camera: THREE.Camera,
  distanceFromCamera: number = 2
): THREE.Vector3 {
  // Mirror x to match our mirrored video feed, then convert 0-1 range
  // into Three.js's -1 to 1 "normalized device coordinate" range
  const ndcX = (1 - x) * 2 - 1;
  const ndcY = -(y * 2 - 1); // y is flipped: screen-down is positive, but 3D-up is positive

  const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
  vector.unproject(camera);

  const direction = vector.sub(camera.position).normalize();
  const distance = distanceFromCamera;
  return camera.position.clone().add(direction.multiplyScalar(distance));
}
type TimedPoint = { x: number; y: number; t: number };

// Predicts where the fingertip actually is right now, based on its recent
// velocity — compensates for the real detection delay (20-40ms) instead of
// always rendering a slightly-stale position.
export function predictPosition(history: TimedPoint[]): { x: number; y: number } | null {
  if (history.length < 2) return history[0] ?? null;

  const prev = history[history.length - 2];
  const latest = history[history.length - 1];
  const dt = latest.t - prev.t;
  if (dt <= 0) return latest;

  const velocityX = (latest.x - prev.x) / dt;
  const velocityY = (latest.y - prev.y) / dt;

  const now = performance.now();
  const timeSinceLatest = Math.min(now - latest.t, 80); // cap extrapolation, avoid wild overshoot if detection stalls

  return {
    x: latest.x + velocityX * timeSinceLatest,
    y: latest.y + velocityY * timeSinceLatest,
  };
}
// Corrects a raw MediaPipe landmark (0-1, relative to the full uncropped
// capture) into the equivalent position within what's actually visible
// on screen after object-fit: cover crops the video to fill the window.
export function remapForCrop(
  rawX: number,
  rawY: number,
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  const videoAspect = videoWidth / videoHeight;
  const containerAspect = containerWidth / containerHeight;

  let visibleXRange = 1;
  let visibleYRange = 1;
  let xOffset = 0;
  let yOffset = 0;

  if (containerAspect > videoAspect) {
    // container is wider than video -> top/bottom get cropped
    visibleYRange = videoAspect / containerAspect;
    yOffset = (1 - visibleYRange) / 2;
  } else {
    // container is taller/narrower than video -> left/right get cropped
    visibleXRange = containerAspect / videoAspect;
    xOffset = (1 - visibleXRange) / 2;
  }

  return {
    x: (rawX - xOffset) / visibleXRange,
    y: (rawY - yOffset) / visibleYRange,
  };
}