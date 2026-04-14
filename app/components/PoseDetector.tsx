"use client";

import { useEffect, useRef } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

export default function PoseDetector() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let running = true;
    let rafId: number;
    let landmarker: PoseLandmarker | null = null;

    async function setup() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
      });

      const video = videoRef.current!;
      video.srcObject = stream;

      await new Promise<void>((res) => {
        video.onloadedmetadata = () => res();
      });

      await video.play();
      loop(video);
    }

    function loop(video: HTMLVideoElement) {
      if (!running) return;

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;

      // Sincronizar tamaño canvas con video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      if (video.readyState >= 2 && landmarker && video.videoWidth > 0) {
        // Dibujar video espejado en canvas
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Detectar pose
        const result = landmarker.detectForVideo(video, performance.now());

        if (result.landmarks.length > 0) {
          const drawingUtils = new DrawingUtils(ctx);

          for (const landmarks of result.landmarks) {
            // Espejo X para que coincida con el video
            const mirrored = landmarks.map((lm) => ({
              x: 1 - lm.x,
              y: lm.y,
              z: lm.z,
              visibility: lm.visibility,
            }));

            drawingUtils.drawConnectors(mirrored, PoseLandmarker.POSE_CONNECTIONS, {
              color: "#FFFFFF",
              lineWidth: 3,
            });

            drawingUtils.drawLandmarks(mirrored, {
              color: "#00FF88",
              fillColor: "#00FF88",
              radius: 5,
              lineWidth: 2,
            });
          }
        }
      }

      rafId = requestAnimationFrame(() => loop(video));
    }

    setup().catch(console.error);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      landmarker?.close();
      const video = videoRef.current;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <video ref={videoRef} style={{ display: "none" }} autoPlay playsInline muted />
      <canvas
        ref={canvasRef}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    </div>
  );
}
