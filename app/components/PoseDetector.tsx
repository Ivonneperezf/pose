"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { validatePose } from "../lib/poseUtils";
import type { PoseDefinition, ValidationResult } from "../lib/poses/types";

const REPEAT_MESSAGE_COOLDOWN = 5000; // 5 segundos para repetir el mismo mensaje

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
  const lastFrameTime = useRef<number>(performance.now());
  const frameCount = useRef<number>(0);
  
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const lastSpokenHint = useRef<string>("");
  const lastSpeakTime = useRef<number>(0); // Seguimiento del tiempo
  const isSpeaking = useRef<boolean>(false);

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
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    
    utterance.onend = () => { 
      isSpeaking.current = false; 
      lastSpeakTime.current = Date.now(); // Guardar cuando terminó de hablar
    };
    utterance.onerror = () => { isSpeaking.current = false; };
    
    window.speechSynthesis.speak(utterance);
  }, [isVoiceEnabled]);

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
            
            if (isVoiceEnabled) {
              const currentHint = validation.isValid ? "¡Excelente! Mantén esa posición." : getHint(validation.keypointResults) || "";
              
              const now = Date.now();
              const isSameHint = currentHint === lastSpokenHint.current;
              const timeSinceLastSpeak = now - lastSpeakTime.current;

              if (currentHint && !isSpeaking.current) {
                // Hablar si: es un mensaje nuevo O si es el mismo pero ya pasó el tiempo de espera
                if (!isSameHint || timeSinceLastSpeak > REPEAT_MESSAGE_COOLDOWN) {
                  speak(currentHint);
                  lastSpokenHint.current = currentHint;
                }
              }
            }

            const failedSet = new Set(validation.keypointResults.filter((r) => !r.passed).map((r) => r.landmark));
            drawingUtils.drawConnectors(mirrored, PoseLandmarker.POSE_CONNECTIONS, {
              color: validation.isValid ? "#00d26e" : "#dc3c3c",
              lineWidth: 5,
            });

            mirrored.forEach((lm, i) => {
              const failed = failedSet.has(i);
              drawingUtils.drawLandmarks([lm], {
                color: failed ? "#dc3c3c" : "#00d26e",
                fillColor: failed ? "#dc3c3c" : "#00d26e",
                radius: failed ? 10 : 6,
              });
            });

            const newFps = updateFps();
            if (newFps !== null) currentFps = newFps;
            setStatus({ result: validation, fps: currentFps });
          }
        } else {
          setStatus((prev) => ({ ...prev, result: null }));
          if (!isSpeaking.current) {
            lastSpokenHint.current = "";
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
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [pose, updateFps, speak, isVoiceEnabled]);

  const { result, fps } = status;
  const scorePercent = result ? Math.round(result.score * 100) : 0;
  const hint = result ? getHint(result.keypointResults) : null;
  const scoreColor = scorePercent >= 85 ? "#00d26e" : scorePercent >= 60 ? "#f0a500" : "#dc3c3c";

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#080808", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px", gap: "12px", fontFamily: "'Space Mono', monospace", boxSizing: "border-box", overflow: "hidden" }}>
      <video ref={videoRef} style={{ display: "none" }} autoPlay playsInline muted />

      <div style={{ width: "100%", maxWidth: "1600px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: "8px 16px", color: "#bbb", fontSize: 11, cursor: "pointer" }}>← VOLVER</button>
        <div style={{ color: "#444", fontSize: 11 }}>{pose.name} Detector</div>
        <button
          onClick={() => { if (isVoiceEnabled) window.speechSynthesis.cancel(); setIsVoiceEnabled(!isVoiceEnabled); }}
          style={{ background: isVoiceEnabled ? "rgba(0,210,110,0.1)" : "#1a1a1a", border: `1px solid ${isVoiceEnabled ? "#00d26e55" : "#333"}`, borderRadius: 10, padding: "8px 14px", color: isVoiceEnabled ? "#00d26e" : "#777", fontSize: 12, cursor: "pointer" }}
        >
          {isVoiceEnabled ? "🔊 AUDIO ON" : "🔇 AUDIO OFF"}
        </button>
      </div>

      <div style={{ position: "relative", flex: 1, width: "100%", maxWidth: "1600px", borderRadius: 20, overflow: "hidden", background: "#000", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <canvas ref={canvasRef} style={{ height: "100%", width: "100%", objectFit: "contain", display: "block" }} />
        
        {result && (
          <div style={{ position: "absolute", top: 20, left: 20, padding: "12px 28px", borderRadius: 12, fontSize: 16, fontWeight: 800, background: result.isValid ? "rgba(0,210,110,0.8)" : "rgba(220,60,60,0.8)", color: "#fff", textTransform: "uppercase", backdropFilter: "blur(4px)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            {result.isValid ? "✓ EXCELENTE" : "✗ AJUSTA POSE"}
          </div>
        )}
        
        <div style={{ position: "absolute", bottom: 20, left: 20, fontSize: 12, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "5px 12px", borderRadius: 8 }}>{fps} FPS</div>
        
        {result && (
          <div style={{ position: "absolute", top: 20, right: 20 }}>
            <svg width="80" height="80" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={28} fill="rgba(0,0,0,0.5)" stroke="#333" strokeWidth="4" />
              <circle cx="32" cy="32" r={28} fill="none" stroke={scoreColor} strokeWidth="6" strokeDasharray={175.9} strokeDashoffset={175.9 - (scorePercent / 100) * 175.9} strokeLinecap="round" transform="rotate(-90 32 32)" style={{ transition: "all 0.4s ease" }} />
              <text x="32" y="38" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="900">{scorePercent}%</text>
            </svg>
          </div>
        )}
      </div>

      <div style={{ width: "100%", maxWidth: "1600px", background: result?.isValid ? "rgba(0,210,110,0.1)" : "#111", border: `2px solid ${result?.isValid ? "#00d26e55" : "#222"}`, borderRadius: 20, padding: "20px 40px", display: "flex", gap: 25, alignItems: "center", transition: "all 0.3s ease" }}>
        <div style={{ width: 70, height: 70, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, background: result?.isValid ? "#00d26e" : "#222", color: result?.isValid ? "#000" : "#555" }}>
          {!result ? "..." : result.isValid ? "✓" : "!"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 32, color: "#fff", lineHeight: 1.2, fontWeight: 600 }}>
            {!result ? "BUSCANDO PERSONA..." : result.isValid ? "¡PERFECTO! MANTENTE AHÍ" : <span style={{ color: "#f0a500" }}>{hint?.toUpperCase() || "AJUSTA TU POSICIÓN"}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}