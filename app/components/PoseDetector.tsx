"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { validatePose } from "../lib/poseUtils";
import type { PoseDefinition, ValidationResult } from "../lib/poses/types";

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
  const isSpeaking = useRef<boolean>(false);

  // --- FUNCIÓN PARA BUSCAR VOZ FEMENINA LATINA ---
  const getLatinaVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    // Prioridad 1: México, Prioridad 2: Español en general, Prioridad 3: Cualquiera
    // Buscamos nombres comunes de voces femeninas como "Sabina", "Helena", "Paulina", "Zira" o "Google español"
    return (
      voices.find((v) => v.lang === "es-MX" && v.name.includes("Google")) ||
      voices.find((v) => v.lang === "es-MX") ||
      voices.find((v) => v.lang.startsWith("es-")) ||
      voices[0]
    );
  };

  const speak = useCallback((text: string) => {
    if (!isVoiceEnabled || isSpeaking.current || typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    isSpeaking.current = true;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configuramos la voz femenina latina
    const selectedVoice = getLatinaVoice();
    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.lang = "es-MX";
    utterance.rate = 0.9;  // Ritmo pausado y amigable
    utterance.pitch = 1.1; // Tono ligeramente femenino y cálido
    utterance.volume = 1;

    utterance.onend = () => { isSpeaking.current = false; };
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
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

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

      const video = videoRef.current!;
      video.srcObject = stream;
      await new Promise<void>((res) => { video.onloadedmetadata = () => res(); });
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
              if (currentHint && currentHint !== lastSpokenHint.current && !isSpeaking.current) {
                speak(currentHint);
                lastSpokenHint.current = currentHint;
              }
            }

            const failedSet = new Set(validation.keypointResults.filter((r) => !r.passed).map((r) => r.landmark));
            drawingUtils.drawConnectors(mirrored, PoseLandmarker.POSE_CONNECTIONS, {
              color: validation.isValid ? "#00d26e" : "#dc3c3c",
              lineWidth: 3,
            });

            mirrored.forEach((lm, i) => {
              const failed = failedSet.has(i);
              drawingUtils.drawLandmarks([lm], {
                color: failed ? "#dc3c3c" : "#00d26e",
                fillColor: failed ? "#dc3c3c" : "#00d26e",
                radius: failed ? 8 : 5,
                lineWidth: 2,
              });
            });

            const newFps = updateFps();
            if (newFps !== null) currentFps = newFps;
            setStatus({ result: validation, fps: currentFps });
          }
        } else {
          setStatus((prev) => ({ ...prev, result: null }));
          if (!isSpeaking.current) lastSpokenHint.current = "";
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
      const video = videoRef.current;
      if (video?.srcObject) (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    };
  }, [pose, updateFps, speak, isVoiceEnabled]);

  const { result, fps } = status;
  const scorePercent = result ? Math.round(result.score * 100) : 0;
  const hint = result ? getHint(result.keypointResults) : null;
  const RADIUS = 22;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const offset = CIRCUMFERENCE - (scorePercent / 100) * CIRCUMFERENCE;
  const scoreColor = scorePercent >= 85 ? "#00d26e" : scorePercent >= 60 ? "#f0a500" : "#dc3c3c";

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#0d0d0d", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px", gap: "12px", fontFamily: "'Space Mono', monospace", boxSizing: "border-box" }}>
      <video ref={videoRef} style={{ display: "none" }} autoPlay playsInline muted />

      <div style={{ width: "100%", maxWidth: 760, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: 10, padding: "7px 16px", color: "#555", fontSize: 11, cursor: "pointer", textTransform: "uppercase" }}>← Volver</button>
        <button
          onClick={() => { if (isVoiceEnabled) window.speechSynthesis.cancel(); setIsVoiceEnabled(!isVoiceEnabled); }}
          style={{ background: isVoiceEnabled ? "rgba(0,210,110,0.1)" : "#1a1a1a", border: `1px solid ${isVoiceEnabled ? "#00d26e55" : "#333"}`, borderRadius: 10, padding: "7px 12px", color: isVoiceEnabled ? "#00d26e" : "#777", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          {isVoiceEnabled ? "🔊 Asistente ON" : "🔇 Asistente OFF"}
        </button>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 760, borderRadius: 16, overflow: "hidden", background: "#111", border: "1px solid #222" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block" }} />
        {result && (
          <div style={{ position: "absolute", top: 12, left: 12, padding: "6px 16px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: result.isValid ? "rgba(0,210,110,0.15)" : "rgba(220,60,60,0.18)", border: `1.5px solid ${result.isValid ? "#00d26e" : "#dc3c3c"}`, color: result.isValid ? "#00d26e" : "#ff6b6b", textTransform: "uppercase" }}>
            {result.isValid ? "✓ Pose correcta" : "✗ Ajusta tu cuerpo"}
          </div>
        )}
        <div style={{ position: "absolute", top: 14, right: 14, fontSize: 10, color: "#444" }}>{fps} fps</div>
        {result && (
          <div style={{ position: "absolute", bottom: 12, right: 12 }}>
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r={RADIUS} fill="none" stroke="#222" strokeWidth="4" />
              <circle cx="26" cy="26" r={RADIUS} fill="none" stroke={scoreColor} strokeWidth="4" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: "all 0.3s ease" }} />
              <text x="26" y="30" textAnchor="middle" fill={scoreColor} fontSize="11" fontWeight="700">{scorePercent}%</text>
            </svg>
          </div>
        )}
      </div>

      <div style={{ width: "100%", maxWidth: 760, background: "#111", border: "1px solid #222", borderRadius: 14, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: result?.isValid ? "rgba(0,210,110,0.12)" : "rgba(240,165,0,0.1)", border: `1px solid ${result?.isValid ? "rgba(0,210,110,0.3)" : "rgba(240,165,0,0.25)"}` }}>
          {!result ? "👁" : result.isValid ? "✓" : "↑"}
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>{result?.isValid ? "¡Excelente!" : "Guía de voz"}</div>
          <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5 }}>
            {!result ? "ESPERANDO PERSONA..." : result.isValid ? "¡Muy bien! Mantén esa pose." : hint ? <span style={{ color: "#f0a500", fontWeight: 700 }}>{hint}</span> : "Ajusta tu posición"}
          </div>
        </div>
      </div>
    </div>
  );
}