import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { landmarkToWorldPosition, predictPosition, remapForCrop } from "./handControl/screenToWorld";
import { createFingerWebGeometry, updateFingerWebGeometry } from "./geometry/fingerWeb";

// Thumb tip, index tip, middle tip — add 16 (ring) and 20 (pinky) later
// to extend this to a 5-point web without touching any other logic.
const FINGER_INDICES = [4, 8, 12];

type TimedPoint = { x: number; y: number; t: number };

function FingerWeb({
  historiesRef,
}: {
  historiesRef: React.MutableRefObject<Record<number, TimedPoint[]>>;
}) {
  const geometry = useMemo(() => createFingerWebGeometry(FINGER_INDICES.length), []);
  const { camera } = useThree();

  useFrame(() => {
    const positions = [];
    for (const idx of FINGER_INDICES) {
      const history = historiesRef.current[idx];
      if (!history || history.length === 0) return; // wait until every finger has been seen at least once
      const predicted = predictPosition(history);
      if (!predicted) return;
      positions.push(landmarkToWorldPosition(predicted.x, predicted.y, camera));
    }
    updateFingerWebGeometry(geometry, positions);
  });

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#00FF88" side={2} transparent opacity={0.7} />
    </mesh>
  );
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fingerHistoriesRef = useRef<Record<number, TimedPoint[]>>({});
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
        numHands: 1,
      });

      setReady(true);

      function detectLoop() {
        if (!videoRef.current) return;
        const results: HandLandmarkerResult = handLandmarker.detectForVideo(
          videoRef.current,
          performance.now()
        );

        if (results.landmarks && results.landmarks.length > 0) {
          const hand = results.landmarks[0];
          FINGER_INDICES.forEach((idx) => {
            const point = hand[idx];
            const corrected = remapForCrop(
              point.x,
              point.y,
              videoRef.current!.videoWidth,
              videoRef.current!.videoHeight,
              window.innerWidth,
              window.innerHeight
            );
            if (!fingerHistoriesRef.current[idx]) fingerHistoriesRef.current[idx] = [];
            const history = fingerHistoriesRef.current[idx];
            history.push({ x: corrected.x, y: corrected.y, t: performance.now() });
            if (history.length > 5) history.shift();
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
        {ready && <FingerWeb historiesRef={fingerHistoriesRef} />}
      </Canvas>
    </div>
  );
}

export default App;