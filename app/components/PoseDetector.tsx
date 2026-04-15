"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { validatePose } from "../lib/poseUtils";
import type { PoseDefinition, ValidationResult } from "../lib/poses/types";

// --- CONFIGURACIÓN AJUSTABLE ---
const REPEAT_MESSAGE_COOLDOWN = 5000; 
const HOLD_TIME_SECONDS = 10; // <--- DEFINE AQUÍ EL TIEMPO DEL EJERCICIO
// -------------------------------

const KEYPOINT_HINTS: Record<number, { low: string; high: string }> = {
  13: { low: "Estira un poco tu brazo izquierdo", high: "Relaja tu codo izquierdo" },
  14: { low: "Estira un poco tu brazo derecho", high: "Relaja tu codo derecho" },
  11: { low: "Sube tu brazo izquierdo", high: "Baja un poco tu brazo izquierdo" },
  12: { low: "Sube tu brazo derecho", high: "Baja un poco tu brazo derecho" },
  25: { low: "Dobla un poco más tu rodilla delantera", high: "Estira un poco tu rodilla delantera" },
  26: { low: "Trata de estirar tu pierna trasera", high: "Estira la pierna trasera" },
};

function getHint(keypointResults: ValidationResult["keypointResults"]): string | null {
  const failed = keypointResults.filter((r) => !r.passed && r.actual !== null);
  if (failed.length === 0) return null;
  const first = failed[0];
  const hints = KEYPOINT_HINTS[first.landmark];
  if (!hints) return `Ajusta el punto ${first.landmark}`;
  const mid = (first.expected[0] + first.expected[1]) / 2;
  return first.actual! < mid ? hints.low : hints.high;
}

interface Props {
  pose: PoseDefinition;
  onBack: () => void;
}

interface PoseStatus {
  result: ValidationResult | null;
  fps: number;
}

export default function PoseDetector({ pose, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<PoseStatus>({ result: null, fps: 0 });
  const [timeLeft, setTimeLeft] = useState<number>(HOLD_TIME_SECONDS);
  const [isFinished, setIsFinished] = useState(false);

  const lastFrameTime = useRef<number>(performance.now());
  const frameCount = useRef<number>(0);
  
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const lastSpokenHint = useRef<string>("");
  const lastSpeakTime = useRef<number>(0);
  const isSpeaking = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getLatinaVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang === "es-MX" && v.name.includes("Google")) ||
      voices.find((v) => v.lang === "es-MX") ||
      voices.find((v) => v.lang.startsWith("es-")) ||
      voices[0]
    );
  };

  const speak = useCallback((text: string) => {
    if (!isVoiceEnabled || isSpeaking.current || typeof window === "undefined" || !window.speechSynthesis) return;
    isSpeaking.current = true;
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = getLatinaVoice();
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = "es-MX";
    utterance.rate = 1.0;
    utterance.onend = () => { 
      isSpeaking.current = false; 
      lastSpeakTime.current = Date.now();
    };
    window.speechSynthesis.speak(utterance);
  }, [isVoiceEnabled]);

  // Manejo del Cronómetro
  useEffect(() => {
    if (status.result?.isValid && timeLeft > 0 && !isFinished) {
      if (timeLeft === HOLD_TIME_SECONDS) speak("¡Posición correcta! Manténla.");
      
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsFinished(true);
            speak("¡Tiempo completado! Excelente trabajo.");
            return 0;
          }
          if (prev <= 4) speak((prev - 1).toString()); // Cuenta regresiva final 3, 2, 1
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status.result?.isValid, isFinished, speak]);

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
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          loop(videoRef.current!);
        };
      }
    }

    function loop(video: HTMLVideoElement) {
      if (!running) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      if (video.readyState >= 2 && landmarker && video.videoWidth > 0) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const result = landmarker.detectForVideo(video, performance.now());
        if (result.landmarks.length > 0) {
          const drawingUtils = new DrawingUtils(ctx);
          for (const landmarks of result.landmarks) {
            const mirrored = landmarks.map((lm) => ({ x: 1 - lm.x, y: lm.y, z: lm.z, visibility: lm.visibility }));
            const validation = validatePose(mirrored, pose);
            
            if (isVoiceEnabled && !isFinished) {
              const currentHint = validation.isValid ? "" : getHint(validation.keypointResults) || "";
              const now = Date.now();
              const isSameHint = currentHint === lastSpokenHint.current;
              const timeSinceLastSpeak = now - lastSpeakTime.current;

              if (currentHint && !isSpeaking.current) {
                if (!isSameHint || timeSinceLastSpeak > REPEAT_MESSAGE_COOLDOWN) {
                  speak(currentHint);
                  lastSpokenHint.current = currentHint;
                }
              }
            }

            const color = isFinished ? "#00d26e" : (validation.isValid ? "#00d26e" : "#dc3c3c");
            drawingUtils.drawConnectors(mirrored, PoseLandmarker.POSE_CONNECTIONS, { color, lineWidth: 5 });

            const newFps = updateFps();
            if (newFps !== null) currentFps = newFps;
            setStatus({ result: validation, fps: currentFps });
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
      if (typeof window !== "undefined") window.speechSynthesis.cancel();
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [pose, updateFps, speak, isVoiceEnabled, isFinished]);

  const { result, fps } = status;
  const scorePercent = result ? Math.round(result.score * 100) : 0;
  const hint = result ? getHint(result.keypointResults) : null;

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#080808", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px", gap: "12px", fontFamily: "'Space Mono', monospace", boxSizing: "border-box", overflow: "hidden" }}>
      <video ref={videoRef} style={{ display: "none" }} autoPlay playsInline muted />

      <div style={{ width: "100%", maxWidth: "1600px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: "8px 16px", color: "#bbb", fontSize: 11, cursor: "pointer" }}>← VOLVER</button>
        
        {/* TIMER DISPLAY CENTRAL */}
        <div style={{ 
          background: timeLeft === 0 ? "#00d26e" : "#1a1a1a", 
          padding: "8px 30px", 
          borderRadius: "20px", 
          fontSize: "24px", 
          fontWeight: "bold", 
          color: timeLeft === 0 ? "#000" : "#00d26e",
          border: "2px solid #00d26e",
          minWidth: "120px",
          textAlign: "center"
        }}>
          {timeLeft}s
        </div>

        <button
          onClick={() => { if (isVoiceEnabled) window.speechSynthesis.cancel(); setIsVoiceEnabled(!isVoiceEnabled); }}
          style={{ background: isVoiceEnabled ? "rgba(0,210,110,0.1)" : "#1a1a1a", border: `1px solid ${isVoiceEnabled ? "#00d26e55" : "#333"}`, borderRadius: 10, padding: "8px 14px", color: isVoiceEnabled ? "#00d26e" : "#777", fontSize: 12, cursor: "pointer" }}
        >
          {isVoiceEnabled ? "🔊 AUDIO" : "🔇 MUTED"}
        </button>
      </div>

      <div style={{ position: "relative", flex: 1, width: "100%", maxWidth: "1600px", borderRadius: 20, overflow: "hidden", background: "#000", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <canvas ref={canvasRef} style={{ height: "100%", width: "100%", objectFit: "contain", display: "block" }} />
        
        {result && !isFinished && (
          <div style={{ position: "absolute", top: 20, left: 20, padding: "12px 28px", borderRadius: 12, fontSize: 16, fontWeight: 800, background: result.isValid ? "rgba(0,210,110,0.8)" : "rgba(220,60,60,0.8)", color: "#fff", textTransform: "uppercase" }}>
            {result.isValid ? "✓ MANTENER" : "✗ AJUSTAR"}
          </div>
        )}

        {isFinished && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,210,110,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", backdropFilter: "blur(8px)" }}>
            <h1 style={{ color: "#fff", fontSize: 64, margin: 0 }}>¡LOGRADO!</h1>
            <button onClick={() => { setTimeLeft(HOLD_TIME_SECONDS); setIsFinished(false); }} style={{ marginTop: 20, padding: "15px 40px", borderRadius: 30, background: "#00d26e", color: "#000", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: 20 }}>REPETIR</button>
          </div>
        )}
      </div>

      <div style={{ width: "100%", maxWidth: "1600px", background: result?.isValid ? "rgba(0,210,110,0.1)" : "#111", border: `2px solid ${result?.isValid ? "#00d26e55" : "#222"}`, borderRadius: 20, padding: "20px 40px", display: "flex", gap: 25, alignItems: "center" }}>
        <div style={{ fontSize: 32, color: "#fff", flex: 1, fontWeight: 600 }}>
          {isFinished ? "¡SESIÓN COMPLETADA!" : !result ? "BUSCANDO..." : result.isValid ? "¡ASÍ ESTÁ BIEN!" : <span style={{ color: "#f0a500" }}>{hint?.toUpperCase()}</span>}
        </div>
        <div style={{ fontSize: 24, color: "#00d26e", fontWeight: "bold" }}>{scorePercent}%</div>
      </div>
    </div>
  );
}