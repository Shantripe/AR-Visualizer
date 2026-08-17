import { useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { createBaseGeometry, applyTwist } from "./geometry/foldedShape";
import { mapHandToFoldAmount } from "./handControl/mapHandToParams";

function FoldedMesh({ foldAmountRef }: { foldAmountRef: React.MutableRefObject<number> }) {
  const geometry = useMemo(() => createBaseGeometry(), []);

  useFrame(() => {
    applyTwist(geometry, foldAmountRef.current);
  });

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="white" side={2} />
    </mesh>
  );
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const foldAmountRef = useRef(0.6); // fallback value when no hand is detected

  useEffect(() => {
    let handLandmarker: HandLandmarker;
    let animationFrameId: number;

    async function setup() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
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

      function detectLoop() {
        if (!videoRef.current) return;
        const results = handLandmarker.detectForVideo(videoRef.current, performance.now());
        const fold = mapHandToFoldAmount(results);
        if (fold !== null) {
          foldAmountRef.current = fold;
        }
        animationFrameId = requestAnimationFrame(detectLoop);
      }

      detectLoop();
    }

    setup();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
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
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={1} />
        <FoldedMesh foldAmountRef={foldAmountRef} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;