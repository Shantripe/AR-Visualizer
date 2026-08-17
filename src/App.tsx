import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import { createFoldedShape } from "./geometry/foldedShape";

function FoldedMesh() {
  const geometry = useMemo(() => createFoldedShape(0.6), []); // fixed fold for now

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="white" side={2} />
    </mesh>
  );
}

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={1} />
        <FoldedMesh />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;