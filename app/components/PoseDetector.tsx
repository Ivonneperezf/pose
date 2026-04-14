"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { validatePose } from "../lib/poseUtils";
import { tPose, warriorPose } from "../lib/poses";
import type { PoseDefinition, ValidationResult } from "../lib/poses/types";

// ─── Pose activa para validar (cámbiala aquí) ───────────────────────────────
const ACTIVE_POSE: PoseDefinition = tPose;
// const ACTIVE_POSE: PoseDefinition = warriorPose;
// ────────────────────────────────────────────────────────────────────────────

interface PoseStatus {
  result: ValidationResult | null;
  fps: number;
}

export default function PoseDetector() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<PoseStatus>({ result: null, fps: 0 });
  const lastFrameTime = useRef<number>(performance.now());
  const frameCount = useRef<number>(0);

  const updateFps = useCallback(() => {
    frameCount.current++;
    const now = performance.now();
    const elapsed = now - lastFrameTime.current;
    if (elapsed >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / elapsed);
      frameCount.current = 0;
      lastFrameTime.current = now;
      return fps;
    }
    return null;
  }, []);

  useEffect(() => {
    let running = true;
    let rafId: number;
    let landmarker: PoseLandmarker | null = null;
    let currentFps = 0;

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

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      if (video.readyState >= 2 && landmarker && video.videoWidth > 0) {
        // Dibujar video espejado
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const result = landmarker.detectForVideo(video, performance.now());

        if (result.landmarks.length > 0) {
          const drawingUtils = new DrawingUtils(ctx);

          for (const landmarks of result.landmarks) {
            const mirrored = landmarks.map((lm) => ({
              x: 1 - lm.x,
              y: lm.y,
              z: lm.z,
              visibility: lm.visibility,
            }));

            // Validar contra la pose activa
            const validation = validatePose(mirrored, ACTIVE_POSE);

            // Colorear conectores según validación
            drawingUtils.drawConnectors(mirrored, PoseLandmarker.POSE_CONNECTIONS, {
              color: validation.isValid ? "#00FF88" : "#FF4444",
              lineWidth: 3,
            });

            // Colorear cada landmark según si su keypoint pasó o no
            const failedLandmarks = new Set(
              validation.keypointResults
                .filter((r) => !r.passed)
                .map((r) => r.landmark)
            );

            mirrored.forEach((lm, i) => {
              const color = failedLandmarks.has(i) ? "#FF4444" : "#00FF88";
              drawingUtils.drawLandmarks([lm], {
                color,
                fillColor: color,
                radius: failedLandmarks.has(i) ? 8 : 5,
                lineWidth: 2,
              });
            });

            // Actualizar FPS y estado
            const newFps = updateFps();
            if (newFps !== null) currentFps = newFps;

            setStatus({ result: validation, fps: currentFps });
          }
        } else {
          setStatus((prev) => ({ ...prev, result: null }));
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
  }, [updateFps]);

  const { result, fps } = status;
  const scorePercent = result ? Math.round(result.score * 100) : 0;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: "'Space Mono', monospace",
      }}
    >
      <video ref={videoRef} style={{ display: "none" }} autoPlay playsInline muted />

      {/* Canvas principal */}
      <div style={{ position: "relative", maxWidth: "100%", maxHeight: "80vh" }}>
        <canvas
          ref={canvasRef}
          style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", display: "block" }}
        />

        {/* Badge de estado superpuesto */}
        {result && (
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              background: result.isValid
                ? "rgba(0,255,136,0.15)"
                : "rgba(255,68,68,0.15)",
              border: `2px solid ${result.isValid ? "#00FF88" : "#FF4444"}`,
              borderRadius: 12,
              padding: "8px 18px",
              color: result.isValid ? "#00FF88" : "#FF4444",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2,
              backdropFilter: "blur(8px)",
              textTransform: "uppercase",
            }}
          >
            {result.isValid ? "✓ Pose Válida" : "✗ Ajusta la Pose"}
          </div>
        )}

        {/* FPS */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            color: "#555",
            fontSize: 11,
            fontFamily: "monospace",
          }}
        >
          {fps} fps
        </div>
      </div>

      {/* Panel inferior de validación */}
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          marginTop: 16,
          padding: "0 16px",
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        {/* Nombre de pose */}
        <div style={{ color: "#888", fontSize: 12, letterSpacing: 1, minWidth: 120, textTransform: "uppercase" }}>
          {ACTIVE_POSE.name}
        </div>

        {/* Barra de score */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: 6,
              background: "#1a1a1a",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${scorePercent}%`,
                background:
                  scorePercent >= 85
                    ? "#00FF88"
                    : scorePercent >= 60
                    ? "#FFB800"
                    : "#FF4444",
                borderRadius: 4,
                transition: "width 0.15s ease, background 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Porcentaje */}
        <div
          style={{
            color: scorePercent >= 85 ? "#00FF88" : scorePercent >= 60 ? "#FFB800" : "#FF4444",
            fontSize: 14,
            fontWeight: 700,
            minWidth: 50,
            textAlign: "right",
            transition: "color 0.3s ease",
          }}
        >
          {result ? `${scorePercent}%` : "—"}
        </div>
      </div>

      {/* Detalle por keypoint */}
      {result && result.keypointResults.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: 760,
            padding: "8px 16px",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {result.keypointResults.map((kp, i) => (
            <div
              key={i}
              style={{
                background: kp.passed ? "rgba(0,255,136,0.08)" : "rgba(255,68,68,0.08)",
                border: `1px solid ${kp.passed ? "#00FF8840" : "#FF444440"}`,
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: 10,
                color: kp.passed ? "#00FF88" : "#FF4444",
                fontFamily: "monospace",
              }}
            >
              L{kp.landmark}:{" "}
              {kp.actual !== null ? `${Math.round(kp.actual)}°` : "?"}{" "}
              <span style={{ opacity: 0.5 }}>
                [{kp.expected[0]}–{kp.expected[1]}]
              </span>
            </div>
          ))}
        </div>
      )}

      {!result && (
        <div style={{ color: "#333", fontSize: 12, marginTop: 8, letterSpacing: 1 }}>
          ESPERANDO PERSONA EN FRAME…
        </div>
      )}
    </div>
  );
}