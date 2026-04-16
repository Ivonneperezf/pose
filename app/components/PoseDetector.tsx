"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { validatePose } from "../lib/poseUtils";
import type { PoseDefinition, ValidationResult } from "../lib/poses/types";

const HOLD_TIME_SECONDS = 10; 

interface Props {
  poses: PoseDefinition[];
  onBack: () => void;
}

export default function PoseDetector({ poses, onBack }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRoutineFinished, setIsRoutineFinished] = useState(false);
  const activePose = poses[currentStep];

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [status, setStatus] = useState<{ result: ValidationResult | null }>({ result: null });
  const [timeLeft, setTimeLeft] = useState<number>(HOLD_TIME_SECONDS);
  const [isPoseComplete, setIsPoseComplete] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFeedbackTime = useRef<number>(0);
  const isSpeakingRef = useRef(false);
  const hasStartedHoldingRef = useRef(false);

  const speak = useCallback((text: string, force = false) => {
    if (!isVoiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    if (window.speechSynthesis.speaking && !force) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    utterance.rate = 1.0;
    
    utterance.onstart = () => { isSpeakingRef.current = true; };
    utterance.onend = () => { isSpeakingRef.current = false; };

    window.speechSynthesis.speak(utterance);
  }, [isVoiceEnabled]);

  const handleNextStep = useCallback(() => {
    if (currentStep < poses.length - 1) {
      setCurrentStep(prev => prev + 1);
      setTimeLeft(HOLD_TIME_SECONDS);
      setIsPoseComplete(false);
      hasStartedHoldingRef.current = false;
    } else {
      setIsRoutineFinished(true);
      speak("Rutina completada. ¡Excelente trabajo!", true);
    }
  }, [currentStep, poses.length, speak]);

  useEffect(() => {
    if (isCameraReady && activePose && !isRoutineFinished && !isPoseComplete) {
      const introText = `Posición ${currentStep + 1}. ${activePose.name}. ${activePose.description}`;
      speak(introText, true);
    }
  }, [currentStep, isCameraReady, activePose, isRoutineFinished, isPoseComplete, speak]);

  // Lógica del Cronómetro y Mensajes de Estado
  useEffect(() => {
    const isPoseValid = status.result?.isValid;
    const now = Date.now();

    if (isPoseValid && !isPoseComplete && !isRoutineFinished) {
      if (!hasStartedHoldingRef.current) {
        speak("¡Bien! Mantén la posición.");
        hasStartedHoldingRef.current = true;
      }

      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              timerRef.current = null;
              setIsPoseComplete(true);
              speak("¡Logrado!", true);
              return 0;
            }
            const nextTime = prev - 1;
            if (nextTime <= 5) speak(nextTime.toString(), true);
            return nextTime;
          });
        }, 1000);
      }
    } else {
      // SI HAY ERROR O CAMBIO: Detener el conteo inmediatamente
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (!isPoseValid) {
        hasStartedHoldingRef.current = false;
        if (!isPoseComplete && isCameraReady && !isSpeakingRef.current) {
          if (status.result?.messages && status.result.messages.length > 0 && (now - lastFeedbackTime.current > 3500)) {
            speak(status.result.messages[0]); 
            lastFeedbackTime.current = now;
          }
        }
      }
    }
    
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status.result, isPoseComplete, isRoutineFinished, isCameraReady, speak, timeLeft]);

  useEffect(() => {
    let running = true;
    let landmarker: PoseLandmarker;
    let stream: MediaStream;

    async function setup() {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { 
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", 
          delegate: "GPU" 
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsCameraReady(true);
            requestAnimationFrame(loop);
          }).catch(console.warn);
        };
      }
    }

    function loop() {
      if (!running || !videoRef.current || !landmarker || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d")!;
      
      if (videoRef.current.readyState >= 3) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        
        ctx.save();
        ctx.translate(canvasRef.current.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        ctx.restore();

        const results = landmarker.detectForVideo(videoRef.current, performance.now());
        if (results.landmarks?.length > 0) {
          const mirrored = results.landmarks[0].map(lm => ({ x: 1 - lm.x, y: lm.y, z: lm.z, visibility: lm.visibility }));
          const validation = validatePose(mirrored, activePose);
          const color = isPoseComplete ? "#00d26e" : (validation.isValid ? "#00d26e" : "#dc3c3c");
          new DrawingUtils(ctx).drawConnectors(mirrored, PoseLandmarker.POSE_CONNECTIONS, { color, lineWidth: 4 });
          setStatus({ result: validation });
        }
      }
      if (running) requestAnimationFrame(loop);
    }

    setup();
    return () => { running = false; stream?.getTracks().forEach(t => t.stop()); landmarker?.close(); };
  }, [activePose, isPoseComplete]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#080808", display: "flex", flexDirection: "column", padding: "16px", boxSizing: "border-box" }}>
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <button onClick={onBack} style={{ background: "#1a1a1a", border: "none", borderRadius: 12, padding: "10px 20px", color: "#888", cursor: "pointer" }}>← SALIR</button>
        <div style={{ textAlign: "center" }}>
          <span style={{ color: "#555", fontSize: "12px", display: "block" }}>EJERCICIO {currentStep + 1} / {poses.length}</span>
          <strong style={{ color: "#00d26e", fontSize: "20px" }}>{activePose.name}</strong>
        </div>
        <div style={{ 
          background: "#000", border: "2px solid #00d26e", width: "55px", height: "55px", 
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", 
          color: "#00d26e", fontWeight: "bold", fontSize: "18px" 
        }}>
          {timeLeft}s
        </div>
      </div>

      <div style={{ position: "relative", flex: 1, borderRadius: 20, overflow: "hidden", background: "#000" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        
        {/* MENSAJE DE ÉXITO VISUAL */}
        {status.result?.isValid && isCameraReady && !isPoseComplete && (
          <div style={{ position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)", background: "rgba(0, 210, 110, 0.9)", padding: "10px 25px", borderRadius: "10px", color: "#000", fontWeight: "bold", zIndex: 10 }}>
            ¡Pose correcta! Mantén así
          </div>
        )}

        {/* MENSAJE DE ERROR VISUAL */}
        {status.result && !status.result.isValid && isCameraReady && !isPoseComplete && (
          <div style={{ position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)", background: "rgba(220, 60, 60, 0.9)", padding: "10px 25px", borderRadius: "10px", color: "#fff", fontWeight: "bold", zIndex: 10 }}>
            {status.result.messages?.[0] || "Ajusta tu posición"}
          </div>
        )}

        {isPoseComplete && !isRoutineFinished && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, backdropFilter: "blur(4px)" }}>
            <button onClick={handleNextStep} style={{ padding: "18px 45px", background: "#00d26e", border: "none", borderRadius: "30px", fontWeight: "bold", fontSize: "18px", cursor: "pointer" }}>SIGUIENTE POSE →</button>
          </div>
        )}

        {isRoutineFinished && (
          <div style={{ position: "absolute", inset: 0, background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", zIndex: 50 }}>
            <h1 style={{ color: "#00d26e", fontSize: "36px" }}>¡RUTINA COMPLETADA!</h1>
            <button onClick={onBack} style={{ marginTop: 25, padding: "12px 40px", borderRadius: 10, border: "1px solid #00d26e", color: "#00d26e", background: "transparent", cursor: "pointer", fontWeight: "bold" }}>VOLVER AL MENÚ</button>
          </div>
        )}
      </div>

      <div style={{ marginTop: "16px", padding: "15px", background: "#111", borderRadius: "15px", color: "#888", textAlign: "center", fontSize: "14px" }}>
        {activePose.description}
      </div>
    </div>
  );
}