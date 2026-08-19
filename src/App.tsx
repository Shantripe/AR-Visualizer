import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { landmarkToWorldPosition, predictPosition, remapForCrop } from "./handControl/screenToWorld";

const INDEX_TIP = 8;

type TimedPoint = { x: number; y: number; t: number };

function HandDot({ historyRef, color }: { historyRef: React.MutableRefObject<TimedPoint[]>; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useFrame(() => {
    const predicted = predictPosition(historyRef.current);
    if (!meshRef.current || !predicted) return;
    const pos = landmarkToWorldPosition(predicted.x, predicted.y, camera);
    meshRef.current.position.copy(pos);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // one history array per hand slot (0 and 1) — MediaPipe gives hands back
  // as an array, so results.landmarks[0] and [1] are our two hands
  const hand0HistoryRef = useRef<TimedPoint[]>([]);
  const hand1HistoryRef = useRef<TimedPoint[]>([]);
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
      const DETECT_EVERY_N_FRAMES = 3; // tune this: higher = less lag-causing blocking, but less frequent real tracking updates

      function detectLoop() {
        if (!videoRef.current) return;
        frameCount++;

        if (frameCount % DETECT_EVERY_N_FRAMES === 0) {
          const results: HandLandmarkerResult = handLandmarker.detectForVideo(
            videoRef.current,
            performance.now()
          );

          const historyRefs = [hand0HistoryRef, hand1HistoryRef];

          historyRefs.forEach((historyRef, handIndex) => {
            const hand = results.landmarks?.[handIndex];
            if (!hand) return;
            const tip = hand[INDEX_TIP];
            const corrected = remapForCrop(
              tip.x,
              tip.y,
              videoRef.current!.videoWidth,
              videoRef.current!.videoHeight,
              window.innerWidth,
              window.innerHeight
            );
            historyRef.current.push({ x: corrected.x, y: corrected.y, t: performance.now() });
            if (historyRef.current.length > 5) historyRef.current.shift();
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
            <HandDot historyRef={hand0HistoryRef} color="#00FF88" />
            <HandDot historyRef={hand1HistoryRef} color="#FF3388" />
          </>
        )}
      </Canvas>
    </div>
  );
}

export default App;