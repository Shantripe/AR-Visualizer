import { useEffect, useRef } from "react";
import "./App.css";

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
    <div style={{ margin: 0, padding: 0, background: "#000" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          transform: "scaleX(-1)", // mirror it, feels natural like a selfie cam
        }}
      />
    </div>
  );
}

export default App;