"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { validatePose } from "../lib/poseUtils";
import type { PoseDefinition, ValidationResult } from "../lib/poses/types";

const HOLD_TIME_SECONDS = 10;
const REPEAT_MESSAGE_COOLDOWN = 2500;

export default function PoseDetector({ pose, onBack, onComplete }: { pose: PoseDefinition; onBack: () => void; onComplete?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(HOLD_TIME_SECONDS);
  const [isFinished, setIsFinished] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTime = useRef(0);

  // Limpieza absoluta al desmontar o cambiar de pose
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string) => {
    const now = Date.now();
    if (now - lastSpeechTime.current > REPEAT_MESSAGE_COOLDOWN) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-MX";
      window.speechSynthesis.speak(utterance);
      lastSpeechTime.current = now;
    }
  }, []);

  // Lógica del cronómetro
  useEffect(() => {
    if (result?.isValid && !isFinished) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              setIsFinished(true);
              if (onComplete) onComplete();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setTimeLeft(HOLD_TIME_SECONDS);
      }
    }
  }, [result?.isValid, isFinished, onComplete]);

  useEffect(() => {
    let landmarker: PoseLandmarker;
    let animationId: number;

    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { 
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
          delegate: "GPU" 
        },
        runningMode: "VIDEO",
      });

      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      if (videoRef.current) videoRef.current.srcObject = stream;

      const predict = () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          const results = landmarker.detectForVideo(videoRef.current, performance.now());
          if (results.landmarks?.[0]) {
            const res = validatePose(results.landmarks[0], pose);
            setResult(res);

            const ctx = canvasRef.current?.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              const utils = new DrawingUtils(ctx);
              utils.drawConnectors(results.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, { color: "#ffffff22" });
              utils.drawLandmarks(results.landmarks[0], { color: res.isValid ? "#00d26e" : "#ff4444", radius: 4 });
            }
          }
        }
        animationId = requestAnimationFrame(predict);
      };
      predict();
    };

    init();
    return () => {
      landmarker?.close();
      cancelAnimationFrame(animationId);
    };
  }, [pose]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative", overflow: "hidden" }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
      <canvas ref={canvasRef} width={1280} height={720} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
      
      <div style={{ position: "absolute", top: 40, width: "100%", textAlign: "center" }}>
        <h1 style={{ color: "#fff", fontSize: "3rem", margin: 0, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{pose.name}</h1>
        <div style={{ fontSize: "5rem", fontWeight: "bold", color: result?.isValid ? "#00d26e" : "#fff" }}>{timeLeft}s</div>
      </div>

      <button onClick={onBack} style={{ position: "absolute", top: 20, left: 20, padding: "10px 20px", borderRadius: "10px", cursor: "pointer" }}>✕ Salir</button>
      
      {isFinished && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,210,110,0.3)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}>
          <h2 style={{ color: "#fff", fontSize: "4rem" }}>¡BIEN HECHO!</h2>
        </div>
      )}
    </div>
  );
}