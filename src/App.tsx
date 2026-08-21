import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { landmarkToWorldPosition, predictPosition, remapForCrop } from "./handControl/screenToWorld";
import { getExtendedFingers, FINGER_TIPS } from "./handControl/fingerExtension";
import { sortPointsAngularly } from "./handControl/sortPoints";
import { createFingerWebGeometry, updateFingerWebGeometry } from "./geometry/fingerWeb";

type TimedPoint = { x: number; y: number; t: number };
type HandState = {
  histories: Record<number, TimedPoint[]>;
  extended: Set<number>;
  missCount: number; // consecutive detection cycles this hand hasn't been seen
};

function FingerDots({ handStateRef }: { handStateRef: React.MutableRefObject<HandState> }) {
  const meshRefs = useRef<Record<number, THREE.Mesh | null>>({});
  const { camera } = useThree();

    useFrame(() => {
    FINGER_TIPS.forEach((tipIdx) => {
      const mesh = meshRefs.current[tipIdx];
      if (!mesh) return;

      const history = handStateRef.current.histories[tipIdx];
      if (!history || history.length === 0) {
        mesh.visible = false; // this line was missing — dots now actually hide instead of freezing in place
        return;
      }

      const predicted = predictPosition(history);
      if (!predicted) {
        mesh.visible = false;
        return;
      }

      mesh.visible = true;
      const pos = landmarkToWorldPosition(predicted.x, predicted.y, camera);
      mesh.position.copy(pos);
      const isExtended = handStateRef.current.extended.has(tipIdx);
      (mesh.material as THREE.MeshBasicMaterial).color.set(isExtended ? "#00FF88" : "#555555");
    });
  });

  return (
    <>
      {FINGER_TIPS.map((tipIdx) => (
        <mesh key={tipIdx} ref={(el) => { meshRefs.current[tipIdx] = el; }}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#555555" />
        </mesh>
      ))}
    </>
  );
}

// The actual feature: gathers every currently-extended fingertip across
// BOTH hands, sorts them into a clean order, and builds a live polygon.
// Rebuilds geometry only when the point count actually changes.
function CombinedWeb({
  hand0Ref,
  hand1Ref,
}: {
  hand0Ref: React.MutableRefObject<HandState>;
  hand1Ref: React.MutableRefObject<HandState>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const pointCountRef = useRef(0);
  const { camera } = useThree();

  useFrame(() => {
    const points: THREE.Vector3[] = [];

    [hand0Ref, hand1Ref].forEach((handRef) => {
      handRef.current.extended.forEach((tipIdx) => {
        const history = handRef.current.histories[tipIdx];
        if (!history || history.length === 0) return;
        const predicted = predictPosition(history);
        if (!predicted) return;
        points.push(landmarkToWorldPosition(predicted.x, predicted.y, camera));
      });
    });

    if (!meshRef.current) return;

    if (points.length < 3) {
      meshRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;

    const sorted = sortPointsAngularly(points);

    if (pointCountRef.current !== sorted.length || !geometryRef.current) {
      geometryRef.current = createFingerWebGeometry(sorted.length);
      pointCountRef.current = sorted.length;
      meshRef.current.geometry = geometryRef.current;
    }

    updateFingerWebGeometry(geometryRef.current, sorted);
  });

  return (
    <mesh ref={meshRef} visible={false}>
      <bufferGeometry />
      <meshBasicMaterial color="#00FF88" side={2} transparent opacity={0.6} />
    </mesh>
  );
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hand0Ref = useRef<HandState>({ histories: {}, extended: new Set(), missCount: 0 });
  const hand1Ref = useRef<HandState>({ histories: {}, extended: new Set(), missCount: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let handLandmarker: HandLandmarker;
    let animationFrameId: number;

    async function setup() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current!.onloadedmetadata = resolve;
        });
      }

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });

      setReady(true);

      let frameCount = 0;
      const DETECT_EVERY_N_FRAMES = 3;

      function detectLoop() {
        if (!videoRef.current) return;
        frameCount++;

        if (frameCount % DETECT_EVERY_N_FRAMES === 0) {
          const results: HandLandmarkerResult = handLandmarker.detectForVideo(
            videoRef.current,
            performance.now()
          );

          const handRefs = [hand0Ref, hand1Ref];

                    handRefs.forEach((handRef, handIndex) => {
            const hand = results.landmarks?.[handIndex];

            if (!hand) {
              handRef.current.missCount++;
              const MISS_THRESHOLD = 2; // consecutive missed cycles before we clear — tune if twitchy or laggy
              if (handRef.current.missCount > MISS_THRESHOLD) {
                handRef.current.histories = {};
                handRef.current.extended = new Set();
              }
              return;
            }

            handRef.current.missCount = 0;
            handRef.current.extended = getExtendedFingers(hand);

            FINGER_TIPS.forEach((tipIdx) => {
              const point = hand[tipIdx];
              const corrected = remapForCrop(
                point.x,
                point.y,
                videoRef.current!.videoWidth,
                videoRef.current!.videoHeight,
                window.innerWidth,
                window.innerHeight
              );
              if (!handRef.current.histories[tipIdx]) handRef.current.histories[tipIdx] = [];
              const hist = handRef.current.histories[tipIdx];
              hist.push({ x: corrected.x, y: corrected.y, t: performance.now() });
              if (hist.length > 5) hist.shift();
            });
          });
        }

        animationFrameId = requestAnimationFrame(detectLoop);
      }

      detectLoop();
    }

    setup();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#000" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)",
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 3] }}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        gl={{ alpha: true }}
      >
        {ready && (
          <>
            <FingerDots handStateRef={hand0Ref} />
            <FingerDots handStateRef={hand1Ref} />
            <CombinedWeb hand0Ref={hand0Ref} hand1Ref={hand1Ref} />
          </>
        )}
      </Canvas>
    </div>
  );
}

export default App;