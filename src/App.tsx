import { useEffect, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createFoldedShape } from "./geometry/foldedShape";

function FoldedMesh() {
  const geometry = useMemo(() => createFoldedShape(0.6), []);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="white" side={2} />
    </mesh>
  );
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function startWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Webcam access failed:", err);
      }
    }
    startWebcam();
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
        <FoldedMesh />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;